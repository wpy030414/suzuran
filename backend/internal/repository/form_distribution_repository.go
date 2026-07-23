package repository

import (
	"context"
	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

type FormDistributionRepository struct {
	db *gorm.DB
}

func NewFormDistributionRepository(db *gorm.DB) *FormDistributionRepository {
	return &FormDistributionRepository{db: db}
}

func (r *FormDistributionRepository) Create(ctx context.Context, dist *model.FormDistribution) error {
	return r.db.WithContext(ctx).Create(dist).Error
}

func (r *FormDistributionRepository) GetByFormCode(ctx context.Context, orgID int, formCode string) (*model.FormDistribution, error) {
	var dist model.FormDistribution
	err := r.db.WithContext(ctx).Where("org_id = ? AND form_code = ?", orgID, formCode).First(&dist).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &dist, err
}

func (r *FormDistributionRepository) ListByOrg(ctx context.Context, orgID int) ([]*model.FormDistribution, error) {
	var dists []*model.FormDistribution
	err := r.db.WithContext(ctx).Where("org_id = ?", orgID).Find(&dists).Error
	return dists, err
}
