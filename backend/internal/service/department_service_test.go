package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

func TestDepartmentService_CreateDept(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM departments")
		db.Exec("DELETE FROM orgs")
	}()

	org := &model.Org{Name: "Test Org"}
	err := db.Create(org).Error
	require.NoError(t, err)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)

	deptService := NewDepartmentService(deptRepo, bondRepo)

	testCases := []struct {
		name    string
		dept    *model.Department
		wantErr bool
	}{
		{
			name: "Valid department with parent",
			dept: &model.Department{
				OrgID:       org.ID,
				Name:        "Engineering",
				ParentID:    nil,
				Level:       1,
				Description: "Engineering department",
			},
			wantErr: false,
		},
		{
			name: "Valid department without parent",
			dept: &model.Department{
				OrgID:       org.ID,
				Name:        "Marketing",
				ParentID:    nil,
				Level:       1,
				Description: "Marketing department",
			},
			wantErr: false,
		},
		{
			name: "Department with empty description",
			dept: &model.Department{
				OrgID:       org.ID,
				Name:        "Sales",
				ParentID:    nil,
				Level:       1,
				Description: "",
			},
			wantErr: false,
		},
		{
			name: "Nested department with parent ID",
			dept: &model.Department{
				OrgID:       org.ID,
				Name:        "Backend Team",
				ParentID:    deptIntPtr(1),
				Level:       2,
				Description: "Backend engineering team",
			},
			wantErr: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			dept, err := deptService.CreateDept(ctx, tc.dept)

			if tc.wantErr {
				assert.Error(t, err)
				assert.Nil(t, dept)
			} else {
				require.NoError(t, err)
				assert.NotNil(t, dept)
				assert.NotZero(t, dept.ID)
				assert.Equal(t, tc.dept.OrgID, dept.OrgID)
				assert.Equal(t, tc.dept.Name, dept.Name)
				assert.Equal(t, tc.dept.Description, dept.Description)
				assert.Equal(t, tc.dept.Level, dept.Level)
			}
		})
	}
}

func TestDepartmentService_GetDeptByID(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM departments")
		db.Exec("DELETE FROM orgs")
	}()

	org := &model.Org{Name: "Test Org"}
	err := db.Create(org).Error
	require.NoError(t, err)

	parentID := 1
	dept := &model.Department{
		OrgID:       org.ID,
		Name:        "Engineering",
		ParentID:    &parentID,
		Level:       2,
		Description: "Engineering department",
	}
	err = db.Create(dept).Error
	require.NoError(t, err)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)

	deptService := NewDepartmentService(deptRepo, bondRepo)

	testCases := []struct {
		name    string
		deptID  int
		wantErr bool
		wantNil bool
	}{
		{
			name:    "Valid department ID",
			deptID:  dept.ID,
			wantErr: false,
			wantNil: false,
		},
		{
			name:    "Non-existent department ID",
			deptID:  99999,
			wantErr: false,
			wantNil: true,
		},
		{
			name:    "Zero ID",
			deptID:  0,
			wantErr: false,
			wantNil: true,
		},
		{
			name:    "Negative ID",
			deptID:  -1,
			wantErr: false,
			wantNil: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			result, err := deptService.GetDeptByID(ctx, tc.deptID)

			if tc.wantErr {
				assert.Error(t, err)
			} else {
				if tc.wantNil {
					assert.Nil(t, result)
				} else {
					require.NoError(t, err)
					assert.NotNil(t, result)
					assert.Equal(t, dept.ID, result.ID)
					assert.Equal(t, dept.Name, result.Name)
					assert.Equal(t, dept.OrgID, result.OrgID)
					assert.Equal(t, dept.Description, result.Description)
					if result.ParentID != nil {
						assert.Equal(t, *dept.ParentID, *result.ParentID)
					}
				}
			}
		})
	}
}

