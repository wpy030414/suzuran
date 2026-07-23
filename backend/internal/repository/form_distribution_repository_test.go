package repository_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

func cleanupFormDistributions() {
	testDB.Exec("DELETE FROM form_distributions")
}

func TestFormDistributionRepository_Create(t *testing.T) {
	cleanupFormDistributions()
	repo := repository.NewFormDistributionRepository(testDB)

	t.Run("should create distribution successfully", func(t *testing.T) {
		dist := &model.FormDistribution{
			OrgID:         1,
			FormCode:      "leave_request",
			AppCode:       "hr_app",
			DistributedAt: time.Now(),
		}
		err := repo.Create(context.Background(), dist)
		require.NoError(t, err)
		assert.NotZero(t, dist.ID)
		assert.Equal(t, 1, dist.OrgID)
		assert.Equal(t, "leave_request", dist.FormCode)
		assert.Equal(t, "hr_app", dist.AppCode)
	})

	t.Run("should create multiple distributions for same form", func(t *testing.T) {
		dist1 := &model.FormDistribution{
			OrgID:         2,
			FormCode:      "expense_report",
			AppCode:       "finance_app_1",
			DistributedAt: time.Now(),
		}
		dist2 := &model.FormDistribution{
			OrgID:         2,
			FormCode:      "expense_report",
			AppCode:       "finance_app_2",
			DistributedAt: time.Now(),
		}

		require.NoError(t, repo.Create(context.Background(), dist1))
		err := repo.Create(context.Background(), dist2)
		assert.NoError(t, err)
	})
}

func TestFormDistributionRepository_GetByFormCode(t *testing.T) {
	cleanupFormDistributions()
	repo := repository.NewFormDistributionRepository(testDB)

	t.Run("should return first distribution when exists", func(t *testing.T) {
		dist := &model.FormDistribution{
			OrgID:         3,
			FormCode:      "test_form",
			AppCode:       "test_app",
			DistributedAt: time.Now(),
		}
		require.NoError(t, repo.Create(context.Background(), dist))

		result, err := repo.GetByFormCode(context.Background(), 3, "test_form")
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, dist.ID, result.ID)
		assert.Equal(t, 3, result.OrgID)
		assert.Equal(t, "test_form", result.FormCode)
		assert.Equal(t, "test_app", result.AppCode)
	})

	t.Run("should return nil when not found", func(t *testing.T) {
		result, err := repo.GetByFormCode(context.Background(), 99, "nonexistent")
		require.NoError(t, err)
		assert.Nil(t, result)
	})

	t.Run("should not return distribution from different org", func(t *testing.T) {
		dist := &model.FormDistribution{
			OrgID:         40,
			FormCode:      "org_specific",
			AppCode:       "app_40",
			DistributedAt: time.Now(),
		}
		require.NoError(t, repo.Create(context.Background(), dist))

		result, err := repo.GetByFormCode(context.Background(), 50, "org_specific")
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}

func TestFormDistributionRepository_ListByOrg(t *testing.T) {
	cleanupFormDistributions()
	repo := repository.NewFormDistributionRepository(testDB)

	t.Run("should list all distributions for org", func(t *testing.T) {
		dist1 := &model.FormDistribution{
			OrgID:         10,
			FormCode:      "form_a",
			AppCode:       "app_1",
			DistributedAt: time.Now(),
		}
		dist2 := &model.FormDistribution{
			OrgID:         10,
			FormCode:      "form_b",
			AppCode:       "app_2",
			DistributedAt: time.Now(),
		}
		dist3 := &model.FormDistribution{
			OrgID:         10,
			FormCode:      "form_c",
			AppCode:       "app_3",
			DistributedAt: time.Now(),
		}

		require.NoError(t, repo.Create(context.Background(), dist1))
		require.NoError(t, repo.Create(context.Background(), dist2))
		require.NoError(t, repo.Create(context.Background(), dist3))

		dists, err := repo.ListByOrg(context.Background(), 10)
		require.NoError(t, err)
		require.Len(t, dists, 3)
	})

	t.Run("should only return distributions for specified org", func(t *testing.T) {
		dist1 := &model.FormDistribution{
			OrgID:         60,
			FormCode:      "shared_form",
			AppCode:       "app_60",
			DistributedAt: time.Now(),
		}
		dist2 := &model.FormDistribution{
			OrgID:         70,
			FormCode:      "shared_form",
			AppCode:       "app_70",
			DistributedAt: time.Now(),
		}

		require.NoError(t, repo.Create(context.Background(), dist1))
		require.NoError(t, repo.Create(context.Background(), dist2))

		dists, err := repo.ListByOrg(context.Background(), 60)
		require.NoError(t, err)
		require.Len(t, dists, 1)
		assert.Equal(t, dist1.ID, dists[0].ID)
	})

	t.Run("should return empty slice when no distributions", func(t *testing.T) {
		dists, err := repo.ListByOrg(context.Background(), 999)
		require.NoError(t, err)
		assert.Empty(t, dists)
	})
}
