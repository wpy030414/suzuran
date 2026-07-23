package middleware

import (
	"bytes"
	"io"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xrl/suzuran-cloud/internal/service"
)

// AuditMiddleware automatically logs user operations
type AuditMiddleware struct {
	auditService *service.AuditService
}

// NewAuditMiddleware creates a new audit middleware
func NewAuditMiddleware(auditService *service.AuditService) *AuditMiddleware {
	return &AuditMiddleware{auditService: auditService}
}

// RecordOperations records all HTTP operations
func (m *AuditMiddleware) RecordOperations() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		// Read request body (for logging)
		var requestBody map[string]any
		if c.Request.Body != nil {
			bodyBytes, _ := io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			// Parse JSON if possible
			// In production, use proper JSON parsing with error handling
		}

		// Process request
		c.Next()

		// Log after request completes
		duration := time.Since(startTime)

		// Only log authenticated requests
		userID, exists := c.Get("user_id")
		if !exists {
			return
		}

		orgID, _ := c.Get("org_id")

		// Determine resource type from URL
		resourceType := m.extractResourceType(c.Request.URL.Path)
		action := m.extractAction(c.Request.Method)

		// Async log to avoid blocking request
		go func() {
			m.auditService.LogOperation(
				c.Request.Context(),
				m.toInt(orgID),
				m.toInt(userID),
				action,
				resourceType,
				0, // resource_id would need extraction from URL params
				requestBody,
				c.Writer.Status(),
			)
		}()

		_ = duration
	}
}

func (m *AuditMiddleware) extractResourceType(path string) string {
	parts := strings.Split(path, "/")
	if len(parts) >= 3 {
		return parts[2] // e.g., "orgs", "forms", etc.
	}
	return "unknown"
}

func (m *AuditMiddleware) extractAction(method string) string {
	switch method {
	case "GET":
		return "read"
	case "POST":
		return "create"
	case "PUT":
		return "update"
	case "DELETE":
		return "delete"
	default:
		return "unknown"
	}
}

func (m *AuditMiddleware) toInt(val any) int {
	switch v := val.(type) {
	case int:
		return v
	case float64:
		return int(v)
	default:
		return 0
	}
}
