package model_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/xrl/suzuran-cloud/internal/model"
)

// --- WorkflowDefinition ---

func TestWorkflowDefinitionTableName(t *testing.T) {
	assert.Equal(t, "workflow_definitions", model.WorkflowDefinition{}.TableName())
}

func TestWorkflowDefinitionJSONBField(t *testing.T) {
	wd := model.WorkflowDefinition{
		ID:         1,
		OrgID:      10,
		Name:       "Leave Approval",
		Code:       "leave_approval",
		Definition: model.JSONB{"nodes": 3, "edges": 2},
	}

	b, err := json.Marshal(&wd)
	assert.NoError(t, err)

	var m map[string]interface{}
	err = json.Unmarshal(b, &m)
	assert.NoError(t, err)

	assert.Equal(t, "Leave Approval", m["name"])
	assert.Equal(t, "leave_approval", m["code"])

	def, ok := m["definition"]
	assert.True(t, ok)
	defMap, ok := def.(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, float64(3), defMap["nodes"])
}

// --- WorkflowInstance ---

func TestWorkflowInstanceTableName(t *testing.T) {
	assert.Equal(t, "workflow_instances", model.WorkflowInstance{}.TableName())
}

func TestWorkflowInstanceStatusDefaults(t *testing.T) {
	var wi model.WorkflowInstance
	// Go zero value is empty string; GORM default is "running"
	assert.Empty(t, wi.Status)
}

func TestWorkflowInstanceStatusValues(t *testing.T) {
	wi := model.WorkflowInstance{Status: "running"}
	assert.Equal(t, "running", wi.Status)

	wi.Status = "completed"
	assert.Equal(t, "completed", wi.Status)

	wi.Status = "cancelled"
	assert.Equal(t, "cancelled", wi.Status)
}

func TestWorkflowInstanceCompletedAtPointer(t *testing.T) {
	wi := model.WorkflowInstance{ID: 1}
	assert.Nil(t, wi.CompletedAt)

	now := time.Now()
	wi.CompletedAt = &now
	assert.NotNil(t, wi.CompletedAt)
	assert.Equal(t, now, *wi.CompletedAt)
}

func TestWorkflowInstanceJSONFieldNames(t *testing.T) {
	now := time.Now()
	wi := model.WorkflowInstance{
		ID:           1,
		OrgID:        10,
		WorkflowCode: "leave_approval",
		BusinessKey:  "FORM-001",
		CurrentNode:  "manager_approve",
		Status:       "running",
		StartedBy:    5,
		StartedAt:    now,
		CompletedAt:  nil,
	}

	b, err := json.Marshal(&wi)
	assert.NoError(t, err)

	var m map[string]interface{}
	err = json.Unmarshal(b, &m)
	assert.NoError(t, err)

	assert.Equal(t, "leave_approval", m["workflowCode"])
	assert.Equal(t, "FORM-001", m["businessKey"])
	assert.Equal(t, "manager_approve", m["currentNode"])
	assert.Equal(t, "running", m["status"])
	assert.Equal(t, float64(5), m["startedBy"])
}

// --- WorkflowApproval ---

func TestWorkflowApprovalTableName(t *testing.T) {
	assert.Equal(t, "workflow_approvals", model.WorkflowApproval{}.TableName())
}

func TestWorkflowApprovalStatusField(t *testing.T) {
	var wa model.WorkflowApproval
	assert.Empty(t, wa.Status)

	wa.Status = "pending"
	assert.Equal(t, "pending", wa.Status)

	wa.Status = "approved"
	assert.Equal(t, "approved", wa.Status)

	wa.Status = "rejected"
	assert.Equal(t, "rejected", wa.Status)
}

func TestWorkflowApprovalProcessedAtPointer(t *testing.T) {
	wa := model.WorkflowApproval{ID: 1}
	assert.Nil(t, wa.ProcessedAt)

	now := time.Now()
	wa.ProcessedAt = &now
	assert.NotNil(t, wa.ProcessedAt)
	assert.Equal(t, now, *wa.ProcessedAt)
}

func TestWorkflowApprovalJSONFieldNames(t *testing.T) {
	now := time.Now()
	wa := model.WorkflowApproval{
		ID:          1,
		OrgID:       10,
		InstanceID:  100,
		NodeKey:     "manager_node",
		ApproverID:  5,
		Status:      "approved",
		Action:      "approve",
		Comment:     "Looks good",
		ProcessedAt: &now,
		CreatedAt:   now,
	}

	b, err := json.Marshal(&wa)
	assert.NoError(t, err)

	var m map[string]interface{}
	err = json.Unmarshal(b, &m)
	assert.NoError(t, err)

	assert.Equal(t, float64(100), m["instanceId"])
	assert.Equal(t, "manager_node", m["nodeKey"])
	assert.Equal(t, float64(5), m["approverId"])
	assert.Equal(t, "approved", m["status"])
	assert.Equal(t, "approve", m["action"])
	assert.Equal(t, "Looks good", m["comment"])
}
