package repository

import (
	"context"
	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

type FormSubmissionRepository struct {
	db *gorm.DB
}

func NewFormSubmissionRepository(db *gorm.DB) *FormSubmissionRepository {
	return &FormSubmissionRepository{db: db}
}

func (r *FormSubmissionRepository) Create(ctx context.Context, sub *model.FormSubmission) error {
	return r.db.WithContext(ctx).Create(sub).Error
}

func (r *FormSubmissionRepository) GetByID(ctx context.Context, id int) (*model.FormSubmission, error) {
	var sub model.FormSubmission
	err := r.db.WithContext(ctx).First(&sub, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &sub, err
}

func (r *FormSubmissionRepository) ListByFormCode(ctx context.Context, orgID int, formCode string) ([]*model.FormSubmission, error) {
	var subs []*model.FormSubmission
	err := r.db.WithContext(ctx).Where("org_id = ? AND form_code = ?", orgID, formCode).Order("id DESC").Find(&subs).Error
	return subs, err
}
