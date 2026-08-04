package service

import (
	"context"
	"fmt"
	"time"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/pkg/dingtalk"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

// dingtalkSyncSource is the subset of the DingTalk client the sync service
// depends on. *dingtalk.Client implements it; tests pass a stub.
type dingtalkSyncSource interface {
	ListDepartments() ([]dingtalk.Department, error)
	ListUsersByDept(deptID int) ([]dingtalk.DeptUser, error)
}

// DingTalkSyncService synchronizes an organization's departments and users
// from DingTalk into the platform's multi-tenant tables.
type DingTalkSyncService struct {
	client   dingtalkSyncSource
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

// SyncStats holds counts from a completed sync run.
type SyncStats struct {
	Departments int `json:"departments"`
	Users       int `json:"users"`
	Bonds       int `json:"bonds"`
}

// SyncOrganization pulls the DingTalk org structure (departments + users per
// department) and upserts it into the platform for orgID. It is idempotent:
// departments match on (org_id, dingtalk_dept_id), users on dingtalk_userid,
// bonds on (org_id, user_id).
func (s *DingTalkSyncService) SyncOrganization(ctx context.Context, orgID int) (*SyncStats, error) {
	log := &model.DingTalkSyncLog{
		OrgID:     orgID,
		SyncType:  "full",
		Status:    "pending",
		StartedAt: time.Now(),
	}
	if err := s.logRepo.Create(ctx, log); err != nil {
		return nil, fmt.Errorf("failed to create sync log: %w", err)
	}

	stats, err := s.doSync(ctx, orgID)
	if err != nil {
		_ = s.logRepo.UpdateStatus(ctx, log.ID, "failed", err.Error())
		return nil, err
	}

	_ = s.logRepo.UpdateStatus(ctx, log.ID, "success",
		fmt.Sprintf("synced %d departments, %d users, %d bonds", stats.Departments, stats.Users, stats.Bonds))
	return stats, nil
}

func (s *DingTalkSyncService) doSync(ctx context.Context, orgID int) (*SyncStats, error) {
	depts, err := s.client.ListDepartments()
	if err != nil {
		return nil, fmt.Errorf("list dingtalk departments: %w", err)
	}

	// Sync departments first (parents before children, by ascending id).
	deptMap, err := s.syncDepartments(ctx, orgID, depts)
	if err != nil {
		return nil, err
	}

	// Sync users per department and bind them to the org + department.
	userStats, err := s.syncUsers(ctx, orgID, depts, deptMap)
	if err != nil {
		return nil, err
	}

	userStats.Departments = len(deptMap)
	return userStats, nil
}

// syncDepartments upserts all departments, returning a map of dingtalk dept id → platform department.
func (s *DingTalkSyncService) syncDepartments(ctx context.Context, orgID int, depts []dingtalk.Department) (map[int64]*model.Department, error) {
	deptMap := make(map[int64]*model.Department, len(depts))
	for _, d := range depts {
		existing, err := s.deptRepo.GetByDingTalkDeptID(ctx, orgID, d.ID)
		if err != nil {
			return nil, fmt.Errorf("lookup dept %d: %w", d.ID, err)
		}
		if existing != nil {
			// Update name/level if changed.
			changed := false
			if existing.Name != d.Name {
				existing.Name = d.Name
				changed = true
			}
			// Resolve parent to platform id (0 parent → nil).
			if d.ParentID != 0 {
				if parent, ok := deptMap[d.ParentID]; ok {
					if existing.ParentID == nil || *existing.ParentID != parent.ID {
						existing.ParentID = &parent.ID
						changed = true
					}
				}
			} else if existing.ParentID != nil {
				existing.ParentID = nil
				changed = true
			}
			if changed {
				if err := s.deptRepo.Update(ctx, existing); err != nil {
					return nil, fmt.Errorf("update dept %d: %w", d.ID, err)
				}
			}
			deptMap[d.ID] = existing
			continue
		}

		// Create new department.
		dept := &model.Department{
			OrgID:          orgID,
			Name:           d.Name,
			Level:          1,
			DingtalkDeptID: &d.ID,
		}
		if d.ParentID != 0 {
			if parent, ok := deptMap[d.ParentID]; ok {
				dept.ParentID = &parent.ID
				dept.Level = parent.Level + 1
			}
		}
		if err := s.deptRepo.Create(ctx, dept); err != nil {
			return nil, fmt.Errorf("create dept %d: %w", d.ID, err)
		}
		deptMap[d.ID] = dept
	}
	return deptMap, nil
}

// syncUsers upserts users per department and creates org bonds (and binds
// each user to their first synced department).
func (s *DingTalkSyncService) syncUsers(ctx context.Context, orgID int, depts []dingtalk.Department, deptMap map[int64]*model.Department) (*SyncStats, error) {
	stats := &SyncStats{}
	seenUsers := make(map[string]struct{})

	for _, d := range depts {
		deptUsers, err := s.client.ListUsersByDept(int(d.ID))
		if err != nil {
			return nil, fmt.Errorf("list users in dept %d: %w", d.ID, err)
		}
		platformDept := deptMap[d.ID]

		for _, du := range deptUsers {
			if du.UserID == "" {
				continue
			}
			// Only bind each user once (to their first department).
			if _, seen := seenUsers[du.UserID]; seen {
				continue
			}
			seenUsers[du.UserID] = struct{}{}

			user, err := s.upsertUser(ctx, du)
			if err != nil {
				return nil, err
			}
			if err := s.upsertBond(ctx, orgID, user.ID, platformDept); err != nil {
				return nil, err
			}
			stats.Users++
			stats.Bonds++
		}
	}
	return stats, nil
}

func (s *DingTalkSyncService) upsertUser(ctx context.Context, du dingtalk.DeptUser) (*model.User, error) {
	user, err := s.userRepo.GetByDingTalkUserID(ctx, du.UserID)
	if err != nil {
		return nil, fmt.Errorf("lookup dingtalk user %s: %w", du.UserID, err)
	}
	unionID := strPtrOrNil(du.UnionID)
	if user != nil {
		changed := false
		if user.Name != du.Name && du.Name != "" {
			user.Name = du.Name
			changed = true
		}
		if user.Email != du.Email && du.Email != "" {
			user.Email = du.Email
			changed = true
		}
		if user.Phone != du.Mobile && du.Mobile != "" {
			user.Phone = du.Mobile
			changed = true
		}
		if user.AvatarURL != du.AvatarURL && du.AvatarURL != "" {
			user.AvatarURL = du.AvatarURL
			changed = true
		}
		if user.DingtalkUnionID == nil && unionID != nil {
			user.DingtalkUnionID = unionID
			changed = true
		}
		if changed {
			if err := s.userRepo.Update(ctx, user); err != nil {
				return nil, fmt.Errorf("update dingtalk user %s: %w", du.UserID, err)
			}
		}
		return user, nil
	}

	name := du.Name
	if name == "" {
		name = du.UserID
	}
	user = &model.User{
		Name:            name,
		Email:           du.Email,
		Phone:           du.Mobile,
		AvatarURL:       du.AvatarURL,
		Position:        du.Title,
		DingtalkUserID:  strPtrOrNil(du.UserID),
		DingtalkUnionID: unionID,
	}
	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("create dingtalk user %s: %w", du.UserID, err)
	}
	return user, nil
}

func (s *DingTalkSyncService) upsertBond(ctx context.Context, orgID, userID int, dept *model.Department) error {
	bond, err := s.bondRepo.GetByOrgAndUser(ctx, orgID, userID)
	if err != nil {
		return fmt.Errorf("lookup bond (%d,%d): %w", orgID, userID, err)
	}
	if bond != nil {
		// Update department binding if missing.
		if bond.DepartmentID == nil && dept != nil {
			bond.DepartmentID = &dept.ID
			if err := s.bondRepo.Update(ctx, bond); err != nil {
				return fmt.Errorf("update bond: %w", err)
			}
		}
		return nil
	}
	bond = &model.OrgUserBond{
		OrgID: orgID,
		UserID: userID,
	}
	if dept != nil {
		bond.DepartmentID = &dept.ID
	}
	if err := s.bondRepo.Create(ctx, bond); err != nil {
		return fmt.Errorf("create bond: %w", err)
	}
	return nil
}

// strPtrOrNil returns a *string for non-empty s, or nil.
func strPtrOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
