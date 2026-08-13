package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupWorkflowTestDB creates an in-memory SQLite DB with the workflow + tenant tables migrated.
func setupWorkflowTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(
		&model.Org{},
		&model.User{},
		&model.OrgUserBond{},
		&model.Department{},
		&model.WorkflowDefinition{},
		&model.WorkflowInstance{},
		&model.WorkflowTask{},
	))
	return db
}

func newWorkflowService(db *gorm.DB) *WorkflowService {
	return NewWorkflowService(
		repository.NewWorkflowDefinitionRepository(db),
		repository.NewWorkflowInstanceRepository(db),
		repository.NewWorkflowTaskRepository(db),
		repository.NewOrgUserBondRepository(db),
		nil, // no notifier in tests
	)
}

// leaveApprovalDef returns a 3-step linear approval: submit -> manager_approve -> end.
func leaveApprovalDef() map[string]interface{} {
	return map[string]interface{}{
		"name": "leave-approval",
		"variables": map[string]interface{}{
			"leaveDays": "number",
		},
		"steps": []interface{}{
			map[string]interface{}{"name": "submit", "type": "start", "next": "manager_approve"},
			map[string]interface{}{
				"name":     "manager_approve",
				"type":     "approval",
				"assignee": map[string]interface{}{"type": "user", "value": "42"},
				"on_approve": map[string]interface{}{"goto": "end_approved"},
				"on_reject":  map[string]interface{}{"goto": "end_rejected"},
			},
			map[string]interface{}{"name": "end_approved", "type": "end", "result": "approved"},
			map[string]interface{}{"name": "end_rejected", "type": "end", "result": "rejected"},
		},
	}
}

// conditionalDef returns a definition with a condition branch: leaveDays > 3 -> director, else approved.
func conditionalDef() map[string]interface{} {
	return map[string]interface{}{
		"name": "conditional-leave",
		"variables": map[string]interface{}{
			"leaveDays": "number",
		},
		"steps": []interface{}{
			map[string]interface{}{"name": "submit", "type": "start", "next": "manager_approve"},
			map[string]interface{}{
				"name":       "manager_approve",
				"type":       "approval",
				"assignee":   map[string]interface{}{"type": "user", "value": "42"},
				"on_approve": map[string]interface{}{"goto": "check_days"},
				"on_reject":  map[string]interface{}{"goto": "end_rejected"},
			},
			map[string]interface{}{
				"name": "check_days",
				"type": "condition",
				"conditions": []interface{}{
					map[string]interface{}{"when": "leaveDays > 3", "goto": "director_approve"},
					map[string]interface{}{"otherwise": "end_approved"},
				},
			},
			map[string]interface{}{
				"name":       "director_approve",
				"type":       "approval",
				"assignee":   map[string]interface{}{"type": "user", "value": "42"},
				"on_approve": map[string]interface{}{"goto": "end_approved"},
				"on_reject":  map[string]interface{}{"goto": "end_rejected"},
			},
			map[string]interface{}{"name": "end_approved", "type": "end", "result": "approved"},
			map[string]interface{}{"name": "end_rejected", "type": "end", "result": "rejected"},
		},
	}
}

func TestWorkflowService_DefineWorkflow_Validation(t *testing.T) {
	db := setupWorkflowTestDB(t)
	svc := newWorkflowService(db)
	ctx := context.Background()

	t.Run("rejects definition with no start", func(t *testing.T) {
		bad := map[string]interface{}{"name": "x", "steps": []interface{}{
			map[string]interface{}{"name": "end", "type": "end", "result": "approved"},
		}}
		_, err := svc.DefineWorkflow(ctx, 1, 1, "bad", "", bad)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "no start step")
	})

	t.Run("rejects dangling goto", func(t *testing.T) {
		bad := map[string]interface{}{"name": "x", "steps": []interface{}{
			map[string]interface{}{"name": "submit", "type": "start", "next": "missing"},
		}}
		_, err := svc.DefineWorkflow(ctx, 1, 1, "bad", "", bad)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "missing")
	})

	t.Run("accepts valid definition", func(t *testing.T) {
		def, err := svc.DefineWorkflow(ctx, 1, 1, "leave", "desc", leaveApprovalDef())
		require.NoError(t, err)
		assert.Equal(t, "active", def.Status)
		assert.Equal(t, 1, def.Version)
	})
}

func TestWorkflowService_LinearApproval_ApprovePath(t *testing.T) {
	db := setupWorkflowTestDB(t)
	svc := newWorkflowService(db)
	ctx := context.Background()

	def, err := svc.DefineWorkflow(ctx, 1, 1, "leave", "", leaveApprovalDef())
	require.NoError(t, err)

	inst, err := svc.StartInstance(ctx, 1, def.ID, 7, map[string]interface{}{"leaveDays": float64(1)})
	require.NoError(t, err)
	assert.Equal(t, "running", inst.Status)
	assert.Equal(t, "manager_approve", inst.CurrentStep)

	// A pending task for user 42 must exist.
	tasks, err := svc.taskRepo.ListByInstance(ctx, 1, inst.ID)
	require.NoError(t, err)
	require.Len(t, tasks, 1)
	assert.Equal(t, "pending", tasks[0].Status)
	assert.Equal(t, 42, tasks[0].AssigneeID)

	// Approve by the assignee -> instance reaches end_approved.
	inst2, err := svc.ApproveTask(ctx, 1, tasks[0].ID, 42, "ok")
	require.NoError(t, err)
	assert.Equal(t, "approved", inst2.Status)
	assert.Equal(t, "end_approved", inst2.CurrentStep)
	assert.NotNil(t, inst2.CompletedAt)
}

