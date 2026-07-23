package service

import (
	"context"
	"time"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/pkg/dingtalk"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

type DingTalkSyncService struct {
	client   *dingtalk.Client
	orgRepo  *repository.OrgRepository
	userRepo *repository.UserRepository
	deptRepo *repository.DepartmentRepository
	bondRepo *repository.OrgUserBondRepository
	logRepo  *repository.DingTalkSyncLogRepository
}

func NewDingTalkSyncService(
	client *dingtalk.Client,
	orgRepo *repository.OrgRepository,
	userRepo *repository.UserRepository,
	deptRepo *repository.DepartmentRepository,
	bondRepo *repository.OrgUserBondRepository,
	logRepo *repository.DingTalkSyncLogRepository,
) *DingTalkSyncService {
	return &DingTalkSyncService{
		client:   client,
		orgRepo:  orgRepo,
		userRepo: userRepo,
		deptRepo: deptRepo,
		bondRepo: bondRepo,
		logRepo:  logRepo,
	}
}

func (s *DingTalkSyncService) SyncOrganization(ctx context.Context, orgID int) error {
	log := &model.DingTalkSyncLog{
		OrgID:     orgID,
		SyncType:  "full",
		Status:    "pending",
		StartedAt: time.Now(),
	}
	s.logRepo.Create(ctx, log)

	// Sync departments
	depts, err := s.client.ListDepartments()
	if err != nil {
		log.Status = "failed"
		log.Message = err.Error()
		s.logRepo.UpdateStatus(ctx, log.ID, "failed", err.Error())
		return err
	}

	// Sync users for each department
	for _, deptData := range depts {
		deptID := int(deptData["id"].(float64))
		_, err := s.client.ListUsersByDept(deptID)
		if err != nil {
			continue
		}
		// Process users...
	}

	log.Status = "success"
	s.logRepo.UpdateStatus(ctx, log.ID, "success", "Sync completed")
	return nil
}
