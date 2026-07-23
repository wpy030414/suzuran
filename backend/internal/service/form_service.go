package service

import (
	"context"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

// FormService handles form operations
type FormService struct {
	formDefRepo *repository.FormDefinitionRepository
	formSubRepo *repository.FormSubmissionRepository
	distRepo    *repository.FormDistributionRepository
}

// NewFormService creates a new form service
func NewFormService(formDefRepo *repository.FormDefinitionRepository, formSubRepo *repository.FormSubmissionRepository, distRepo *repository.FormDistributionRepository) *FormService {
	return &FormService{
		formDefRepo: formDefRepo,
		formSubRepo: formSubRepo,
		distRepo:    distRepo,
	}
}

// CreateForm creates a new form definition
func (s *FormService) CreateForm(ctx context.Context, form *model.FormDefinition) error {
	return s.formDefRepo.Create(ctx, form)
}

// GetFormByCode retrieves a form by its code
func (s *FormService) GetFormByCode(ctx context.Context, orgID int, code string) (*model.FormDefinition, error) {
	return s.formDefRepo.GetByCode(ctx, orgID, code)
}

// ListForms lists all forms for an organization
func (s *FormService) ListForms(ctx context.Context, orgID int) ([]*model.FormDefinition, error) {
	return s.formDefRepo.ListByOrg(ctx, orgID)
}

// PublishForm publishes a form
func (s *FormService) PublishForm(ctx context.Context, id int) error {
	return s.formDefRepo.Publish(ctx, id)
}

// SubmitForm submits a form
func (s *FormService) SubmitForm(ctx context.Context, sub *model.FormSubmission) error {
	return s.formSubRepo.Create(ctx, sub)
}

// DistributeForm distributes a form
func (s *FormService) DistributeForm(ctx context.Context, dist *model.FormDistribution) error {
	return s.distRepo.Create(ctx, dist)
}
