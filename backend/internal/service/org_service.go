package service

import (
	"context"
	"errors"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

// OrgService handles organization operations
type OrgService struct {
	orgRepo  *repository.OrgRepository
	deptRepo *repository.DepartmentRepository
	bondRepo *repository.OrgUserBondRepository
}

// NewOrgService creates a new organization service
func NewOrgService(orgRepo *repository.OrgRepository, deptRepo *repository.DepartmentRepository, bondRepo *repository.OrgUserBondRepository) *OrgService {
	return &OrgService{
		orgRepo:  orgRepo,
		deptRepo: deptRepo,
		bondRepo: bondRepo,
	}
}

// CreateOrg creates a new organization
func (s *OrgService) CreateOrg(ctx context.Context, name, description string) (*model.Org, error) {
	org := &model.Org{
		Name:        name,
		Description: description,
	}
	err := s.orgRepo.Create(ctx, org)
	if err != nil {
		return nil, err
	}
	return org, nil
}

// GetOrgByID retrieves an organization by ID
func (s *OrgService) GetOrgByID(ctx context.Context, id int) (*model.Org, error) {
	return s.orgRepo.GetByID(ctx, id)
}

// ListOrgs lists all organizations
func (s *OrgService) ListOrgs(ctx context.Context) ([]*model.Org, error) {
	return s.orgRepo.List(ctx)
}

// UpdateOrg updates an organization
func (s *OrgService) UpdateOrg(ctx context.Context, id int, name, description string) error {
	org, err := s.orgRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if org == nil {
		return errors.New("organization not found")
	}
	org.Name = name
	org.Description = description
	return s.orgRepo.Update(ctx, org)
}

// DeleteOrg deletes an organization
func (s *OrgService) DeleteOrg(ctx context.Context, id int) error {
	return s.orgRepo.Delete(ctx, id)
}
