package provider

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/xrl/suzuran-cloud/internal/service"
)

// AuditHandler exposes audit log queries for the provider portal.
type AuditHandler struct {
	auditService *service.AuditService
}

func NewAuditHandler(auditService *service.AuditService) *AuditHandler {
	return &AuditHandler{auditService: auditService}
}

// ListLogs returns recent audit logs, optionally filtered by org_id and action.
//   GET /api/provider/audit/logs?orgId=&action=mcp_tool_call&limit=100
func (h *AuditHandler) ListLogs(c *gin.Context) {
	orgID, _ := strconv.Atoi(c.Query("orgId"))
	action := c.Query("action")
	limit, _ := strconv.Atoi(c.Query("limit"))

	logs, err := h.auditService.ListAuditLogs(c.Request.Context(), orgID, action, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"logs": logs})
}
