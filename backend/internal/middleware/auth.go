package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/xrl/suzuran-cloud/internal/pkg/jwt"
)

// Auth validates the JWT token and sets user context
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token format"})
			c.Abort()
			return
		}

		// Verify JWT token
		claims, err := jwt.VerifyToken(tokenString)
		if err != nil {
			// Fallback for development tokens (format: jwt_token_for_user_X_org_Y)
			userID, orgID := parseDevToken(tokenString)
			if userID > 0 && orgID > 0 {
				c.Set("user_id", userID)
				c.Set("org_id", orgID)
				c.Set("role", "user")
				c.Next()
				return
			}

			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("org_id", claims.OrgID)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// parseDevToken parses a development token in the format jwt_token_for_user_X_org_Y
func parseDevToken(token string) (userID, orgID int) {
	var u, o int
	n, err := fmt.Sscanf(token, "jwt_token_for_user_%d_org_%d", &u, &o)
	if err != nil || n != 2 {
		return 0, 0
	}
	return u, o
}
