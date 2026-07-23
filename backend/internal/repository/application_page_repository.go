package repository

import (
	"context"
	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

type ApplicationPageRepository struct {
	db *gorm.DB
}

func NewApplicationPageRepository(db *gorm.DB) *ApplicationPageRepository {
	return &ApplicationPageRepository{db: db}
}

func (r *ApplicationPageRepository) Create(ctx context.Context, page *model.ApplicationPage) error {
	return r.db.WithContext(ctx).Create(page).Error
}

func (r *ApplicationPageRepository) GetByCode(ctx context.Context, orgID int, code string) (*model.ApplicationPage, error) {
	var page model.ApplicationPage
	err := r.db.WithContext(ctx).Where("org_id = ? AND code = ?", orgID, code).First(&page).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &page, err
}
