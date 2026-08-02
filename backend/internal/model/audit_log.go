package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// JSONB represents a JSON object stored in PostgreSQL
type JSONB map[string]interface{}

// GormDataType returns the SQL data type for GORM AutoMigrate.
// PostgreSQL uses the gorm tag override (jsonb); SQLite falls back to text.
func (JSONB) GormDataType() string {
	return "text"
}

// Scan implements the sql.Scanner interface
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("failed to unmarshal JSONB value: %v", value)
	}
	return json.Unmarshal(bytes, j)
}

// Value implements the driver.Valuer interface
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

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
