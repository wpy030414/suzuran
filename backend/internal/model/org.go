package model

import "time"

type Org struct {
	ID              int       `gorm:"primaryKey" json:"id"`
	Name            string    `gorm:"not null;uniqueIndex" json:"name"`
	Description     string    `json:"description"`
	DingtalkCorpID  string    `gorm:"column:dingtalk_corp_id;index" json:"dingtalkCorpId,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

func (Org) TableName() string {
	return "orgs"
}
