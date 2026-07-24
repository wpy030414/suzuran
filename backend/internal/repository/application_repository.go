package repository

import (
	"context"

	"gorm.io/gorm"
	"github.com/xrl/suzuran-cloud/internal/model"
)

// ApplicationRepository handles application data access
type ApplicationRepository struct {
	db *gorm.DB
}

// NewApplicationRepository creates a new application repository
func NewApplicationRepository(db *gorm.DB) *ApplicationRepository {
	return &ApplicationRepository{db: db}
}

// Create creates a new application
func (r *ApplicationRepository) Create(ctx context.Context, app *model.Application) error {
	return r.db.WithContext(ctx).Create(app).Error
}

// GetByID gets an application by ID
func (r *ApplicationRepository) GetByID(ctx context.Context, id int) (*model.Application, error) {
	var app model.Application
	err := r.db.WithContext(ctx).First(&app, id).Error
	if err != nil {
		return nil, err
	}
	return &app, nil
}

// GetByPackageName gets all applications with the given package name for an org
func (r *ApplicationRepository) GetByPackageName(ctx context.Context, orgID int, packageName string) ([]*model.Application, error) {
	var apps []*model.Application
	err := r.db.WithContext(ctx).
		Where("org_id = ? AND package_name = ?", orgID, packageName).
		Order("version DESC").
		Find(&apps).Error
	return apps, err
}

// GetByOrgID gets all applications for an org
func (r *ApplicationRepository) GetByOrgID(ctx context.Context, orgID int) ([]*model.Application, error) {
	var apps []*model.Application
	err := r.db.WithContext(ctx).
		Where("org_id = ?", orgID).
		Order("updated_at DESC").
		Find(&apps).Error
	return apps, err
}

// Delete deletes an application by ID
func (r *ApplicationRepository) Delete(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&model.Application{}, id).Error
}

// FormRepository handles form data access
type FormRepository struct {
	db *gorm.DB
}

// NewFormRepository creates a new form repository
func NewFormRepository(db *gorm.DB) *FormRepository {
	return &FormRepository{db: db}
}

// Create creates a new form
func (r *FormRepository) Create(ctx context.Context, form *model.Form) error {
	return r.db.WithContext(ctx).Create(form).Error
}

// GetByApplicationID gets all forms for an application
func (r *FormRepository) GetByApplicationID(ctx context.Context, appID int) ([]*model.Form, error) {
	var forms []*model.Form
	err := r.db.WithContext(ctx).Where("application_id = ?", appID).Find(&forms).Error
	return forms, err
}

// GetByID gets a form by ID
func (r *FormRepository) GetByID(ctx context.Context, id int) (*model.Form, error) {
	var form model.Form
	err := r.db.WithContext(ctx).First(&form, id).Error
	if err != nil {
		return nil, err
	}
	return &form, nil
}

// Update updates a form
func (r *FormRepository) Update(ctx context.Context, form *model.Form) error {
	return r.db.WithContext(ctx).Save(form).Error
}

// Delete deletes a form by ID
func (r *FormRepository) Delete(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&model.Form{}, id).Error
}

// ViewRepository handles view data access
type ViewRepository struct {
	db *gorm.DB
}

// NewViewRepository creates a new view repository
func NewViewRepository(db *gorm.DB) *ViewRepository {
	return &ViewRepository{db: db}
}

// Create creates a new view
func (r *ViewRepository) Create(ctx context.Context, view *model.View) error {
	return r.db.WithContext(ctx).Create(view).Error
}

// GetByApplicationID gets all views for an application
func (r *ViewRepository) GetByApplicationID(ctx context.Context, appID int) ([]*model.View, error) {
	var views []*model.View
	err := r.db.WithContext(ctx).Where("application_id = ?", appID).Find(&views).Error
	return views, err
}

// GetByID gets a view by ID
func (r *ViewRepository) GetByID(ctx context.Context, id int) (*model.View, error) {
	var view model.View
	err := r.db.WithContext(ctx).First(&view, id).Error
	if err != nil {
		return nil, err
	}
	return &view, nil
}

// Update updates a view
func (r *ViewRepository) Update(ctx context.Context, view *model.View) error {
	return r.db.WithContext(ctx).Save(view).Error
}

// Delete deletes a view by ID
func (r *ViewRepository) Delete(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&model.View{}, id).Error
}
