package repository

import (
	"context"
	"time"

	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

type WorkflowApprovalRepository struct {
	db *gorm.DB
}

func NewWorkflowApprovalRepository(db *gorm.DB) *WorkflowApprovalRepository {
	return &WorkflowApprovalRepository{db: db}
}

func (r *WorkflowApprovalRepository) Create(ctx context.Context, approval *model.WorkflowApproval) error {
	return r.db.WithContext(ctx).Create(approval).Error
}

func (r *WorkflowApprovalRepository) GetPendingByUserAndInstance(ctx context.Context, instanceID, approverID int) (*model.WorkflowApproval, error) {
	var approval model.WorkflowApproval
	err := r.db.WithContext(ctx).Where("instance_id = ? AND approver_id = ? AND status = ?", instanceID, approverID, "pending").First(&approval).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &approval, err
}

func (r *WorkflowApprovalRepository) UpdateApproval(ctx context.Context, id int, status, action, comment string) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&model.WorkflowApproval{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":       status,
		"action":       action,
		"comment":      comment,
		"processed_at": &now,
	}).Error
}
