package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

// ApplicationService manages applications with versioning and distribution
type ApplicationService struct {
	AppRepo  *repository.ApplicationRepository
	FormRepo *repository.FormRepository
	ViewRepo *repository.ViewRepository
}

// NewApplicationService creates a new application service
func NewApplicationService(
	appRepo *repository.ApplicationRepository,
	formRepo *repository.FormRepository,
	viewRepo *repository.ViewRepository,
) *ApplicationService {
	return &ApplicationService{
		AppRepo:  appRepo,
		FormRepo: formRepo,
		ViewRepo: viewRepo,
	}
}

// generateMeta generates a short unique metadata string for the version
func generateMeta() string {
	u := uuid.New().String()
	if len(u) >= 4 {
		return u[:4]
	}
	return u
}

// CreateApp creates a new application with timestamped version
func (s *ApplicationService) CreateApp(ctx context.Context, orgID int, name, packageName, description string) (*model.Application, error) {
	app := &model.Application{
		PackageName: packageName,
		Name:        name,
		Description: description,
		OrgID:       orgID,
		Schema:      model.JSONB{},
	}
	app.GenerateUUID()
	// Version based on current time + 4-char meta derived from UUID
	app.SetVersion(time.Now(), app.UUID[:4])

	if err := s.AppRepo.Create(ctx, app); err != nil {
		return nil, err
	}

	return app, nil
}

// CopyApp copies an existing application with a new UUID and new timestamped version
func (s *ApplicationService) CopyApp(ctx context.Context, sourceAppID int, newName string) (*model.Application, error) {
	sourceApp, err := s.AppRepo.GetByID(ctx, sourceAppID)
	if err != nil {
		return nil, err
	}
	if sourceApp == nil {
		return nil, errors.New("source application not found")
	}

	// Create new application with same package name but new UUID and current-time version
	newApp := &model.Application{
		PackageName: sourceApp.PackageName,
		Name:        newName,
		Description: sourceApp.Description,
		OrgID:       sourceApp.OrgID,
		Schema:      sourceApp.Schema,
	}
	newApp.GenerateUUID()
	newApp.SetVersion(time.Now(), generateMeta())

	if err := s.AppRepo.Create(ctx, newApp); err != nil {
		return nil, err
	}

	// Copy forms from source application
	forms, err := s.FormRepo.GetByApplicationID(ctx, sourceAppID)
	if err == nil {
		for _, form := range forms {
			newForm := &model.Form{
				ApplicationID: newApp.ID,
				Name:          form.Name,
				Code:          form.Code,
				Description:   form.Description,
				Schema:        form.Schema,
			}
			s.FormRepo.Create(ctx, newForm)
		}
	}

	// Copy views from source application
	views, err := s.ViewRepo.GetByApplicationID(ctx, sourceAppID)
	if err == nil {
		for _, view := range views {
			newView := &model.View{
				ApplicationID: newApp.ID,
				Name:          view.Name,
				Code:          view.Code,
				Type:          view.Type,
				Description:   view.Description,
				Config:        view.Config,
			}
			s.ViewRepo.Create(ctx, newView)
		}
	}

	return newApp, nil
}

// UpdateAppVersion creates a new version of an application with new UUID and current timestamp
func (s *ApplicationService) UpdateAppVersion(ctx context.Context, appID int) (*model.Application, error) {
	sourceApp, err := s.AppRepo.GetByID(ctx, appID)
	if err != nil {
		return nil, err
	}
	if sourceApp == nil {
		return nil, errors.New("application not found")
	}

	// Create new version with new UUID and current timestamp
	newApp := &model.Application{
		PackageName: sourceApp.PackageName,
		Name:        sourceApp.Name,
		Description: sourceApp.Description,
		OrgID:       sourceApp.OrgID,
		Schema:      sourceApp.Schema,
	}
	newApp.GenerateUUID()
	newApp.SetVersion(time.Now(), generateMeta())

	if err := s.AppRepo.Create(ctx, newApp); err != nil {
		return nil, err
	}

	return newApp, nil
}

// ListAppsByPackage lists all versions of an application by package name
func (s *ApplicationService) ListAppsByPackage(ctx context.Context, orgID int, packageName string) ([]*model.Application, error) {
	return s.AppRepo.GetByPackageName(ctx, orgID, packageName)
}

// GetLatestAppVersion gets the latest version of an application (by creation time)
func (s *ApplicationService) GetLatestAppVersion(ctx context.Context, orgID int, packageName string) (*model.Application, error) {
	apps, err := s.AppRepo.GetByPackageName(ctx, orgID, packageName)
	if err != nil {
		return nil, err
	}
	if len(apps) == 0 {
		return nil, errors.New("application not found")
	}

	// Latest = newest version string (version embeds timestamp, so lexical sort works)
	latest := apps[0]
	for _, app := range apps[1:] {
		if app.Version > latest.Version {
			latest = app
		}
	}
	return latest, nil
}

