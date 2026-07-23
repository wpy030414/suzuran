package service

import (
	"context"
	"fmt"

	"github.com/xrl/suzuran-cloud/internal/repository"
	"gorm.io/gorm"
)

// ReportService handles report operations
type ReportService struct {
	db         *gorm.DB
	reportRepo *repository.ReportDefinitionRepository
}

// NewReportService creates a new report service
func NewReportService(db *gorm.DB, reportRepo *repository.ReportDefinitionRepository) *ReportService {
	return &ReportService{
		db:         db,
		reportRepo: reportRepo,
	}
}

// ExecuteQuery executes a report query
func (s *ReportService) ExecuteQuery(ctx context.Context, orgID int, code string, params map[string]interface{}) ([]map[string]interface{}, error) {
	report, err := s.reportRepo.GetByCode(ctx, orgID, code)
	if err != nil {
		return nil, err
	}
	if report == nil {
		return nil, fmt.Errorf("report not found: %s", code)
	}

	// Build SQL from config (simplified)
	tableName, ok := report.QueryConfig["table"].(string)
	if !ok {
		return nil, fmt.Errorf("invalid query config: table not specified")
	}

	query := fmt.Sprintf("SELECT * FROM %s WHERE org_id = ?", tableName)

	var results []map[string]interface{}
	err = s.db.WithContext(ctx).Raw(query, orgID).Scan(&results).Error
	return results, err
}
