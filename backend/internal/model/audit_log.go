package model

import (
	"time"
)

// AuditLog tracks user operations
type AuditLog struct {
	ID             int            `gorm:"primaryKey" json:"id"`
	OrgID          *int           `json:"orgId,omitempty"`
	UserID         *int           `json:"userId,omitempty"`
	Action         string         `gorm:"not null" json:"action"`
	ResourceType   string         `json:"resourceType,omitempty"`
	ResourceID     *int           `json:"resourceId,omitempty"`
	IPAddress      string         `json:"ipAddress,omitempty"`
	UserAgent      string         `json:"userAgent,omitempty"`
	RequestData    JSONB           `json:"requestData,omitempty"`
	ResponseStatus *int           `json:"responseStatus,omitempty"`
	CreatedAt      time.Time      `json:"createdAt"`
}

// TableName overrides the table name
func (AuditLog) TableName() string {
	return "audit_logs"
}