// Log version format helper
func formatVersionExample() string {
	return fmt.Sprintf("26.7.24+1626-hf7z (yy.M.d+Hmm-meta)")
}

// ListForms lists all forms for an application
func (s *ApplicationService) ListForms(ctx context.Context, appID int) ([]*model.Form, error) {
	return s.FormRepo.GetByApplicationID(ctx, appID)
}

// CreateForm creates a new form within an application
func (s *ApplicationService) CreateForm(ctx context.Context, appID int, name, code, description string, schema model.JSONB) (*model.Form, error) {
	if schema == nil {
		schema = model.JSONB{"fields": []interface{}{}}
	}
	form := &model.Form{
		ApplicationID: appID,
		Name:          name,
		Code:          code,
		Description:   description,
		Schema:        schema,
	}
	if err := s.FormRepo.Create(ctx, form); err != nil {
		return nil, err
	}
	return form, nil
}

// GetForm gets a form by ID
func (s *ApplicationService) GetForm(ctx context.Context, formID int) (*model.Form, error) {
	return s.FormRepo.GetByID(ctx, formID)
}

// UpdateForm updates a form's name, description and schema
func (s *ApplicationService) UpdateForm(ctx context.Context, formID int, name, description string, schema model.JSONB) (*model.Form, error) {
	form, err := s.FormRepo.GetByID(ctx, formID)
	if err != nil {
		return nil, err
	}
	form.Name = name
	form.Description = description
	if schema != nil {
		form.Schema = schema
	}
	if err := s.FormRepo.Update(ctx, form); err != nil {
		return nil, err
	}
	return form, nil
}

// DeleteForm deletes a form by ID
func (s *ApplicationService) DeleteForm(ctx context.Context, formID int) error {
	return s.FormRepo.Delete(ctx, formID)
}

// ListViews lists all views for an application
func (s *ApplicationService) ListViews(ctx context.Context, appID int) ([]*model.View, error) {
	return s.ViewRepo.GetByApplicationID(ctx, appID)
}

// CreateView creates a new view within an application
func (s *ApplicationService) CreateView(ctx context.Context, appID int, name, code, viewType, description string, config model.JSONB) (*model.View, error) {
	if config == nil {
		config = model.JSONB{}
	}
	view := &model.View{
		ApplicationID: appID,
		Name:          name,
		Code:          code,
		Type:          viewType,
		Description:   description,
		Config:        config,
	}
	if err := s.ViewRepo.Create(ctx, view); err != nil {
		return nil, err
	}
	return view, nil
}

// DeleteView deletes a view by ID
func (s *ApplicationService) DeleteView(ctx context.Context, viewID int) error {
	return s.ViewRepo.Delete(ctx, viewID)
}

// DeleteApp deletes an application by ID (forms/views are cascade-deleted by DB)
func (s *ApplicationService) DeleteApp(ctx context.Context, appID int) error {
	return s.AppRepo.Delete(ctx, appID)
}

// DistributeApp distributes an application to a target organization
func (s *ApplicationService) DistributeApp(ctx context.Context, appID, targetOrgID int, overwrite bool) (*model.Application, error) {
	src, err := s.AppRepo.GetByID(ctx, appID)
	if err != nil {
		return nil, err
	}
	if src == nil {
		return nil, errors.New("application not found")
	}

	if overwrite {
		existing, err := s.AppRepo.GetByPackageName(ctx, targetOrgID, src.PackageName)
		if err != nil {
			return nil, err
		}
		for _, app := range existing {
			if delErr := s.AppRepo.Delete(ctx, app.ID); delErr != nil {
				return nil, delErr
			}
		}
	}

	newApp := &model.Application{
		PackageName: src.PackageName,
		Name:        src.Name,
		Description: src.Description,
		OrgID:       targetOrgID,
		Schema:      src.Schema,
	}
	newApp.GenerateUUID()
	newApp.SetVersion(time.Now(), generateMeta())

	if err := s.AppRepo.Create(ctx, newApp); err != nil {
		return nil, err
	}

	forms, err := s.FormRepo.GetByApplicationID(ctx, appID)
	if err == nil {
		for _, form := range forms {
			newForm := &model.Form{
				ApplicationID: newApp.ID,
				Name:          form.Name,
				Code:          form.Code,
				Description:   form.Description,
				Schema:        form.Schema,
			}
			s.FormRepo.Create(ctx, newForm)
		}
	}

	views, err := s.ViewRepo.GetByApplicationID(ctx, appID)
	if err == nil {
		for _, view := range views {
			newView := &model.View{
				ApplicationID: newApp.ID,
				Name:          view.Name,
				Code:          view.Code,
				Type:          view.Type,
				Description:   view.Description,
				Config:        view.Config,
			}
			s.ViewRepo.Create(ctx, newView)
		}
	}

	return newApp, nil
}
