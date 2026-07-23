package model

import "time"

type WorkflowApproval struct {
	ID          int        `gorm:"primaryKey" json:"id"`
	OrgID       int        `gorm:"not null;index" json:"orgId"`
	InstanceID  int        `gorm:"not null;index" json:"instanceId"`
	NodeKey     string     `json:"nodeKey"`
	ApproverID  int        `json:"approverId"`
	Status      string     `gorm:"default:pending" json:"status"` // pending, approved, rejected
	Action      string     `json:"action"`
	Comment     string     `json:"comment"`
	ProcessedAt *time.Time `json:"processedAt"`
	CreatedAt   time.Time  `json:"createdAt"`
}

func (WorkflowApproval) TableName() string {
	return "workflow_approvals"
}
