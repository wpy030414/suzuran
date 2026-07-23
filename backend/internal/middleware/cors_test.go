package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/xrl/suzuran-cloud/internal/middleware"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestCORSSetsAllowOriginHeader(t *testing.T) {
	r := gin.New()
	r.Use(middleware.CORS())
	r.GET("/ping", func(c *gin.Context) {
		c.Status(200)
	})

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, "*", w.Header().Get("Access-Control-Allow-Origin"))
}

func TestCORSSetsAllowMethodsHeader(t *testing.T) {
	r := gin.New()
	r.Use(middleware.CORS())
	r.GET("/ping", func(c *gin.Context) {
		c.Status(200)
	})

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, "GET, POST, PUT, DELETE, OPTIONS", w.Header().Get("Access-Control-Allow-Methods"))
}

func TestCORSSetsAllowHeadersHeader(t *testing.T) {
	r := gin.New()
	r.Use(middleware.CORS())
	r.GET("/ping", func(c *gin.Context) {
		c.Status(200)
	})

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, "Content-Type, Authorization", w.Header().Get("Access-Control-Allow-Headers"))
}

func TestCORSOptionsReturns204(t *testing.T) {
	r := gin.New()
	r.Use(middleware.CORS())
	r.OPTIONS("/ping", func(c *gin.Context) {
		c.Status(200) // should not reach here
	})

	req := httptest.NewRequest(http.MethodOptions, "/ping", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 204, w.Code)
}

func TestCORSNonOptionsPassesThrough(t *testing.T) {
	nextCalled := false
	r := gin.New()
	r.Use(middleware.CORS())
	r.GET("/test", func(c *gin.Context) {
		nextCalled = true
		c.Status(200)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.True(t, nextCalled, "next handler should be called for non-OPTIONS request")
	assert.Equal(t, 200, w.Code)
}