func TestDepartmentService_GetDeptsByOrgID(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM departments")
		db.Exec("DELETE FROM orgs")
	}()

	org1 := &model.Org{Name: "Org 1"}
	err := db.Create(org1).Error
	require.NoError(t, err)

	org2 := &model.Org{Name: "Org 2"}
	err = db.Create(org2).Error
	require.NoError(t, err)

	depts := []*model.Department{
		{OrgID: org1.ID, Name: "Dept 1A", Level: 1},
		{OrgID: org1.ID, Name: "Dept 1B", Level: 1},
		{OrgID: org1.ID, Name: "Dept 1C", Level: 2},
		{OrgID: org2.ID, Name: "Dept 2A", Level: 1},
		{OrgID: org2.ID, Name: "Dept 2B", Level: 1},
	}
	for _, dept := range depts {
		err = db.Create(dept).Error
		require.NoError(t, err)
	}

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)

	deptService := NewDepartmentService(deptRepo, bondRepo)

	testCases := []struct {
		name     string
		orgID    int
		expected int
	}{
		{
			name:     "Org 1 departments",
			orgID:    org1.ID,
			expected: 3,
		},
		{
			name:     "Org 2 departments",
			orgID:    org2.ID,
			expected: 2,
		},
		{
			name:     "Non-existent org",
			orgID:    99999,
			expected: 0,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			result, err := deptService.GetDeptsByOrgID(ctx, tc.orgID)

			require.NoError(t, err)
			assert.Len(t, result, tc.expected)
		})
	}
}

func TestDepartmentService_GetDeptsByOrgID_Empty(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM departments")
		db.Exec("DELETE FROM orgs")
	}()

	org := &model.Org{Name: "Empty Org"}
	err := db.Create(org).Error
	require.NoError(t, err)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)

	deptService := NewDepartmentService(deptRepo, bondRepo)

	ctx := context.Background()
	result, err := deptService.GetDeptsByOrgID(ctx, org.ID)

	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 0)
}

func TestDepartmentService_UpdateDept(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM departments")
		db.Exec("DELETE FROM orgs")
	}()

	org := &model.Org{Name: "Test Org"}
	err := db.Create(org).Error
	require.NoError(t, err)

	dept := &model.Department{
		OrgID:       org.ID,
		Name:        "Original Name",
		Description: "Original Description",
		Level:       1,
	}
	err = db.Create(dept).Error
	require.NoError(t, err)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)

	deptService := NewDepartmentService(deptRepo, bondRepo)

	testCases := []struct {
		name    string
		updates *model.Department
		wantErr bool
	}{
		{
			name: "Update name only",
			updates: &model.Department{
				ID:          dept.ID,
				OrgID:       org.ID,
				Name:        "Updated Name",
				Description: "Original Description",
				Level:       1,
			},
			wantErr: false,
		},
		{
			name: "Update description only",
			updates: &model.Department{
				ID:          dept.ID,
				OrgID:       org.ID,
				Name:        "Updated Name",
				Description: "Updated Description",
				Level:       1,
			},
			wantErr: false,
		},
		{
			name: "Update level",
			updates: &model.Department{
				ID:          dept.ID,
				OrgID:       org.ID,
				Name:        "Updated Name",
				Description: "Updated Description",
				Level:       2,
			},
			wantErr: false,
		},
		{
			name: "Update with parent ID",
			updates: &model.Department{
				ID:          dept.ID,
				OrgID:       org.ID,
				Name:        "Updated Name",
				Description: "Updated Description",
				Level:       2,
				ParentID:    deptIntPtr(999),
			},
			wantErr: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			err := deptService.UpdateDept(ctx, tc.updates)

			if tc.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)

				updated, getErr := deptService.GetDeptByID(ctx, tc.updates.ID)
				require.NoError(t, getErr)
				assert.Equal(t, tc.updates.Name, updated.Name)
				assert.Equal(t, tc.updates.Description, updated.Description)
				assert.Equal(t, tc.updates.Level, updated.Level)
			}
		})
	}
}

