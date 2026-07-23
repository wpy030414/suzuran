package repository_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

func cleanupWorkflowDefinitions() {
	testDB.Exec("DELETE FROM workflow_definitions")
}

func TestWorkflowDefinitionRepository_Create(t *testing.T) {
	cleanupWorkflowDefinitions()
	repo := repository.NewWorkflowDefinitionRepository(testDB)

	t.Run("should create workflow definition successfully", func(t *testing.T) {
		wf := &model.WorkflowDefinition{
			OrgID:      1,
			Name:       "Approval Workflow",
			Code:       "approval_wf",
			Definition: model.JSONB{"nodes": []string{"start", "approve", "end"}},
		}
		err := repo.Create(context.Background(), wf)
		require.NoError(t, err)
		assert.NotZero(t, wf.ID)
		assert.Equal(t, "Approval Workflow", wf.Name)
		assert.Equal(t, "approval_wf", wf.Code)
	})

	t.Run("should fail on duplicate code within same org", func(t *testing.T) {
		wf1 := &model.WorkflowDefinition{
			OrgID:      2,
			Name:       "WF A",
			Code:       "duplicate_wf",
			Definition: model.JSONB{"version": 1},
		}
		err := repo.Create(context.Background(), wf1)
		require.NoError(t, err)

		wf2 := &model.WorkflowDefinition{
			OrgID:      2,
			Name:       "WF B",
			Code:       "duplicate_wf",
			Definition: model.JSONB{"version": 2},
		}
		err = repo.Create(context.Background(), wf2)
		assert.Error(t, err)
	})

	t.Run("should allow same code in different orgs", func(t *testing.T) {
		wf1 := &model.WorkflowDefinition{
			OrgID:      100,
			Name:       "Org 100 WF",
			Code:       "shared_wf",
			Definition: model.JSONB{},
		}
		wf2 := &model.WorkflowDefinition{
			OrgID:      200,
			Name:       "Org 200 WF",
			Code:       "shared_wf",
			Definition: model.JSONB{},
		}

		require.NoError(t, repo.Create(context.Background(), wf1))
		err := repo.Create(context.Background(), wf2)
		assert.NoError(t, err)
	})
}

func TestWorkflowDefinitionRepository_GetByID(t *testing.T) {
	cleanupWorkflowDefinitions()
	repo := repository.NewWorkflowDefinitionRepository(testDB)

	t.Run("should return workflow when exists", func(t *testing.T) {
		wf := &model.WorkflowDefinition{
			OrgID:      3,
			Name:       "Get Test Workflow",
			Code:       "get_test_wf",
			Definition: model.JSONB{"test": true},
		}
		require.NoError(t, repo.Create(context.Background(), wf))

		result, err := repo.GetByID(context.Background(), wf.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, wf.ID, result.ID)
		assert.Equal(t, "Get Test Workflow", result.Name)
		assert.Equal(t, "get_test_wf", result.Code)
	})

	t.Run("should return nil when not found", func(t *testing.T) {
		result, err := repo.GetByID(context.Background(), 9999)
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}

func TestWorkflowDefinitionRepository_GetByCode(t *testing.T) {
	cleanupWorkflowDefinitions()
	repo := repository.NewWorkflowDefinitionRepository(testDB)

	t.Run("should return workflow by code", func(t *testing.T) {
		wf := &model.WorkflowDefinition{
			OrgID:      4,
			Name:       "Code Lookup Workflow",
			Code:       "code_lookup_wf",
			Definition: model.JSONB{},
		}
		require.NoError(t, repo.Create(context.Background(), wf))

		result, err := repo.GetByCode(context.Background(), 4, "code_lookup_wf")
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, wf.ID, result.ID)
		assert.Equal(t, "Code Lookup Workflow", result.Name)
	})

	t.Run("should return nil when code not found in org", func(t *testing.T) {
		result, err := repo.GetByCode(context.Background(), 99, "nonexistent")
		require.NoError(t, err)
		assert.Nil(t, result)
	})

	t.Run("should not return workflow from different org", func(t *testing.T) {
		wf := &model.WorkflowDefinition{
			OrgID:      300,
			Name:       "Org 300 WF",
			Code:       "org_specific_wf",
			Definition: model.JSONB{},
		}
		require.NoError(t, repo.Create(context.Background(), wf))

		result, err := repo.GetByCode(context.Background(), 400, "org_specific_wf")
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}
