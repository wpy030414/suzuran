package repository

import (
	"context"
	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

type OrgUserBondRepository struct {
	db *gorm.DB
}

func NewOrgUserBondRepository(db *gorm.DB) *OrgUserBondRepository {
	return &OrgUserBondRepository{db: db}
}

func (r *OrgUserBondRepository) Create(ctx context.Context, bond *model.OrgUserBond) error {
	return r.db.WithContext(ctx).Create(bond).Error
}

func (r *OrgUserBondRepository) GetByOrgAndUser(ctx context.Context, orgID, userID int) (*model.OrgUserBond, error) {
	var bond model.OrgUserBond
	err := r.db.WithContext(ctx).Where("org_id = ? AND user_id = ?", orgID, userID).First(&bond).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &bond, err
}

func (r *OrgUserBondRepository) GetByUserID(ctx context.Context, userID int) ([]*model.OrgUserBond, error) {
	var bonds []*model.OrgUserBond
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Find(&bonds).Error
	return bonds, err
}

func (r *OrgUserBondRepository) GetByOrgID(ctx context.Context, orgID int) ([]*model.OrgUserBond, error) {
	var bonds []*model.OrgUserBond
	err := r.db.WithContext(ctx).Where("org_id = ?", orgID).Find(&bonds).Error
	return bonds, err
}

func (r *OrgUserBondRepository) Update(ctx context.Context, bond *model.OrgUserBond) error {
	return r.db.WithContext(ctx).Save(bond).Error
}

func (r *OrgUserBondRepository) Delete(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&model.OrgUserBond{}, id).Error
}

func (r *OrgUserBondRepository) GetByOrgIDWithUsers(ctx context.Context, orgID int) ([]*model.OrgUserBond, error) {
	var bonds []*model.OrgUserBond
	err := r.db.WithContext(ctx).Preload("User").Where("org_id = ?", orgID).Find(&bonds).Error
	return bonds, err
}

func (r *OrgUserBondRepository) DeleteByOrgAndUser(ctx context.Context, orgID, userID int) error {
	return r.db.WithContext(ctx).Where("org_id = ? AND user_id = ?", orgID, userID).Delete(&model.OrgUserBond{}).Error
}