func TestDepartmentService_DeleteDept(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM departments")
		db.Exec("DELETE FROM orgs")
	}()

	org := &model.Org{Name: "Test Org"}
	err := db.Create(org).Error
	require.NoError(t, err)

	dept := &model.Department{
		OrgID: org.ID,
		Name:  "To Be Deleted",
		Level: 1,
	}
	err = db.Create(dept).Error
	require.NoError(t, err)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)

	deptService := NewDepartmentService(deptRepo, bondRepo)

	testCases := []struct {
		name    string
		deptID  int
		wantErr bool
	}{
		{
			name:    "Delete existing department",
			deptID:  dept.ID,
			wantErr: false,
		},
		{
			name:    "Delete non-existent department",
			deptID:  99999,
			wantErr: false,
		},
		{
			name:    "Delete with zero ID",
			deptID:  0,
			wantErr: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			err := deptService.DeleteDept(ctx, tc.deptID)

			if tc.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				deleted, getErr := deptService.GetDeptByID(ctx, tc.deptID)
				assert.NoError(t, getErr)
				assert.Nil(t, deleted)
			}
		})
	}
}

func TestDepartmentService_SetManager(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM departments")
		db.Exec("DELETE FROM org_user_bonds")
		db.Exec("DELETE FROM users")
		db.Exec("DELETE FROM orgs")
	}()

	org := &model.Org{Name: "Test Org"}
	err := db.Create(org).Error
	require.NoError(t, err)

	user := &model.User{
		Phone: "13800138000",
		Name:  "Test Manager",
	}
	err = db.Create(user).Error
	require.NoError(t, err)

	dept := &model.Department{
		OrgID: org.ID,
		Name:  "Engineering",
		Level: 1,
	}
	err = db.Create(dept).Error
	require.NoError(t, err)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)

	deptService := NewDepartmentService(deptRepo, bondRepo)

	testCases := []struct {
		name           string
		deptID         int
		managerUserID  int
		wantErr        bool
		verifyManager  bool
		expectedMgrID  int
	}{
		{
			name:          "Set valid manager",
			deptID:        dept.ID,
			managerUserID: user.ID,
			wantErr:       false,
			verifyManager: true,
			expectedMgrID: user.ID,
		},
		{
			name:          "Set manager to different user",
			deptID:        dept.ID,
			managerUserID: user.ID,
			wantErr:       false,
			verifyManager: true,
			expectedMgrID: user.ID,
		},
		{
			name:          "Set manager for non-existent department",
			deptID:        99999,
			managerUserID: user.ID,
			wantErr:       false,
			verifyManager: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			err := deptService.SetManager(ctx, tc.deptID, tc.managerUserID)

			if tc.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				if tc.verifyManager {
					updated, getErr := deptService.GetDeptByID(ctx, tc.deptID)
					require.NoError(t, getErr)
					require.NotNil(t, updated.ManagerUserID)
					assert.Equal(t, tc.expectedMgrID, *updated.ManagerUserID)
				}
			}
		})
	}
}

func TestDepartmentService_CreateDept_SpecialCharacters(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM departments")
		db.Exec("DELETE FROM orgs")
	}()

	org := &model.Org{Name: "Test Org"}
	err := db.Create(org).Error
	require.NoError(t, err)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)

	deptService := NewDepartmentService(deptRepo, bondRepo)

	testCases := []struct {
		name string
		dept *model.Department
	}{
		{
			name: "Unicode characters in name",
			dept: &model.Department{
				OrgID:       org.ID,
				Name:        "技术部 🛠️",
				Description: "负责技术开发 💻",
				Level:       1,
			},
		},
		{
			name: "SQL injection attempt",
			dept: &model.Department{
				OrgID:       org.ID,
				Name:        "'; DROP TABLE departments; --",
				Description: "Testing SQL injection prevention",
				Level:       1,
			},
		},
		{
			name: "HTML tags in name",
			dept: &model.Department{
				OrgID:       org.ID,
				Name:        "<script>alert('xss')</script>Dept",
				Description: "<b>Bold</b> description",
				Level:       1,
			},
		},
		{
			name: "Very long name and description",
			dept: &model.Department{
				OrgID:       org.ID,
				Name:        "This is a very long department name that tests the system's ability to handle lengthy text inputs without truncation or errors occurring during database operations and retrieval",
				Description: "This is an even longer description that contains multiple sentences to thoroughly test the text handling capabilities of the database layer and ensure no data loss occurs during storage and retrieval operations",
				Level:       1,
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			dept, err := deptService.CreateDept(ctx, tc.dept)

			require.NoError(t, err)
			assert.NotNil(t, dept)
			assert.Equal(t, tc.dept.Name, dept.Name)
			assert.Equal(t, tc.dept.Description, dept.Description)
		})
	}
}

