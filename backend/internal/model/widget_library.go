package model

import "time"

type WidgetLibrary struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Code      string    `gorm:"not null;uniqueIndex" json:"code"`
	Type      string    `gorm:"not null" json:"type"` // input, display, chart, etc.
	Config    JSONB     `json:"config"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (WidgetLibrary) TableName() string {
	return "widget_library"
}
