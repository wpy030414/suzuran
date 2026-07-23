package middleware

import (
	"github.com/gin-gonic/gin"
)

func RequireOrgAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role != "org_admin" && role != "provider_admin" {
			c.JSON(403, gin.H{"error": "insufficient permissions"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func RequireDeptManager() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role != "dept_manager" && role != "org_admin" && role != "provider_admin" {
			c.JSON(403, gin.H{"error": "insufficient permissions"})
			c.Abort()
			return
		}
		c.Next()
	}
}