func TestDepartmentService_MultipleDeptsInOrg(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM departments")
		db.Exec("DELETE FROM orgs")
	}()

	org := &model.Org{Name: "Test Org"}
	err := db.Create(org).Error
	require.NoError(t, err)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)

	deptService := NewDepartmentService(deptRepo, bondRepo)

	ctx := context.Background()

	dept1, err := deptService.CreateDept(ctx, &model.Department{
		OrgID: org.ID, Name: "Engineering", Level: 1,
	})
	require.NoError(t, err)

	dept2, err := deptService.CreateDept(ctx, &model.Department{
		OrgID: org.ID, Name: "Marketing", Level: 1,
	})
	require.NoError(t, err)

	dept3, err := deptService.CreateDept(ctx, &model.Department{
		OrgID: org.ID, Name: "Sales", Level: 1,
	})
	require.NoError(t, err)

	allDepts, err := deptService.GetDeptsByOrgID(ctx, org.ID)
	require.NoError(t, err)
	assert.Len(t, allDepts, 3)

	deptNames := make(map[string]bool)
	for _, d := range allDepts {
		deptNames[d.Name] = true
	}
	assert.True(t, deptNames["Engineering"])
	assert.True(t, deptNames["Marketing"])
	assert.True(t, deptNames["Sales"])

	err = deptService.DeleteDept(ctx, dept2.ID)
	require.NoError(t, err)

	remainingDepts, err := deptService.GetDeptsByOrgID(ctx, org.ID)
	require.NoError(t, err)
	assert.Len(t, remainingDepts, 2)

	err = deptService.DeleteDept(ctx, dept1.ID)
	require.NoError(t, err)
	err = deptService.DeleteDept(ctx, dept3.ID)
	require.NoError(t, err)

	finalDepts, err := deptService.GetDeptsByOrgID(ctx, org.ID)
	require.NoError(t, err)
	assert.Len(t, finalDepts, 0)
}

func TestDepartmentService_HierarchicalStructure(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM departments")
		db.Exec("DELETE FROM orgs")
	}()

	org := &model.Org{Name: "Test Org"}
	err := db.Create(org).Error
	require.NoError(t, err)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)

	deptService := NewDepartmentService(deptRepo, bondRepo)

	ctx := context.Background()

	root, err := deptService.CreateDept(ctx, &model.Department{
		OrgID: org.ID, Name: "Company", Level: 1,
	})
	require.NoError(t, err)

	engineering, err := deptService.CreateDept(ctx, &model.Department{
		OrgID:    org.ID,
		Name:     "Engineering",
		ParentID: &root.ID,
		Level:    2,
	})
	require.NoError(t, err)

	backend, err := deptService.CreateDept(ctx, &model.Department{
		OrgID:    org.ID,
		Name:     "Backend",
		ParentID: &engineering.ID,
		Level:    3,
	})
	require.NoError(t, err)

	frontend, err := deptService.CreateDept(ctx, &model.Department{
		OrgID:    org.ID,
		Name:     "Frontend",
		ParentID: &engineering.ID,
		Level:    3,
	})
	require.NoError(t, err)

	allDepts, err := deptService.GetDeptsByOrgID(ctx, org.ID)
	require.NoError(t, err)
	assert.Len(t, allDepts, 4)

	retrievedBackend, err := deptService.GetDeptByID(ctx, backend.ID)
	require.NoError(t, err)
	require.NotNil(t, retrievedBackend.ParentID)
	assert.Equal(t, engineering.ID, *retrievedBackend.ParentID)
	assert.Equal(t, 3, retrievedBackend.Level)

	err = deptService.UpdateDept(ctx, &model.Department{
		ID:       frontend.ID,
		OrgID:    org.ID,
		Name:     "Frontend & Mobile",
		ParentID: &engineering.ID,
		Level:    3,
	})
	require.NoError(t, err)

	updatedFrontend, err := deptService.GetDeptByID(ctx, frontend.ID)
	require.NoError(t, err)
	assert.Equal(t, "Frontend & Mobile", updatedFrontend.Name)
}

