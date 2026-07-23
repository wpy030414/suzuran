package repository

import (
	"context"
	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

type OrgRepository struct {
	db *gorm.DB
}

func NewOrgRepository(db *gorm.DB) *OrgRepository {
	return &OrgRepository{db: db}
}

func (r *OrgRepository) Create(ctx context.Context, org *model.Org) error {
	return r.db.WithContext(ctx).Create(org).Error
}

func (r *OrgRepository) GetByID(ctx context.Context, id int) (*model.Org, error) {
	var org model.Org
	err := r.db.WithContext(ctx).First(&org, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &org, err
}

func (r *OrgRepository) List(ctx context.Context) ([]*model.Org, error) {
	var orgs []*model.Org
	err := r.db.WithContext(ctx).Order("id ASC").Find(&orgs).Error
	return orgs, err
}

func (r *OrgRepository) Update(ctx context.Context, org *model.Org) error {
	return r.db.WithContext(ctx).Save(org).Error
}

func (r *OrgRepository) Delete(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&model.Org{}, id).Error
}
