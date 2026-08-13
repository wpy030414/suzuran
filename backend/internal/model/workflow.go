package model

import "time"

// WorkflowDefinition is the immutable blueprint of a workflow (steps, variables).
// Owned by an org; all queries carry org_id for tenant isolation.
type WorkflowDefinition struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	OrgID       int       `gorm:"not null;index" json:"orgId"`
	Name        string    `gorm:"not null" json:"name"`
	Description string    `json:"description,omitempty"`
	Definition  JSONB     `gorm:"type:jsonb" json:"definition"`
	Version     int       `gorm:"not null;default:1" json:"version"`
	Status      string    `gorm:"not null;default:active;index" json:"status"` // active / archived
	CreatedBy   int       `json:"createdBy"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func (WorkflowDefinition) TableName() string {
	return "workflow_definitions"
}

// WorkflowInstance is a single running (or finished) execution of a definition.
type WorkflowInstance struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	OrgID       int       `gorm:"not null;index" json:"orgId"`
	DefinitionID int      `gorm:"not null;index" json:"definitionId"`
	Status      string    `gorm:"not null;default:running;index" json:"status"` // running/approved/rejected/cancelled
	CurrentStep string    `json:"currentStep"`
	Variables   JSONB     `gorm:"type:jsonb" json:"variables"`
	CreatedBy   int       `json:"createdBy"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
}

func (WorkflowInstance) TableName() string {
	return "workflow_instances"
}

// WorkflowTask is a human action required at an approval step.
type WorkflowTask struct {
	ID         int        `gorm:"primaryKey" json:"id"`
	OrgID      int        `gorm:"not null;index" json:"orgId"`
	InstanceID int        `gorm:"not null;index" json:"instanceId"`
	StepName   string     `gorm:"not null" json:"stepName"`
	AssigneeID int        `gorm:"not null;index" json:"assigneeId"`
	Status     string     `gorm:"not null;default:pending;index" json:"status"` // pending/approved/rejected
	Comment    string     `json:"comment,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	ActedAt    *time.Time `json:"actedAt,omitempty"`
}

func (WorkflowTask) TableName() string {
	return "workflow_tasks"
}
