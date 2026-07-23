package model

import "time"

type WorkflowInstance struct {
	ID            int        `gorm:"primaryKey" json:"id"`
	OrgID         int        `gorm:"not null;index" json:"orgId"`
	WorkflowCode  string     `gorm:"not null;index" json:"workflowCode"`
	BusinessKey   string     `json:"businessKey"`
	CurrentNode   string     `json:"currentNode"`
	Status        string     `gorm:"default:running" json:"status"` // running, completed, cancelled
	StartedBy     int        `json:"startedBy"`
	StartedAt     time.Time  `json:"startedAt"`
	CompletedAt   *time.Time `json:"completedAt"`
}

func (WorkflowInstance) TableName() string {
	return "workflow_instances"
}
