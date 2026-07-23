package middleware

import (
	"github.com/gin-gonic/gin"
)

func TenantContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, exists := c.Get("org_id")
		if !exists {
			c.JSON(403, gin.H{"error": "missing organization context"})
			c.Abort()
			return
		}
		c.Set("org_id", orgID)
		c.Next()
	}
}
