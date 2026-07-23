package model

import "time"

type FormSubmission struct {
	ID         int       `gorm:"primaryKey" json:"id"`
	OrgID      int       `gorm:"not null;index" json:"orgId"`
	FormCode   string    `gorm:"not null;index" json:"formCode"`
	Data       JSONB     `json:"data"`
	CreatedBy  int       `json:"createdBy"`
	CreatedAt  time.Time `json:"createdAt"`
}

func (FormSubmission) TableName() string {
	return "form_submissions"
}
