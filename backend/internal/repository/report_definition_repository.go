package repository

import (
	"context"
	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

type ReportDefinitionRepository struct {
	db *gorm.DB
}

func NewReportDefinitionRepository(db *gorm.DB) *ReportDefinitionRepository {
	return &ReportDefinitionRepository{db: db}
}

func (r *ReportDefinitionRepository) Create(ctx context.Context, rpt *model.ReportDefinition) error {
	return r.db.WithContext(ctx).Create(rpt).Error
}

func (r *ReportDefinitionRepository) GetByID(ctx context.Context, id int) (*model.ReportDefinition, error) {
	var rpt model.ReportDefinition
	err := r.db.WithContext(ctx).First(&rpt, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &rpt, err
}

func (r *ReportDefinitionRepository) GetByCode(ctx context.Context, orgID int, code string) (*model.ReportDefinition, error) {
	var rpt model.ReportDefinition
	err := r.db.WithContext(ctx).Where("org_id = ? AND code = ?", orgID, code).First(&rpt).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &rpt, err
}
