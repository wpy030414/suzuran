package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/xrl/suzuran-cloud/internal/middleware"
)

func TestTenantContextPassesWhenOrgIDExists(t *testing.T) {
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("org_id", 42)
		c.Next()
	})
	r.Use(middleware.TenantContext())
	r.GET("/test", func(c *gin.Context) {
		orgID, _ := c.Get("org_id")
		c.JSON(200, gin.H{"org_id": orgID})
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
	assert.Contains(t, w.Body.String(), "42")
}

func TestTenantContextBlocksWhenOrgIDMissing(t *testing.T) {
	r := gin.New()
	r.Use(middleware.TenantContext())
	r.GET("/test", func(c *gin.Context) {
		c.Status(200)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 403, w.Code)
	assert.Contains(t, w.Body.String(), "missing organization context")
}