func TestDepartmentService_SetManager_Integration(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM departments")
		db.Exec("DELETE FROM org_user_bonds")
		db.Exec("DELETE FROM users")
		db.Exec("DELETE FROM orgs")
	}()

	org := &model.Org{Name: "Test Org"}
	err := db.Create(org).Error
	require.NoError(t, err)

	user1 := &model.User{Phone: "13800138000", Name: "Manager 1"}
	err = db.Create(user1).Error
	require.NoError(t, err)

	user2 := &model.User{Phone: "13800138001", Name: "Manager 2"}
	err = db.Create(user2).Error
	require.NoError(t, err)

	dept := &model.Department{
		OrgID: org.ID,
		Name:  "Engineering",
		Level: 1,
	}
	err = db.Create(dept).Error
	require.NoError(t, err)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)

	deptService := NewDepartmentService(deptRepo, bondRepo)

	ctx := context.Background()

	err = deptService.SetManager(ctx, dept.ID, user1.ID)
	require.NoError(t, err)

	updated, err := deptService.GetDeptByID(ctx, dept.ID)
	require.NoError(t, err)
	require.NotNil(t, updated.ManagerUserID)
	assert.Equal(t, user1.ID, *updated.ManagerUserID)

	err = deptService.SetManager(ctx, dept.ID, user2.ID)
	require.NoError(t, err)

	updated, err = deptService.GetDeptByID(ctx, dept.ID)
	require.NoError(t, err)
	require.NotNil(t, updated.ManagerUserID)
	assert.Equal(t, user2.ID, *updated.ManagerUserID)
}

func TestDepartmentService_CreateAndUpdate_Integration(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM departments")
		db.Exec("DELETE FROM orgs")
	}()

	org := &model.Org{Name: "Test Org"}
	err := db.Create(org).Error
	require.NoError(t, err)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)

	deptService := NewDepartmentService(deptRepo, bondRepo)

	ctx := context.Background()

	created, err := deptService.CreateDept(ctx, &model.Department{
		OrgID:       org.ID,
		Name:        "Initial Name",
		Description: "Initial Description",
		Level:       1,
	})
	require.NoError(t, err)
	assert.NotNil(t, created)

	fetched, err := deptService.GetDeptByID(ctx, created.ID)
	require.NoError(t, err)
	assert.NotNil(t, fetched)
	assert.Equal(t, "Initial Name", fetched.Name)

	allDepts, err := deptService.GetDeptsByOrgID(ctx, org.ID)
	require.NoError(t, err)
	assert.Len(t, allDepts, 1)

	err = deptService.UpdateDept(ctx, &model.Department{
		ID:          created.ID,
		OrgID:       org.ID,
		Name:        "Updated Name",
		Description: "Updated Description",
		Level:       1,
	})
	require.NoError(t, err)

	updated, err := deptService.GetDeptByID(ctx, created.ID)
	require.NoError(t, err)
	assert.Equal(t, "Updated Name", updated.Name)
	assert.Equal(t, "Updated Description", updated.Description)

	err = deptService.DeleteDept(ctx, created.ID)
	require.NoError(t, err)

	deleted, err := deptService.GetDeptByID(ctx, created.ID)
	assert.NoError(t, err)
	assert.Nil(t, deleted)
}

func TestDepartmentService_NewDepartmentService(t *testing.T) {
	db := setupTestDB(t)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)

	deptService := NewDepartmentService(deptRepo, bondRepo)

	assert.NotNil(t, deptService)
}

func deptIntPtr(i int) *int {
	return &i
}
