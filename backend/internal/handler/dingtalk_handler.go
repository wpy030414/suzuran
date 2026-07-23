package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type DingTalkHandler struct{}

func NewDingTalkHandler() *DingTalkHandler {
	return &DingTalkHandler{}
}

func (h *DingTalkHandler) OAuthCallback(c *gin.Context) {
	code := c.Query("code")
	c.JSON(http.StatusOK, gin.H{"message": "OAuth callback received", "code": code})
}

func (h *DingTalkHandler) SyncOrg(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "sync started"})
}

func (h *DingTalkHandler) GetSyncStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "idle"})
}
