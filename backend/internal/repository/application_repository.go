package repository

import (
	"context"
	"time"

	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

// ApplicationRepository manages Application persistence.
type ApplicationRepository struct {
	db *gorm.DB
}

func NewApplicationRepository(db *gorm.DB) *ApplicationRepository {
	return &ApplicationRepository{db: db}
}

func (r *ApplicationRepository) Create(ctx context.Context, app *model.Application) error {
	return r.db.WithContext(ctx).Create(app).Error
}

func (r *ApplicationRepository) GetByID(ctx context.Context, id string) (*model.Application, error) {
	var app model.Application
	err := r.db.WithContext(ctx).First(&app, "id = ?", id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &app, err
}

func (r *ApplicationRepository) ListByOrgID(ctx context.Context, orgID int) ([]*model.Application, error) {
	var apps []*model.Application
	err := r.db.WithContext(ctx).Where("org_id = ?", orgID).Order("created_at DESC").Find(&apps).Error
	return apps, err
}

func (r *ApplicationRepository) Update(ctx context.Context, app *model.Application) error {
	return r.db.WithContext(ctx).Save(app).Error
}

func (r *ApplicationRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&model.Application{}, "id = ?", id).Error
}

// UpdateStatus updates the status and container ID of an application.
func (r *ApplicationRepository) UpdateStatus(ctx context.Context, id, status, containerID string) error {
	updates := map[string]interface{}{
		"status":      status,
		"container_id": containerID,
		"updated_at":  time.Now(),
	}
	return r.db.WithContext(ctx).Model(&model.Application{}).Where("id = ?", id).Updates(updates).Error
}
