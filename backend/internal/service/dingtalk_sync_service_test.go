package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/pkg/dingtalk"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

// stubDingTalkClient is a test double for the DingTalk client.
type stubDingTalkClient struct {
	depts []dingtalk.Department
	users map[int][]dingtalk.DeptUser // dept id → users
	err   error
}

func (s *stubDingTalkClient) ListDepartments() ([]dingtalk.Department, error) {
	return s.depts, s.err
}

func (s *stubDingTalkClient) ListUsersByDept(deptID int) ([]dingtalk.DeptUser, error) {
	return s.users[deptID], nil
}

// syncTestDB extends setupTestDB with the sync log table.
func syncTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db := setupTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.DingTalkSyncLog{}))
	return db
}

func newSyncService(t *testing.T, client dingtalkSyncSource) (*DingTalkSyncService, *gorm.DB) {
	t.Helper()
	db := syncTestDB(t)
	svc := &DingTalkSyncService{
		client:   client,
		orgRepo:  repository.NewOrgRepository(db),
		userRepo: repository.NewUserRepository(db),
		deptRepo: repository.NewDepartmentRepository(db),
		bondRepo: repository.NewOrgUserBondRepository(db),
		logRepo:  repository.NewDingTalkSyncLogRepository(db),
	}
	return svc, db
}

func TestSyncOrganization_CreatesDepartmentsUsersBonds(t *testing.T) {
	// Hierarchy: root (1) → child (2). Two users in child.
	client := &stubDingTalkClient{
		depts: []dingtalk.Department{
			{ID: 1, Name: "Root", ParentID: 0},
			{ID: 2, Name: "Engineering", ParentID: 1},
		},
		users: map[int][]dingtalk.DeptUser{
			2: {
				{UserID: "u1", Name: "Alice", Mobile: "13800000001", Title: "Engineer"},
				{UserID: "u2", Name: "Bob", Mobile: "13800000002"},
			},
		},
	}
	svc, db := newSyncService(t, client)

	// Seed the org the sync targets.
	require.NoError(t, db.Create(&model.Org{ID: 1, Name: "Acme"}).Error)

	stats, err := svc.SyncOrganization(context.Background(), 1)
	require.NoError(t, err)
	assert.Equal(t, 2, stats.Departments)
	assert.Equal(t, 2, stats.Users)
	assert.Equal(t, 2, stats.Bonds)

	// Department parent/level resolved correctly.
	var child model.Department
	require.NoError(t, db.Where("dingtalk_dept_id = ?", 2).First(&child).Error)
	assert.Equal(t, "Engineering", child.Name)
	require.NotNil(t, child.ParentID)
	assert.Equal(t, 2, child.Level) // parent level 1 → child level 2

	// Users created with dingtalk_userid bound.
	var users []model.User
	require.NoError(t, db.Find(&users).Error)
	require.Len(t, users, 2)

	// Bonds created for the right org.
	var bonds []model.OrgUserBond
	require.NoError(t, db.Where("org_id = ?", 1).Find(&bonds).Error)
	require.Len(t, bonds, 2)
	for _, b := range bonds {
		assert.Equal(t, 1, b.OrgID)
		require.NotNil(t, b.DepartmentID)
		assert.Equal(t, child.ID, *b.DepartmentID) // bound to their dept
	}
}

func TestSyncOrganization_IdempotentReSync(t *testing.T) {
	client := &stubDingTalkClient{
		depts: []dingtalk.Department{{ID: 1, Name: "Root", ParentID: 0}},
		users: map[int][]dingtalk.DeptUser{
			1: {{UserID: "u1", Name: "Alice"}},
		},
	}
	svc, db := newSyncService(t, client)
	require.NoError(t, db.Create(&model.Org{ID: 1, Name: "Acme"}).Error)

	// First sync.
	_, err := svc.SyncOrganization(context.Background(), 1)
	require.NoError(t, err)

	// Second sync — should not duplicate.
	stats, err := svc.SyncOrganization(context.Background(), 1)
	require.NoError(t, err)
	assert.Equal(t, 1, stats.Departments)
	assert.Equal(t, 1, stats.Users)
	assert.Equal(t, 1, stats.Bonds)

	var depts []model.Department
	require.NoError(t, db.Find(&depts).Error)
	assert.Len(t, depts, 1)

	var users []model.User
	require.NoError(t, db.Find(&users).Error)
	assert.Len(t, users, 1)

	var bonds []model.OrgUserBond
	require.NoError(t, db.Where("org_id = ?", 1).Find(&bonds).Error)
	assert.Len(t, bonds, 1)
}

func TestSyncOrganization_ClientError_FailsAndLogs(t *testing.T) {
	client := &stubDingTalkClient{
		err: context.DeadlineExceeded,
	}
	svc, db := newSyncService(t, client)
	require.NoError(t, db.Create(&model.Org{ID: 1, Name: "Acme"}).Error)

	_, err := svc.SyncOrganization(context.Background(), 1)
	require.Error(t, err)

	// Sync log recorded as failed.
	var log model.DingTalkSyncLog
	require.NoError(t, db.First(&log).Error)
	assert.Equal(t, "failed", log.Status)
}

func TestSyncOrganization_UpdatesChangedDepartmentName(t *testing.T) {
	client := &stubDingTalkClient{
		depts: []dingtalk.Department{{ID: 1, Name: "Old Name", ParentID: 0}},
	}
	svc, db := newSyncService(t, client)
	require.NoError(t, db.Create(&model.Org{ID: 1, Name: "Acme"}).Error)

	// First sync creates "Old Name".
	_, err := svc.SyncOrganization(context.Background(), 1)
	require.NoError(t, err)

	// Rename in DingTalk and resync.
	client.depts[0].Name = "New Name"
	stats, err := svc.SyncOrganization(context.Background(), 1)
	require.NoError(t, err)
	assert.Equal(t, 1, stats.Departments)

	var dept model.Department
	require.NoError(t, db.Where("dingtalk_dept_id = ?", 1).First(&dept).Error)
	assert.Equal(t, "New Name", dept.Name)
}
