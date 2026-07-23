package repository_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

func cleanupReportDefinitions() {
	testDB.Exec("DELETE FROM report_definitions")
}

func TestReportDefinitionRepository_Create(t *testing.T) {
	cleanupReportDefinitions()
	repo := repository.NewReportDefinitionRepository(testDB)

	t.Run("should create report definition successfully", func(t *testing.T) {
		rpt := &model.ReportDefinition{
			OrgID:       1,
			Name:        "Sales Report",
			Code:        "sales_report",
			QueryConfig: model.JSONB{"table": "orders", "filters": []string{"date_range"}},
			ChartConfig: model.JSONB{"type": "bar", "xAxis": "month", "yAxis": "revenue"},
		}
		err := repo.Create(context.Background(), rpt)
		require.NoError(t, err)
		assert.NotZero(t, rpt.ID)
		assert.Equal(t, "Sales Report", rpt.Name)
		assert.Equal(t, "sales_report", rpt.Code)
	})

	t.Run("should fail on duplicate code within same org", func(t *testing.T) {
		rpt1 := &model.ReportDefinition{
			OrgID:       2,
			Name:        "Report A",
			Code:        "duplicate_rpt",
			QueryConfig: model.JSONB{},
			ChartConfig: model.JSONB{},
		}
		err := repo.Create(context.Background(), rpt1)
		require.NoError(t, err)

		rpt2 := &model.ReportDefinition{
			OrgID:       2,
			Name:        "Report B",
			Code:        "duplicate_rpt",
			QueryConfig: model.JSONB{},
			ChartConfig: model.JSONB{},
		}
		err = repo.Create(context.Background(), rpt2)
		assert.Error(t, err)
	})

	t.Run("should allow same code in different orgs", func(t *testing.T) {
		rpt1 := &model.ReportDefinition{
			OrgID:       100,
			Name:        "Org 100 Report",
			Code:        "shared_rpt",
			QueryConfig: model.JSONB{},
			ChartConfig: model.JSONB{},
		}
		rpt2 := &model.ReportDefinition{
			OrgID:       200,
			Name:        "Org 200 Report",
			Code:        "shared_rpt",
			QueryConfig: model.JSONB{},
			ChartConfig: model.JSONB{},
		}

		require.NoError(t, repo.Create(context.Background(), rpt1))
		err := repo.Create(context.Background(), rpt2)
		assert.NoError(t, err)
	})
}

func TestReportDefinitionRepository_GetByID(t *testing.T) {
	cleanupReportDefinitions()
	repo := repository.NewReportDefinitionRepository(testDB)

	t.Run("should return report when exists", func(t *testing.T) {
		rpt := &model.ReportDefinition{
			OrgID:       3,
			Name:        "Get Test Report",
			Code:        "get_test_rpt",
			QueryConfig: model.JSONB{"test": true},
			ChartConfig: model.JSONB{"chart": "pie"},
		}
		require.NoError(t, repo.Create(context.Background(), rpt))

		result, err := repo.GetByID(context.Background(), rpt.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, rpt.ID, result.ID)
		assert.Equal(t, "Get Test Report", result.Name)
		assert.Equal(t, "get_test_rpt", result.Code)
	})

	t.Run("should return nil when not found", func(t *testing.T) {
		result, err := repo.GetByID(context.Background(), 9999)
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}

func TestReportDefinitionRepository_GetByCode(t *testing.T) {
	cleanupReportDefinitions()
	repo := repository.NewReportDefinitionRepository(testDB)

	t.Run("should return report by code", func(t *testing.T) {
		rpt := &model.ReportDefinition{
			OrgID:       4,
			Name:        "Code Lookup Report",
			Code:        "code_lookup_rpt",
			QueryConfig: model.JSONB{},
			ChartConfig: model.JSONB{},
		}
		require.NoError(t, repo.Create(context.Background(), rpt))

		result, err := repo.GetByCode(context.Background(), 4, "code_lookup_rpt")
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, rpt.ID, result.ID)
		assert.Equal(t, "Code Lookup Report", result.Name)
	})

	t.Run("should return nil when code not found in org", func(t *testing.T) {
		result, err := repo.GetByCode(context.Background(), 99, "nonexistent")
		require.NoError(t, err)
		assert.Nil(t, result)
	})

	t.Run("should not return report from different org", func(t *testing.T) {
		rpt := &model.ReportDefinition{
			OrgID:       300,
			Name:        "Org 300 Report",
			Code:        "org_specific_rpt",
			QueryConfig: model.JSONB{},
			ChartConfig: model.JSONB{},
		}
		require.NoError(t, repo.Create(context.Background(), rpt))

		result, err := repo.GetByCode(context.Background(), 400, "org_specific_rpt")
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}
