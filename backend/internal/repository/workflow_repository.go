package repository

import (
	"context"

	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

// --- WorkflowDefinition ---

type WorkflowDefinitionRepository struct{ db *gorm.DB }

func NewWorkflowDefinitionRepository(db *gorm.DB) *WorkflowDefinitionRepository {
	return &WorkflowDefinitionRepository{db: db}
}

func (r *WorkflowDefinitionRepository) Create(ctx context.Context, d *model.WorkflowDefinition) error {
	return r.db.WithContext(ctx).Create(d).Error
}

func (r *WorkflowDefinitionRepository) GetByID(ctx context.Context, orgID, id int) (*model.WorkflowDefinition, error) {
	var d model.WorkflowDefinition
	err := r.db.WithContext(ctx).Where("org_id = ? AND id = ?", orgID, id).First(&d).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &d, err
}

func (r *WorkflowDefinitionRepository) ListByOrgID(ctx context.Context, orgID int) ([]*model.WorkflowDefinition, error) {
	var list []*model.WorkflowDefinition
	err := r.db.WithContext(ctx).Where("org_id = ?", orgID).Order("id DESC").Find(&list).Error
	return list, err
}

func (r *WorkflowDefinitionRepository) Update(ctx context.Context, d *model.WorkflowDefinition) error {
	return r.db.WithContext(ctx).Save(d).Error
}

func (r *WorkflowDefinitionRepository) SetStatus(ctx context.Context, orgID, id int, status string) error {
	return r.db.WithContext(ctx).Model(&model.WorkflowDefinition{}).
		Where("org_id = ? AND id = ?", orgID, id).Update("status", status).Error
}

// --- WorkflowInstance ---

type WorkflowInstanceRepository struct{ db *gorm.DB }

func NewWorkflowInstanceRepository(db *gorm.DB) *WorkflowInstanceRepository {
	return &WorkflowInstanceRepository{db: db}
}

func (r *WorkflowInstanceRepository) Create(ctx context.Context, i *model.WorkflowInstance) error {
	return r.db.WithContext(ctx).Create(i).Error
}

func (r *WorkflowInstanceRepository) GetByID(ctx context.Context, orgID, id int) (*model.WorkflowInstance, error) {
	var i model.WorkflowInstance
	err := r.db.WithContext(ctx).Where("org_id = ? AND id = ?", orgID, id).First(&i).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &i, err
}

func (r *WorkflowInstanceRepository) ListByOrgID(ctx context.Context, orgID int, status string) ([]*model.WorkflowInstance, error) {
	q := r.db.WithContext(ctx).Where("org_id = ?", orgID)
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var list []*model.WorkflowInstance
	err := q.Order("id DESC").Find(&list).Error
	return list, err
}

func (r *WorkflowInstanceRepository) Update(ctx context.Context, i *model.WorkflowInstance) error {
	return r.db.WithContext(ctx).Save(i).Error
}

// --- WorkflowTask ---

type WorkflowTaskRepository struct{ db *gorm.DB }

func NewWorkflowTaskRepository(db *gorm.DB) *WorkflowTaskRepository {
	return &WorkflowTaskRepository{db: db}
}

func (r *WorkflowTaskRepository) Create(ctx context.Context, t *model.WorkflowTask) error {
	return r.db.WithContext(ctx).Create(t).Error
}

func (r *WorkflowTaskRepository) GetByID(ctx context.Context, orgID, id int) (*model.WorkflowTask, error) {
	var t model.WorkflowTask
	err := r.db.WithContext(ctx).Where("org_id = ? AND id = ?", orgID, id).First(&t).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &t, err
}

func (r *WorkflowTaskRepository) ListByAssignee(ctx context.Context, assigneeID int, status string) ([]*model.WorkflowTask, error) {
	q := r.db.WithContext(ctx).Where("assignee_id = ?", assigneeID)
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var list []*model.WorkflowTask
	err := q.Order("id DESC").Find(&list).Error
	return list, err
}

func (r *WorkflowTaskRepository) ListByInstance(ctx context.Context, orgID, instanceID int) ([]*model.WorkflowTask, error) {
	var list []*model.WorkflowTask
	err := r.db.WithContext(ctx).Where("org_id = ? AND instance_id = ?", orgID, instanceID).
		Order("id ASC").Find(&list).Error
	return list, err
}

func (r *WorkflowTaskRepository) Update(ctx context.Context, t *model.WorkflowTask) error {
	return r.db.WithContext(ctx).Save(t).Error
}
