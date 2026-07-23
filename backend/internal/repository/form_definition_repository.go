package repository

import (
	"context"
	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

type FormDefinitionRepository struct {
	db *gorm.DB
}

func NewFormDefinitionRepository(db *gorm.DB) *FormDefinitionRepository {
	return &FormDefinitionRepository{db: db}
}

func (r *FormDefinitionRepository) Create(ctx context.Context, form *model.FormDefinition) error {
	return r.db.WithContext(ctx).Create(form).Error
}

func (r *FormDefinitionRepository) GetByID(ctx context.Context, id int) (*model.FormDefinition, error) {
	var form model.FormDefinition
	err := r.db.WithContext(ctx).First(&form, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &form, err
}

func (r *FormDefinitionRepository) GetByCode(ctx context.Context, orgID int, code string) (*model.FormDefinition, error) {
	var form model.FormDefinition
	err := r.db.WithContext(ctx).Where("org_id = ? AND code = ?", orgID, code).First(&form).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &form, err
}

func (r *FormDefinitionRepository) ListByOrg(ctx context.Context, orgID int) ([]*model.FormDefinition, error) {
	var forms []*model.FormDefinition
	err := r.db.WithContext(ctx).Where("org_id = ?", orgID).Order("id ASC").Find(&forms).Error
	return forms, err
}

func (r *FormDefinitionRepository) Update(ctx context.Context, form *model.FormDefinition) error {
	return r.db.WithContext(ctx).Save(form).Error
}

func (r *FormDefinitionRepository) Delete(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&model.FormDefinition{}, id).Error
}

func (r *FormDefinitionRepository) Publish(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Model(&model.FormDefinition{}).Where("id = ?", id).Update("status", "published").Error
}
