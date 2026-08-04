package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/xrl/suzuran-cloud/internal/pkg/jwt"
)

// Auth validates the OAuth access token (RS256 JWT) and sets user context.
// OAuth-only platform — no password fallback, no dev token bypass.
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token format"})
			return
		}

		claims, err := jwt.VerifyToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("org_id", claims.OrgID)
		c.Set("role", claims.Role)
		c.Set("scopes", claims.Scopes)
		c.Next()
	}
}

// RequireScope returns a middleware that checks the token carries the given scope.
func RequireScope(scope string) gin.HandlerFunc {
	return func(c *gin.Context) {
		scopesVal, _ := c.Get("scopes")
		scopes, _ := scopesVal.([]string)
		for _, s := range scopes {
			if s == scope || s == "admin" {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient scope: " + scope})
	}
}
