package model

import "time"

type FormDistribution struct {
	ID            int       `gorm:"primaryKey" json:"id"`
	OrgID         int       `gorm:"not null;index" json:"orgId"`
	FormCode      string    `gorm:"not null;index" json:"formCode"`
	AppCode       string    `gorm:"not null" json:"appCode"`
	DistributedAt time.Time `json:"distributedAt"`
}

func (FormDistribution) TableName() string {
	return "form_distributions"
}
