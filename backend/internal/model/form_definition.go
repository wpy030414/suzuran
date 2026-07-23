package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

type JSONB map[string]interface{}

func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSONB)
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, j)
}

// GormDataType tells GORM to store JSONB as a text/json column.
// This makes the custom type work with both SQLite (tests) and PostgreSQL (prod).
func (JSONB) GormDataType() string {
	return "json"
}

// GormDBDataType sets the actual column DDL per dialect.
func (JSONB) GormDBDataType(db *gorm.DB, field *schema.Field) string {
	switch db.Dialector.Name() {
	case "postgres":
		return "jsonb"
	case "sqlite":
		return "text"
	default:
		return "text"
	}
}

type FormDefinition struct {
	ID           int       `gorm:"primaryKey" json:"id"`
	OrgID        int       `gorm:"not null;uniqueIndex:idx_org_code" json:"orgId"`
	Name         string    `gorm:"not null" json:"name"`
	Code         string    `gorm:"not null;uniqueIndex:idx_org_code" json:"code"`
	Schema       JSONB     `json:"schema"`
	Status       string    `gorm:"default:draft" json:"status"` // draft, published
	CreatedBy    int       `json:"createdBy"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

func (FormDefinition) TableName() string {
	return "form_definitions"
}
