package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/xrl/suzuran-cloud/internal/middleware"
	"github.com/xrl/suzuran-cloud/internal/pkg/jwt"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// TestAuthMissingHeader verifies that a missing Authorization header is rejected.
func TestAuthMissingHeader(t *testing.T) {
	r := gin.New()
	r.Use(middleware.Auth())
	r.GET("/protected", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "missing authorization header")
}

// TestAuthInvalidTokenFormat verifies that a non-Bearer token is rejected.
func TestAuthInvalidTokenFormat(t *testing.T) {
	r := gin.New()
	r.Use(middleware.Auth())
	r.GET("/protected", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Token some-token")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "invalid token format")
}

// TestAuthValidJWT verifies that a real signed JWT (RS256) is accepted and the
// user context (user_id, org_id, role, scopes) is populated from the claims.
func TestAuthValidJWT(t *testing.T) {
	r := gin.New()
	r.Use(middleware.Auth())
	r.GET("/protected", func(c *gin.Context) {
		assert.Equal(t, 42, c.GetInt("user_id"))
		assert.Equal(t, 7, c.GetInt("org_id"))
		assert.Equal(t, "provider", c.GetString("role"))
		c.Status(200)
	})

	token, err := jwt.GenerateToken(42, 7, "provider", []string{"org.read"}, "https://suzuran.test", 900)
	assert.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

// TestAuthGarbageToken verifies that an unparseable token is rejected.
func TestAuthGarbageToken(t *testing.T) {
	r := gin.New()
	r.Use(middleware.Auth())
	r.GET("/protected", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer this-is-not-a-valid-token")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "invalid or expired token")
}
