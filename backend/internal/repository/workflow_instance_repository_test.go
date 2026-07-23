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

func cleanupWorkflowInstances() {
	testDB.Exec("DELETE FROM workflow_instances")
}

func TestWorkflowInstanceRepository_Create(t *testing.T) {
	cleanupWorkflowInstances()
	repo := repository.NewWorkflowInstanceRepository(testDB)

	t.Run("should create workflow instance successfully", func(t *testing.T) {
		now := time.Now()
		inst := &model.WorkflowInstance{
			OrgID:        1,
			WorkflowCode: "approval_wf",
			BusinessKey:  "leave_req_001",
			CurrentNode:  "start",
			Status:       "running",
			StartedBy:    100,
			StartedAt:    now,
		}
		err := repo.Create(context.Background(), inst)
		require.NoError(t, err)
		assert.NotZero(t, inst.ID)
		assert.Equal(t, 1, inst.OrgID)
		assert.Equal(t, "approval_wf", inst.WorkflowCode)
		assert.Equal(t, "leave_req_001", inst.BusinessKey)
		assert.Equal(t, "running", inst.Status)
	})

	t.Run("should create instance with nil completedAt", func(t *testing.T) {
		inst := &model.WorkflowInstance{
			OrgID:        2,
			WorkflowCode: "expense_wf",
			BusinessKey:  "expense_001",
			CurrentNode:  "manager_approval",
			Status:       "running",
			StartedBy:    200,
			StartedAt:    time.Now(),
		}
		err := repo.Create(context.Background(), inst)
		require.NoError(t, err)
		assert.Nil(t, inst.CompletedAt)
	})
}

func TestWorkflowInstanceRepository_GetByID(t *testing.T) {
	cleanupWorkflowInstances()
	repo := repository.NewWorkflowInstanceRepository(testDB)

	t.Run("should return instance when exists", func(t *testing.T) {
		now := time.Now()
		inst := &model.WorkflowInstance{
			OrgID:        3,
			WorkflowCode: "test_wf",
			BusinessKey:  "test_001",
			CurrentNode:  "review",
			Status:       "running",
			StartedBy:    50,
			StartedAt:    now,
		}
		require.NoError(t, repo.Create(context.Background(), inst))

		result, err := repo.GetByID(context.Background(), inst.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, inst.ID, result.ID)
		assert.Equal(t, 3, result.OrgID)
		assert.Equal(t, "test_wf", result.WorkflowCode)
		assert.Equal(t, "test_001", result.BusinessKey)
		assert.Equal(t, "review", result.CurrentNode)
	})

	t.Run("should return nil when not found", func(t *testing.T) {
		result, err := repo.GetByID(context.Background(), 9999)
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}

func TestWorkflowInstanceRepository_UpdateStatus(t *testing.T) {
	cleanupWorkflowInstances()
	repo := repository.NewWorkflowInstanceRepository(testDB)

	t.Run("should update status only", func(t *testing.T) {
		inst := &model.WorkflowInstance{
			OrgID:        4,
			WorkflowCode: "status_wf",
			BusinessKey:  "status_001",
			CurrentNode:  "start",
			Status:       "running",
			StartedBy:    1,
			StartedAt:    time.Now(),
		}
		require.NoError(t, repo.Create(context.Background(), inst))

		err := repo.UpdateStatus(context.Background(), inst.ID, "completed", "")
		require.NoError(t, err)

		result, err := repo.GetByID(context.Background(), inst.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, "completed", result.Status)
		assert.Equal(t, "start", result.CurrentNode) // Should remain unchanged
	})

	t.Run("should update status and current node", func(t *testing.T) {
		inst := &model.WorkflowInstance{
			OrgID:        5,
			WorkflowCode: "node_wf",
			BusinessKey:  "node_001",
			CurrentNode:  "start",
			Status:       "running",
			StartedBy:    1,
			StartedAt:    time.Now(),
		}
		require.NoError(t, repo.Create(context.Background(), inst))

		err := repo.UpdateStatus(context.Background(), inst.ID, "running", "manager_approval")
		require.NoError(t, err)

		result, err := repo.GetByID(context.Background(), inst.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, "running", result.Status)
		assert.Equal(t, "manager_approval", result.CurrentNode)
	})

	t.Run("should succeed even if instance doesn't exist", func(t *testing.T) {
		err := repo.UpdateStatus(context.Background(), 9999, "cancelled", "")
		assert.NoError(t, err)
	})

	t.Run("should handle all status values", func(t *testing.T) {
		testCases := []struct {
			name   string
			status string
			node   string
		}{
			{"running status", "running", "step1"},
			{"completed status", "completed", ""},
			{"cancelled status", "cancelled", ""},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				inst := &model.WorkflowInstance{
					OrgID:        6,
					WorkflowCode: "test_wf",
					BusinessKey:  "test_" + tc.status,
					CurrentNode:  "initial",
					Status:       "running",
					StartedBy:    1,
					StartedAt:    time.Now(),
				}
				require.NoError(t, repo.Create(context.Background(), inst))

				err := repo.UpdateStatus(context.Background(), inst.ID, tc.status, tc.node)
				require.NoError(t, err)

				result, err := repo.GetByID(context.Background(), inst.ID)
				require.NoError(t, err)
				require.NotNil(t, result)
				assert.Equal(t, tc.status, result.Status)
			})
		}
	})
}
