package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/xrl/suzuran-cloud/internal/middleware"
	"github.com/xrl/suzuran-cloud/internal/handler/provider"
	"github.com/xrl/suzuran-cloud/internal/handler/tenant"
	"github.com/xrl/suzuran-cloud/internal/handler/auth"
	"github.com/xrl/suzuran-cloud/internal/handler"
	"github.com/xrl/suzuran-cloud/internal/repository"
	"github.com/xrl/suzuran-cloud/internal/service"
	dingtalkpkg "github.com/xrl/suzuran-cloud/internal/pkg/dingtalk"
	"github.com/xrl/suzuran-cloud/internal/storage"
	redisclient "github.com/xrl/suzuran-cloud/internal/pkg/redis"
)

func main() {
	// Initialize Redis client
	if err := redisclient.InitClient(); err != nil {
		log.Printf("Warning: Failed to connect to Redis: %v", err)
	}

	// Initialize database
	db, err := initDatabase()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Initialize repositories
	orgRepo := repository.NewOrgRepository(db)
	userRepo := repository.NewUserRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	deptRepo := repository.NewDepartmentRepository(db)
	formDefRepo := repository.NewFormDefinitionRepository(db)
	formSubRepo := repository.NewFormSubmissionRepository(db)
	distRepo := repository.NewFormDistributionRepository(db)
	wfDefRepo := repository.NewWorkflowDefinitionRepository(db)
	wfInstRepo := repository.NewWorkflowInstanceRepository(db)
	wfApproveRepo := repository.NewWorkflowApprovalRepository(db)
	reportRepo := repository.NewReportDefinitionRepository(db)

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

	// Initialize DingTalk client and bot
	_ = dingtalkpkg.NewBotClient(dingtalkpkg.NewBotConfig())

	// Initialize services
	authService := service.NewAuthService(userRepo, bondRepo, orgRepo)
	orgService := service.NewOrgService(orgRepo, deptRepo, bondRepo)
	deptService := service.NewDepartmentService(deptRepo, bondRepo)
	userService := service.NewUserService(userRepo, bondRepo)
	formService := service.NewFormService(formDefRepo, formSubRepo, distRepo)
	appService := service.NewApplicationService(
		repository.NewApplicationRepository(db),
		repository.NewFormRepository(db),
		repository.NewViewRepository(db),
	)
	_ = service.NewWorkflowEngine(wfDefRepo, wfInstRepo, wfApproveRepo)
	_ = service.NewReportService(db, reportRepo)
	_ = service.NewApplicationPageService(repository.NewApplicationPageRepository(db), repository.NewWidgetLibraryRepository(db))
	_ = service.NewAgentSkillService()
	_ = service.NewDingTalkSyncService(
		dingtalkpkg.NewClient(dingtalkpkg.NewConfig()),
		orgRepo, userRepo, deptRepo, bondRepo,
		repository.NewDingTalkSyncLogRepository(db),
	)

	// Initialize handlers with dependency injection
	authHandler := auth.NewHandler(authService)
	orgHandler := provider.NewOrgHandler(orgService)
	appHandler := provider.NewApplicationHandler(appService)
	orgMemberHandler := provider.NewOrgMemberHandler(deptService, userService)
	deptHandler := tenant.NewDepartmentHandler(deptService, userService)
	userHandler := tenant.NewUserHandler(userService)
	formHandler := tenant.NewFormHandler(formService)
	fileHandler := handler.NewFileHandler(minioClient)
	dingHandler := handler.NewDingTalkHandler()

	// Initialize audit middleware
	_ = middleware.NewAuditMiddleware(service.NewAuditService(db))

	r := gin.Default()

	// CORS middleware
	r.Use(middleware.CORS())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Auth routes (public)
	authGroup := r.Group("/api/auth")
	{
		authGroup.POST("/login", authHandler.Login)
		authGroup.POST("/select-org", authHandler.SelectOrg)
	}

	// DingTalk OAuth routes (public callback)
	dingtalkGroup := r.Group("/api/dingtalk")
	{
		dingtalkGroup.GET("/callback", dingHandler.OAuthCallback)
	}

	// Protected routes
	protected := r.Group("/api")
	protected.Use(middleware.Auth())
	protected.Use(middleware.TenantContext())
	auditMW := middleware.NewAuditMiddleware(service.NewAuditService(db)); protected.Use(auditMW.RecordOperations())
	{
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

			// Application management routes (new architecture)
			apps := providerGroup.Group("/applications")
			{
				apps.GET("", appHandler.List)
				apps.POST("", appHandler.Create)
				apps.GET("/:id", appHandler.GetByID)
				apps.POST("/:id/copy", appHandler.Copy)
				apps.POST("/:id/update", appHandler.UpdateVersion)
				apps.DELETE("/:id", appHandler.Delete)
				apps.POST("/:id/distribute", appHandler.Distribute)

				// Form management (nested under application)
				apps.GET("/:id/forms", appHandler.ListForms)
				apps.POST("/:id/forms", appHandler.CreateForm)
				apps.GET("/:id/forms/:formId", appHandler.GetForm)
				apps.PUT("/:id/forms/:formId", appHandler.UpdateForm)
				apps.DELETE("/:id/forms/:formId", appHandler.DeleteForm)
				// View management (nested under application)
				apps.GET("/:id/views", appHandler.ListViews)
				apps.POST("/:id/views", appHandler.CreateView)
				apps.DELETE("/:id/views/:viewId", appHandler.DeleteView)
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

			// DingTalk sync routes
			dingtalk := tenantGroup.Group("/dingtalk")
			{
				dingtalk.POST("/sync", dingHandler.SyncOrg)
				dingtalk.GET("/status", dingHandler.GetSyncStatus)
			}

			// File upload routes (tenant can upload files)
			files := tenantGroup.Group("/files")
			{
				files.POST("/upload", fileHandler.Upload)
				files.GET("/:key/download", fileHandler.Download)
				files.DELETE("/:key", fileHandler.Delete)
			}

			// Form submissions (tenant can view but not create forms)
			formSubs := tenantGroup.Group("/form-submissions")
			{
				formSubs.GET("/:code", formHandler.GetSubmissions)
			}
		}

		// End user routes - form submission
		userGroup := protected.Group("/user")
		{
			userForms := userGroup.Group("/forms")
			{
				userForms.POST("/:code/submit", formHandler.Submit)
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
