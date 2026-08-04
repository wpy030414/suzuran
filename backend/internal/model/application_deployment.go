package model

import "time"

// ApplicationDeployment records a single deploy/build attempt of an application.
type ApplicationDeployment struct {
	ID            string     `gorm:"primaryKey" json:"id"`
	ApplicationID string     `gorm:"index;not null" json:"applicationId"`
	Version       string     `json:"version"`
	ImageTag      string     `json:"imageTag"`
	Status        string     `gorm:"default:building" json:"status"` // building, deploying, running, failed
	ContainerID   string     `json:"containerId,omitempty"`
	Logs          string     `gorm:"type:text" json:"-"`
	CreatedAt     time.Time  `json:"createdAt"`
	CompletedAt   *time.Time `json:"completedAt,omitempty"`
}

// TableName overrides the table name.
func (ApplicationDeployment) TableName() string {
	return "application_deployments"
}