func TestWorkflowService_LinearApproval_RejectPath(t *testing.T) {
	db := setupWorkflowTestDB(t)
	svc := newWorkflowService(db)
	ctx := context.Background()

	def, err := svc.DefineWorkflow(ctx, 1, 1, "leave", "", leaveApprovalDef())
	require.NoError(t, err)

	inst, err := svc.StartInstance(ctx, 1, def.ID, 7, map[string]interface{}{"leaveDays": float64(1)})
	require.NoError(t, err)

	tasks, err := svc.taskRepo.ListByInstance(ctx, 1, inst.ID)
	require.NoError(t, err)
	require.Len(t, tasks, 1)

	inst2, err := svc.RejectTask(ctx, 1, tasks[0].ID, 42, "no")
	require.NoError(t, err)
	assert.Equal(t, "rejected", inst2.Status)
	assert.Equal(t, "end_rejected", inst2.CurrentStep)
}

func TestWorkflowService_TaskAuthorization(t *testing.T) {
	db := setupWorkflowTestDB(t)
	svc := newWorkflowService(db)
	ctx := context.Background()

	def, err := svc.DefineWorkflow(ctx, 1, 1, "leave", "", leaveApprovalDef())
	require.NoError(t, err)

	inst, err := svc.StartInstance(ctx, 1, def.ID, 7, map[string]interface{}{"leaveDays": float64(1)})
	require.NoError(t, err)

	tasks, err := svc.taskRepo.ListByInstance(ctx, 1, inst.ID)
	require.NoError(t, err)
	require.Len(t, tasks, 1)

	// Wrong user cannot approve.
	_, err = svc.ApproveTask(ctx, 1, tasks[0].ID, 999, "nope")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not assigned to this user")
}

func TestWorkflowService_ConditionalBranch(t *testing.T) {
	db := setupWorkflowTestDB(t)
	svc := newWorkflowService(db)
	ctx := context.Background()

	def, err := svc.DefineWorkflow(ctx, 1, 1, "cond", "", conditionalDef())
	require.NoError(t, err)

	t.Run("short leave skips director", func(t *testing.T) {
		inst, err := svc.StartInstance(ctx, 1, def.ID, 7, map[string]interface{}{"leaveDays": float64(2)})
		require.NoError(t, err)

		tasks, err := svc.taskRepo.ListByInstance(ctx, 1, inst.ID)
		require.NoError(t, err)
		require.Len(t, tasks, 1) // only manager_approve

		inst2, err := svc.ApproveTask(ctx, 1, tasks[0].ID, 42, "ok")
		require.NoError(t, err)
		assert.Equal(t, "approved", inst2.Status)
	})

	t.Run("long leave routes through director", func(t *testing.T) {
		inst, err := svc.StartInstance(ctx, 1, def.ID, 7, map[string]interface{}{"leaveDays": float64(5)})
		require.NoError(t, err)

		tasks, err := svc.taskRepo.ListByInstance(ctx, 1, inst.ID)
		require.NoError(t, err)
		require.Len(t, tasks, 1) // manager first

		inst2, err := svc.ApproveTask(ctx, 1, tasks[0].ID, 42, "ok")
		require.NoError(t, err)
		assert.Equal(t, "running", inst2.Status)
		assert.Equal(t, "director_approve", inst2.CurrentStep)

		// Now a second task for the director exists.
		tasks2, err := svc.taskRepo.ListByInstance(ctx, 1, inst.ID)
		require.NoError(t, err)
		assert.Len(t, tasks2, 2)

		inst3, err := svc.ApproveTask(ctx, 1, tasks2[1].ID, 42, "ok")
		require.NoError(t, err)
		assert.Equal(t, "approved", inst3.Status)
	})
}

func TestWorkflowService_CancelInstance(t *testing.T) {
	db := setupWorkflowTestDB(t)
	svc := newWorkflowService(db)
	ctx := context.Background()

	def, err := svc.DefineWorkflow(ctx, 1, 1, "leave", "", leaveApprovalDef())
	require.NoError(t, err)

	inst, err := svc.StartInstance(ctx, 1, def.ID, 7, map[string]interface{}{"leaveDays": float64(1)})
	require.NoError(t, err)

	// Non-creator, non-admin cannot cancel.
	err = svc.CancelInstance(ctx, 1, inst.ID, 999, false)
	require.Error(t, err)

	// Creator can cancel.
	err = svc.CancelInstance(ctx, 1, inst.ID, 7, false)
	require.NoError(t, err)

	// Cannot cancel twice.
	err = svc.CancelInstance(ctx, 1, inst.ID, 7, false)
	require.Error(t, err)
}
