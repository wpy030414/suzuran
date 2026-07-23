package model

import "time"

type WorkflowDefinition struct {
	ID           int       `gorm:"primaryKey" json:"id"`
	OrgID        int       `gorm:"not null;uniqueIndex:idx_org_code_wf" json:"orgId"`
	Name         string    `gorm:"not null" json:"name"`
	Code         string    `gorm:"not null;uniqueIndex:idx_org_code_wf" json:"code"`
	Definition   JSONB     `json:"definition"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

func (WorkflowDefinition) TableName() string {
	return "workflow_definitions"
}
