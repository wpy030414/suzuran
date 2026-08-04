package repository

import (
	"context"
	"time"

	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

// ApplicationDeploymentRepository manages deployment history persistence.
type ApplicationDeploymentRepository struct {
	db *gorm.DB
}

func NewApplicationDeploymentRepository(db *gorm.DB) *ApplicationDeploymentRepository {
	return &ApplicationDeploymentRepository{db: db}
}

func (r *ApplicationDeploymentRepository) Create(ctx context.Context, d *model.ApplicationDeployment) error {
	return r.db.WithContext(ctx).Create(d).Error
}

func (r *ApplicationDeploymentRepository) GetByID(ctx context.Context, id string) (*model.ApplicationDeployment, error) {
	var d model.ApplicationDeployment
	err := r.db.WithContext(ctx).First(&d, "id = ?", id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &d, err
}

func (r *ApplicationDeploymentRepository) ListByApplicationID(ctx context.Context, appID string) ([]*model.ApplicationDeployment, error) {
	var deployments []*model.ApplicationDeployment
	err := r.db.WithContext(ctx).Where("application_id = ?", appID).Order("created_at DESC").Find(&deployments).Error
	return deployments, err
}

func (r *ApplicationDeploymentRepository) UpdateStatus(ctx context.Context, id, status string) error {
	updates := map[string]interface{}{
		"status": status,
	}
	if status == "running" || status == "failed" {
		now := time.Now()
		updates["completed_at"] = &now
	}
	return r.db.WithContext(ctx).Model(&model.ApplicationDeployment{}).Where("id = ?", id).Updates(updates).Error
}

func (r *ApplicationDeploymentRepository) UpdateContainerID(ctx context.Context, id, containerID string) error {
	return r.db.WithContext(ctx).Model(&model.ApplicationDeployment{}).Where("id = ?", id).
		Update("container_id", containerID).Error
}
