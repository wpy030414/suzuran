package model

import "time"

type ApplicationPage struct {
	ID           int       `gorm:"primaryKey" json:"id"`
	OrgID        int       `gorm:"not null;uniqueIndex:idx_org_code_page" json:"orgId"`
	Name         string    `gorm:"not null" json:"name"`
	Code         string    `gorm:"not null;uniqueIndex:idx_org_code_page" json:"code"`
	LayoutConfig JSONB     `json:"layoutConfig"`
	WidgetConfig JSONB     `json:"widgetConfig"`
	VueTemplate  string    `gorm:"type:text" json:"vueTemplate"`
	VueScript    string    `gorm:"type:text" json:"vueScript"`
	VueStyle     string    `gorm:"type:text" json:"vueStyle"`
	SkillConfig  JSONB     `json:"skillConfig"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

func (ApplicationPage) TableName() string {
	return "application_pages"
}
