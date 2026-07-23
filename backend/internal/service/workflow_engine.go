package service

import (
	"context"
	"errors"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

// WorkflowEngine handles workflow operations
type WorkflowEngine struct {
	wfDefRepo     *repository.WorkflowDefinitionRepository
	wfInstRepo    *repository.WorkflowInstanceRepository
	wfApproveRepo *repository.WorkflowApprovalRepository
}

// NewWorkflowEngine creates a new workflow engine
func NewWorkflowEngine(wfDefRepo *repository.WorkflowDefinitionRepository, wfInstRepo *repository.WorkflowInstanceRepository, wfApproveRepo *repository.WorkflowApprovalRepository) *WorkflowEngine {
	return &WorkflowEngine{
		wfDefRepo:     wfDefRepo,
		wfInstRepo:    wfInstRepo,
		wfApproveRepo: wfApproveRepo,
	}
}

// StartWorkflow starts a new workflow instance
func (e *WorkflowEngine) StartWorkflow(ctx context.Context, orgID int, workflowCode, businessKey string, startedBy int) (*model.WorkflowInstance, error) {
	inst := &model.WorkflowInstance{
		OrgID:        orgID,
		WorkflowCode: workflowCode,
		BusinessKey:  businessKey,
		StartedBy:    startedBy,
		Status:       "running",
	}
	err := e.wfInstRepo.Create(ctx, inst)
	if err != nil {
		return nil, err
	}
	return inst, nil
}

// Approve approves or rejects a workflow approval
func (e *WorkflowEngine) Approve(ctx context.Context, instanceID, approverID int, action, comment string) error {
	approval, err := e.wfApproveRepo.GetPendingByUserAndInstance(ctx, instanceID, approverID)
	if err != nil {
		return err
	}
	if approval == nil {
		return errors.New("no pending approval found")
	}

	status := "approved"
	if action == "reject" {
		status = "rejected"
	}

	return e.wfApproveRepo.UpdateApproval(ctx, approval.ID, status, action, comment)
}
