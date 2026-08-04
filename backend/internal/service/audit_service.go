package service

import (
	"context"
	"time"

	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

// AuditService handles audit logging
type AuditService struct {
	db *gorm.DB
}

// NewAuditService creates a new audit service
func NewAuditService(db *gorm.DB) *AuditService {
	return &AuditService{db: db}
}

// LogOperation logs a user operation
func (s *AuditService) LogOperation(ctx context.Context, orgID, userID int, action string, resourceType string, resourceID int, requestData map[string]any, statusCode int) error {
	log := &model.AuditLog{
		OrgID:          &orgID,
		UserID:         &userID,
		Action:         action,
		ResourceType:   resourceType,
		ResourceID:     &resourceID,
		RequestData:    requestData,
		ResponseStatus: &statusCode,
		CreatedAt:      time.Now(),
	}

	return s.db.WithContext(ctx).Create(log).Error
}

// LogLogin logs a login attempt
func (s *AuditService) LogLogin(ctx context.Context, userID, orgID int, method string, ip string, success bool, errorMsg string) error {
	log := map[string]any{
		"user_id":       userID,
		"org_id":        orgID,
		"login_method":  method,
		"ip_address":    ip,
		"status":        map[bool]string{true: "success", false: "failed"}[success],
		"error_message": errorMsg,
		"created_at":    time.Now(),
	}

	return s.db.WithContext(ctx).Table("login_logs").Create(log).Error
}

// GetDataChanges retrieves data change logs for a record
func (s *AuditService) GetDataChanges(ctx context.Context, tableName string, recordID int) ([]map[string]any, error) {
	var changes []map[string]any
	err := s.db.WithContext(ctx).
		Table("data_change_logs").
		Where("table_name = ? AND record_id = ?", tableName, recordID).
		Order("created_at DESC").
		Find(&changes).Error
	return changes, err
}

// ListAuditLogs queries recent audit logs, optionally filtered by org and/or
// action (e.g. "mcp.tool_call" to surface MCP invocations). limit caps the
// result set (default 100, max 500).
func (s *AuditService) ListAuditLogs(ctx context.Context, orgID int, action string, limit int) ([]*model.AuditLog, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	q := s.db.WithContext(ctx).Model(&model.AuditLog{}).Order("created_at DESC").Limit(limit)
	if orgID > 0 {
		q = q.Where("org_id = ?", orgID)
	}
	if action != "" {
		q = q.Where("action = ?", action)
	}
	var logs []*model.AuditLog
	err := q.Find(&logs).Error
	return logs, err
}
