package service

import (
	"context"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

// DepartmentService handles department operations
type DepartmentService struct {
	deptRepo *repository.DepartmentRepository
	bondRepo *repository.OrgUserBondRepository
}

// NewDepartmentService creates a new department service
func NewDepartmentService(deptRepo *repository.DepartmentRepository, bondRepo *repository.OrgUserBondRepository) *DepartmentService {
	return &DepartmentService{
		deptRepo: deptRepo,
		bondRepo: bondRepo,
	}
}

// CreateDept creates a new department
func (s *DepartmentService) CreateDept(ctx context.Context, dept *model.Department) (*model.Department, error) {
	err := s.deptRepo.Create(ctx, dept)
	if err != nil {
		return nil, err
	}
	return dept, nil
}

// GetDeptByID retrieves a department by ID
func (s *DepartmentService) GetDeptByID(ctx context.Context, id int) (*model.Department, error) {
	return s.deptRepo.GetByID(ctx, id)
}

// GetDeptsByOrgID retrieves all departments for an organization
func (s *DepartmentService) GetDeptsByOrgID(ctx context.Context, orgID int) ([]*model.Department, error) {
	return s.deptRepo.GetByOrgID(ctx, orgID)
}

// UpdateDept updates a department
func (s *DepartmentService) UpdateDept(ctx context.Context, dept *model.Department) error {
	return s.deptRepo.Update(ctx, dept)
}

// DeleteDept deletes a department
func (s *DepartmentService) DeleteDept(ctx context.Context, id int) error {
	return s.deptRepo.Delete(ctx, id)
}

// SetManager sets a department manager
func (s *DepartmentService) SetManager(ctx context.Context, deptID, managerUserID int) error {
	return s.deptRepo.SetManager(ctx, deptID, managerUserID)
}
