package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/xrl/suzuran-cloud/internal/handler"
	"github.com/xrl/suzuran-cloud/internal/handler/provider"
	"github.com/xrl/suzuran-cloud/internal/handler/tenant"
	"github.com/xrl/suzuran-cloud/internal/middleware"
	"github.com/xrl/suzuran-cloud/internal/oauth"
	"github.com/xrl/suzuran-cloud/internal/repository"
	"github.com/xrl/suzuran-cloud/internal/service"
	"github.com/xrl/suzuran-cloud/internal/storage"
)

func main() {
	// Initialize database
	db, err := initDatabase()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Initialize repositories (multi-tenant core only)
	orgRepo := repository.NewOrgRepository(db)
	userRepo := repository.NewUserRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	deptRepo := repository.NewDepartmentRepository(db)
	credRepo := repository.NewWebAuthnCredentialRepository(db)
	clientRepo := repository.NewOAuthClientRepository(db)
	tokenRepo := repository.NewOAuthTokenRepository(db)
	sessionRepo := repository.NewOAuthSessionRepository(db)

	// Initialize MinIO client
	minioClient, err := storage.NewMinIOClient(
		os.Getenv("MINIO_ENDPOINT"),
		os.Getenv("MINIO_ACCESS_KEY"),
		os.Getenv("MINIO_SECRET_KEY"),
		getEnvOrDefault("MINIO_BUCKET", "suzuran-files"),
	)
	if err != nil {
		log.Printf("Warning: Failed to initialize MinIO: %v", err)
	}

	// Load OAuth IdP config
	oauthCfg := oauth.LoadConfig()

	// Initialize services
	orgService := service.NewOrgService(orgRepo, deptRepo, bondRepo)
	deptService := service.NewDepartmentService(deptRepo, bondRepo)
	userService := service.NewUserService(userRepo, bondRepo)

	webAuthnSvc, err := oauth.NewWebAuthnService(oauthCfg, userRepo, credRepo, bondRepo, orgRepo)
	if err != nil {
		log.Fatalf("Failed to init WebAuthn service: %v", err)
	}
	dingTalkSvc := oauth.NewDingTalkService(oauthCfg, userRepo, bondRepo, orgRepo)
	oauthSvc := oauth.NewOAuthService(oauthCfg, tokenRepo, sessionRepo, clientRepo, userRepo, bondRepo, orgRepo)

	// Initialize handlers with dependency injection
	oauthHandler := oauth.NewHandler(webAuthnSvc, dingTalkSvc, oauthSvc)
	orgHandler := provider.NewOrgHandler(orgService)
	orgMemberHandler := provider.NewOrgMemberHandler(deptService, userService)
	deptHandler := tenant.NewDepartmentHandler(deptService, userService)
	userHandler := tenant.NewUserHandler(userService)
	fileHandler := handler.NewFileHandler(minioClient)
	systemHandler := handler.NewSystemHandler(db)
	logHandler := handler.NewLogHandler("logs/app.log", 1000)

	r := gin.Default()

	// Store server start time
	serverStartTime := time.Now().Format(time.RFC3339)

	// CORS middleware
	r.Use(middleware.CORS())

	// Logging middleware
	r.Use(func(c *gin.Context) {
		c.Set("serverStartTime", serverStartTime)
		startTime := time.Now()
		c.Next()

		entry := map[string]interface{}{
			"method":   c.Request.Method,
			"path":     c.Request.URL.Path,
			"status":   c.Writer.Status(),
			"duration": time.Since(startTime).String(),
			"ip":       c.ClientIP(),
		}

		logHandler.AddLog("info",
			fmt.Sprintf("%s %s %d %s", c.Request.Method, c.Request.URL.Path, c.Writer.Status(), time.Since(startTime)),
			entry)
	})

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// OAuth IdP routes (public — login/registration ceremonies + OAuth2 endpoints)
	oauthGroup := r.Group("/oauth")
	{
		// WebAuthn registration
		oauthGroup.POST("/webauthn/register/begin", oauthHandler.BeginRegistration)
		oauthGroup.POST("/webauthn/register/finish", oauthHandler.FinishRegistration)

		// WebAuthn login
		oauthGroup.POST("/webauthn/login/begin", oauthHandler.BeginLogin)
		oauthGroup.POST("/webauthn/login/finish", oauthHandler.FinishLogin)

		// DingTalk OAuth
		oauthGroup.GET("/dingtalk/authorize", oauthHandler.DingTalkAuthorize)
		oauthGroup.GET("/dingtalk/callback", oauthHandler.DingTalkCallback)

		// OAuth2 endpoints
		oauthGroup.GET("/authorize", oauthHandler.Authorize)
		oauthGroup.POST("/token", oauthHandler.Token)
		oauthGroup.POST("/revoke", oauthHandler.Revoke)
	}

	// OAuth2 discovery
	r.GET("/.well-known/openid-configuration", oauthHandler.Metadata)

	// Protected routes (require valid OAuth access token)
	protected := r.Group("/api")
	protected.Use(middleware.Auth())
	protected.Use(middleware.TenantContext())
	auditMW := middleware.NewAuditMiddleware(service.NewAuditService(db))
	protected.Use(auditMW.RecordOperations())
	{
		// System monitoring routes
		systemGroup := protected.Group("/system")
		{
			systemGroup.GET("/metrics", systemHandler.GetSystemMetrics)
			systemGroup.GET("/database/metrics", systemHandler.GetDatabaseMetrics)
			systemGroup.GET("/logs", logHandler.GetLogs)
		}

		// Provider portal routes
		providerGroup := protected.Group("/provider")
		{
			providerGroup.GET("/orgs", orgHandler.List)
			providerGroup.POST("/orgs", orgHandler.Create)
			providerGroup.PUT("/orgs/:orgId", orgHandler.Update)
			providerGroup.DELETE("/orgs/:orgId", orgHandler.Delete)

			// Organization department & member management
			orgDepts := providerGroup.Group("/orgs/:orgId/departments")
			{
				orgDepts.GET("", orgMemberHandler.ListDepts)
				orgDepts.GET("/tree", orgMemberHandler.DeptTree)
				orgDepts.POST("", orgMemberHandler.CreateDept)
				orgDepts.PUT("/:deptId", orgMemberHandler.UpdateDept)
				orgDepts.DELETE("/:deptId", orgMemberHandler.DeleteDept)
				orgDepts.POST("/:deptId/manager", orgMemberHandler.SetDeptManager)
			}
			orgUsers := providerGroup.Group("/orgs/:orgId/users")
			{
				orgUsers.GET("", orgMemberHandler.ListMembers)
				orgUsers.POST("", orgMemberHandler.CreateMember)
				orgUsers.PUT("/:userId", orgMemberHandler.UpdateMember)
				orgUsers.DELETE("/:userId", orgMemberHandler.RemoveMember)
			}
		}

		// Tenant admin routes
		tenantGroup := protected.Group("/tenant")
		{
			tenantGroup.GET("/users", userHandler.ListMembers)
			tenantGroup.POST("/users", userHandler.CreateMember)
			tenantGroup.PUT("/users/:userId", userHandler.UpdateMember)
			tenantGroup.DELETE("/users/:userId", userHandler.RemoveMember)

			// Department routes
			depts := tenantGroup.Group("/departments")
			{
				depts.GET("", deptHandler.ListDepts)
				depts.GET("/tree", deptHandler.DeptTree)
				depts.POST("", deptHandler.CreateDept)
				depts.PUT("/:deptId", deptHandler.UpdateDept)
				depts.DELETE("/:deptId", deptHandler.DeleteDept)
				depts.POST("/:deptId/manager", deptHandler.SetDeptManager)
			}

			// File upload routes
			files := tenantGroup.Group("/files")
			{
				files.POST("/upload", fileHandler.Upload)
				files.GET("/:key/download", fileHandler.Download)
				files.DELETE("/:key", fileHandler.Delete)
			}
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8888"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}

func initDatabase() (*gorm.DB, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=localhost user=admin password=changeme dbname=suzuran_cloud port=5432 sslmode=disable"
	}

	return gorm.Open(postgres.Open(dsn), &gorm.Config{})
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
