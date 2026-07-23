package middleware_test

import (
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "github.com/xrl/suzuran-cloud/internal/middleware"
)

// NOTE: The Auth middleware depends on redisclient (global redis.Client).
// Since redisclient.Get directly calls the global Client, it cannot be easily
// mocked without modifying the production code or using an interface.
// Therefore, we only test the parts that execute before the redis call:
//   - Missing Authorization header -> 401
//   - Invalid token format (no Bearer prefix) -> 401
// Full integration tests with a running Redis instance are needed for the
// token validation path.

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

// TestAuthValidFormatRequiresRedis verifies that a correctly formatted
// Bearer token passes the format check, but is skipped because the
// subsequent redisclient.Get call dereferences a nil global Client
// when no Redis instance is running.
func TestAuthValidFormatRequiresRedis(t *testing.T) {
    t.Skip("requires a running Redis instance; redis.Client is nil in unit tests")
}
