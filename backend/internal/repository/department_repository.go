package repository

import (
	"context"
	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

type DepartmentRepository struct {
	db *gorm.DB
}

func NewDepartmentRepository(db *gorm.DB) *DepartmentRepository {
	return &DepartmentRepository{db: db}
}

func (r *DepartmentRepository) Create(ctx context.Context, dept *model.Department) error {
	return r.db.WithContext(ctx).Create(dept).Error
}

func (r *DepartmentRepository) GetByID(ctx context.Context, id int) (*model.Department, error) {
	var dept model.Department
	err := r.db.WithContext(ctx).First(&dept, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &dept, err
}

func (r *DepartmentRepository) GetByOrgID(ctx context.Context, orgID int) ([]*model.Department, error) {
	var depts []*model.Department
	err := r.db.WithContext(ctx).Where("org_id = ?", orgID).Order("level ASC, id ASC").Find(&depts).Error
	return depts, err
}

func (r *DepartmentRepository) Update(ctx context.Context, dept *model.Department) error {
	return r.db.WithContext(ctx).Save(dept).Error
}

func (r *DepartmentRepository) Delete(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&model.Department{}, id).Error
}

func (r *DepartmentRepository) SetManager(ctx context.Context, deptID, managerUserID int) error {
	// managerUserID == 0 表示清除负责人 → 写 NULL
	val := interface{}(managerUserID)
	if managerUserID == 0 {
		val = nil
	}
	return r.db.WithContext(ctx).Model(&model.Department{}).Where("id = ?", deptID).Update("manager_user_id", val).Error
}
