package repository

import (
	"context"
	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

type WorkflowInstanceRepository struct {
	db *gorm.DB
}

func NewWorkflowInstanceRepository(db *gorm.DB) *WorkflowInstanceRepository {
	return &WorkflowInstanceRepository{db: db}
}

func (r *WorkflowInstanceRepository) Create(ctx context.Context, inst *model.WorkflowInstance) error {
	return r.db.WithContext(ctx).Create(inst).Error
}

func (r *WorkflowInstanceRepository) GetByID(ctx context.Context, id int) (*model.WorkflowInstance, error) {
	var inst model.WorkflowInstance
	err := r.db.WithContext(ctx).First(&inst, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &inst, err
}

func (r *WorkflowInstanceRepository) UpdateStatus(ctx context.Context, id int, status string, currentNode string) error {
	updates := map[string]interface{}{"status": status}
	if currentNode != "" {
		updates["current_node"] = currentNode
	}
	return r.db.WithContext(ctx).Model(&model.WorkflowInstance{}).Where("id = ?", id).Updates(updates).Error
}
