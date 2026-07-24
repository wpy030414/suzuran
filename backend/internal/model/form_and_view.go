package model

import "time"

// Form represents a form within an application
type Form struct {
	ID            int       `gorm:"primaryKey" json:"id"`
	ApplicationID int       `gorm:"not null;index:idx_forms_app" json:"applicationId"`
	Name          string    `gorm:"not null" json:"name"`
	Code          string    `gorm:"not null" json:"code"` // Unique within application
	Description   string    `json:"description"`
	Schema        JSONB     `gorm:"type:jsonb" json:"schema"` // Form field definitions
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func (Form) TableName() string {
	return "forms"
}

// View represents a view/report within an application
type View struct {
	ID            int       `gorm:"primaryKey" json:"id"`
	ApplicationID int       `gorm:"not null;index:idx_views_app" json:"applicationId"`
	Name          string    `gorm:"not null" json:"name"`
	Code          string    `gorm:"not null" json:"code"` // Unique within application
	Type          string    `gorm:"not null" json:"type"` // table, chart, kanban, etc.
	Description   string    `json:"description"`
	Config        JSONB     `gorm:"type:jsonb" json:"config"` // View configuration
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func (View) TableName() string {
	return "views"
}
