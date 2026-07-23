package repository

import (
	"context"
	"time"

	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

type DingTalkSyncLogRepository struct {
	db *gorm.DB
}

func NewDingTalkSyncLogRepository(db *gorm.DB) *DingTalkSyncLogRepository {
	return &DingTalkSyncLogRepository{db: db}
}

func (r *DingTalkSyncLogRepository) Create(ctx context.Context, log *model.DingTalkSyncLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *DingTalkSyncLogRepository) UpdateStatus(ctx context.Context, id int, status, message string) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&model.DingTalkSyncLog{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":       status,
		"message":      message,
		"completed_at": &now,
	}).Error
}
