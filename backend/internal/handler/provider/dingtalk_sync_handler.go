package provider

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/xrl/suzuran-cloud/internal/service"
)

// DingTalkSyncHandler exposes DingTalk organization sync for the provider portal.
type DingTalkSyncHandler struct {
	syncService *service.DingTalkSyncService
}

func NewDingTalkSyncHandler(syncService *service.DingTalkSyncService) *DingTalkSyncHandler {
	return &DingTalkSyncHandler{syncService: syncService}
}

// Sync triggers a full DingTalk organization sync for the given org.
// POST /api/provider/orgs/:orgId/dingtalk/sync
func (h *DingTalkSyncHandler) Sync(c *gin.Context) {
	if h.syncService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "dingtalk sync is not configured"})
		return
	}
	orgID, err := strconv.Atoi(c.Param("orgId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid orgId"})
		return
	}

	stats, err := h.syncService.SyncOrganization(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"orgId":       orgID,
		"departments": stats.Departments,
		"users":       stats.Users,
		"bonds":       stats.Bonds,
	})
}
