package repository_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

func cleanupWorkflowApprovals() {
	testDB.Exec("DELETE FROM workflow_approvals")
}

func TestWorkflowApprovalRepository_Create(t *testing.T) {
	cleanupWorkflowApprovals()
	repo := repository.NewWorkflowApprovalRepository(testDB)

	t.Run("should create approval successfully", func(t *testing.T) {
		approval := &model.WorkflowApproval{
			OrgID:      1,
			InstanceID: 100,
			NodeKey:    "manager_approval",
			ApproverID: 10,
			Status:     "pending",
		}
		err := repo.Create(context.Background(), approval)
		require.NoError(t, err)
		assert.NotZero(t, approval.ID)
		assert.Equal(t, 1, approval.OrgID)
		assert.Equal(t, 100, approval.InstanceID)
		assert.Equal(t, 10, approval.ApproverID)
		assert.Equal(t, "pending", approval.Status)
	})

	t.Run("should create approval with all fields", func(t *testing.T) {
		approval := &model.WorkflowApproval{
			OrgID:      2,
			InstanceID: 200,
			NodeKey:    "director_approval",
			ApproverID: 20,
			Status:     "pending",
		}
		err := repo.Create(context.Background(), approval)
		require.NoError(t, err)
		assert.Nil(t, approval.ProcessedAt)
		assert.Empty(t, approval.Action)
		assert.Empty(t, approval.Comment)
	})
}

func TestWorkflowApprovalRepository_GetPendingByUserAndInstance(t *testing.T) {
	cleanupWorkflowApprovals()
	repo := repository.NewWorkflowApprovalRepository(testDB)

	t.Run("should return pending approval when exists", func(t *testing.T) {
		approval := &model.WorkflowApproval{
			OrgID:      3,
			InstanceID: 300,
			NodeKey:    "review",
			ApproverID: 30,
			Status:     "pending",
		}
		require.NoError(t, repo.Create(context.Background(), approval))

		result, err := repo.GetPendingByUserAndInstance(context.Background(), 300, 30)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, approval.ID, result.ID)
		assert.Equal(t, 300, result.InstanceID)
		assert.Equal(t, 30, result.ApproverID)
		assert.Equal(t, "pending", result.Status)
	})

	t.Run("should return nil when already approved", func(t *testing.T) {
		approval := &model.WorkflowApproval{
			OrgID:      4,
			InstanceID: 400,
			NodeKey:    "review",
			ApproverID: 40,
			Status:     "approved",
			Action:     "approve",
		}
		require.NoError(t, repo.Create(context.Background(), approval))

		result, err := repo.GetPendingByUserAndInstance(context.Background(), 400, 40)
		require.NoError(t, err)
		assert.Nil(t, result)
	})

	t.Run("should return nil when not found", func(t *testing.T) {
		result, err := repo.GetPendingByUserAndInstance(context.Background(), 999, 999)
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}

func TestWorkflowApprovalRepository_UpdateApproval(t *testing.T) {
	cleanupWorkflowApprovals()
	repo := repository.NewWorkflowApprovalRepository(testDB)

	t.Run("should update approval to approved", func(t *testing.T) {
		approval := &model.WorkflowApproval{
			OrgID:      5,
			InstanceID: 500,
			NodeKey:    "manager_review",
			ApproverID: 50,
			Status:     "pending",
		}
		require.NoError(t, repo.Create(context.Background(), approval))

		err := repo.UpdateApproval(context.Background(), approval.ID, "approved", "approve", "Looks good")
		require.NoError(t, err)

		result, err := repo.GetPendingByUserAndInstance(context.Background(), 500, 50)
		require.NoError(t, err)
		assert.Nil(t, result) // Should not be pending anymore

		// Get by ID to verify updates
		var updated model.WorkflowApproval
		testDB.First(&updated, approval.ID)
		assert.Equal(t, "approved", updated.Status)
		assert.Equal(t, "approve", updated.Action)
		assert.Equal(t, "Looks good", updated.Comment)
		assert.NotNil(t, updated.ProcessedAt)
	})

	t.Run("should update approval to rejected", func(t *testing.T) {
		approval := &model.WorkflowApproval{
			OrgID:      6,
			InstanceID: 600,
			NodeKey:    "director_review",
			ApproverID: 60,
			Status:     "pending",
		}
		require.NoError(t, repo.Create(context.Background(), approval))

		err := repo.UpdateApproval(context.Background(), approval.ID, "rejected", "reject", "Needs revision")
		require.NoError(t, err)

		var updated model.WorkflowApproval
		testDB.First(&updated, approval.ID)
		assert.Equal(t, "rejected", updated.Status)
		assert.Equal(t, "reject", updated.Action)
		assert.Equal(t, "Needs revision", updated.Comment)
		assert.NotNil(t, updated.ProcessedAt)
	})

	t.Run("should succeed even if approval doesn't exist", func(t *testing.T) {
		err := repo.UpdateApproval(context.Background(), 9999, "approved", "approve", "test")
		assert.NoError(t, err)
	})
}
