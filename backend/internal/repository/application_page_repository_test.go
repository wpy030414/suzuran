package repository_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

func cleanupApplicationPages() {
	testDB.Exec("DELETE FROM application_pages")
}

func TestApplicationPageRepository_Create(t *testing.T) {
	cleanupApplicationPages()
	repo := repository.NewApplicationPageRepository(testDB)

	t.Run("should create application page successfully", func(t *testing.T) {
		page := &model.ApplicationPage{
			OrgID:        1,
			Name:         "Dashboard",
			Code:         "dashboard",
			LayoutConfig: model.JSONB{"type": "grid", "columns": 3},
			WidgetConfig: model.JSONB{"widgets": []string{"chart1", "table1"}},
			VueTemplate:  "<div>Dashboard</div>",
			VueScript:    "export default { data() { return {} } }",
			VueStyle:     ".dashboard { padding: 20px; }",
		}
		err := repo.Create(context.Background(), page)
		require.NoError(t, err)
		assert.NotZero(t, page.ID)
		assert.Equal(t, "Dashboard", page.Name)
		assert.Equal(t, "dashboard", page.Code)
	})

	t.Run("should fail on duplicate code within same org", func(t *testing.T) {
		page1 := &model.ApplicationPage{
			OrgID: 2,
			Name:  "Page A",
			Code:  "duplicate_page",
		}
		err := repo.Create(context.Background(), page1)
		require.NoError(t, err)

		page2 := &model.ApplicationPage{
			OrgID: 2,
			Name:  "Page B",
			Code:  "duplicate_page",
		}
		err = repo.Create(context.Background(), page2)
		assert.Error(t, err)
	})

	t.Run("should allow same code in different orgs", func(t *testing.T) {
		page1 := &model.ApplicationPage{
			OrgID: 100,
			Name:  "Org 100 Page",
			Code:  "shared_page",
		}
		page2 := &model.ApplicationPage{
			OrgID: 200,
			Name:  "Org 200 Page",
			Code:  "shared_page",
		}

		require.NoError(t, repo.Create(context.Background(), page1))
		err := repo.Create(context.Background(), page2)
		assert.NoError(t, err)
	})
}

func TestApplicationPageRepository_GetByCode(t *testing.T) {
	cleanupApplicationPages()
	repo := repository.NewApplicationPageRepository(testDB)

	t.Run("should return page by code", func(t *testing.T) {
		page := &model.ApplicationPage{
			OrgID:        3,
			Name:         "Code Lookup Page",
			Code:         "code_lookup_page",
			LayoutConfig: model.JSONB{"layout": "single"},
			VueTemplate:  "<div>Test</div>",
		}
		require.NoError(t, repo.Create(context.Background(), page))

		result, err := repo.GetByCode(context.Background(), 3, "code_lookup_page")
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, page.ID, result.ID)
		assert.Equal(t, "Code Lookup Page", result.Name)
		assert.Equal(t, "code_lookup_page", result.Code)
		assert.Equal(t, "<div>Test</div>", result.VueTemplate)
	})

	t.Run("should return nil when code not found in org", func(t *testing.T) {
		result, err := repo.GetByCode(context.Background(), 99, "nonexistent")
		require.NoError(t, err)
		assert.Nil(t, result)
	})

	t.Run("should not return page from different org", func(t *testing.T) {
		page := &model.ApplicationPage{
			OrgID: 300,
			Name:  "Org 300 Page",
			Code:  "org_specific_page",
		}
		require.NoError(t, repo.Create(context.Background(), page))

		result, err := repo.GetByCode(context.Background(), 400, "org_specific_page")
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}
