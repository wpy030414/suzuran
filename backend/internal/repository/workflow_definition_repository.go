package repository

import (
	"context"
	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

type WorkflowDefinitionRepository struct {
	db *gorm.DB
}

func NewWorkflowDefinitionRepository(db *gorm.DB) *WorkflowDefinitionRepository {
	return &WorkflowDefinitionRepository{db: db}
}

func (r *WorkflowDefinitionRepository) Create(ctx context.Context, wf *model.WorkflowDefinition) error {
	return r.db.WithContext(ctx).Create(wf).Error
}

func (r *WorkflowDefinitionRepository) GetByID(ctx context.Context, id int) (*model.WorkflowDefinition, error) {
	var wf model.WorkflowDefinition
	err := r.db.WithContext(ctx).First(&wf, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &wf, err
}

func (r *WorkflowDefinitionRepository) GetByCode(ctx context.Context, orgID int, code string) (*model.WorkflowDefinition, error) {
	var wf model.WorkflowDefinition
	err := r.db.WithContext(ctx).Where("org_id = ? AND code = ?", orgID, code).First(&wf).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &wf, err
}
