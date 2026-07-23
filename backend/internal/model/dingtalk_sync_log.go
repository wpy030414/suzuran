package model

import "time"

type DingTalkSyncLog struct {
	ID          int        `gorm:"primaryKey" json:"id"`
	OrgID       int        `gorm:"not null;index" json:"orgId"`
	SyncType    string     `json:"syncType"` // department, user
	Status      string     `gorm:"default:pending" json:"status"` // pending, success, failed
	Message     string     `json:"message"`
	StartedAt   time.Time  `json:"startedAt"`
	CompletedAt *time.Time `json:"completedAt"`
}

func (DingTalkSyncLog) TableName() string {
	return "dingtalk_sync_logs"
}
