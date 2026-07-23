package repository_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

func cleanupDepartments() {
	testDB.Exec("DELETE FROM departments")
}

func TestDepartmentRepository_Create(t *testing.T) {
	cleanupDepartments()
	repo := repository.NewDepartmentRepository(testDB)

	t.Run("should create department successfully", func(t *testing.T) {
		dept := &model.Department{
			OrgID:       1,
			Name:        "Engineering",
			Description: "Engineering department",
			Level:       1,
		}
		err := repo.Create(context.Background(), dept)
		require.NoError(t, err)
		assert.NotZero(t, dept.ID)
		assert.Equal(t, "Engineering", dept.Name)
		assert.Equal(t, 1, dept.Level)
	})

	t.Run("should create department with parent", func(t *testing.T) {
		parentID := 1
		dept := &model.Department{
			OrgID:    1,
			Name:     "Backend Team",
			ParentID: &parentID,
			Level:    2,
		}
		err := repo.Create(context.Background(), dept)
		require.NoError(t, err)
		assert.NotNil(t, dept.ParentID)
		assert.Equal(t, parentID, *dept.ParentID)
	})
}

func TestDepartmentRepository_GetByID(t *testing.T) {
	cleanupDepartments()
	repo := repository.NewDepartmentRepository(testDB)

	t.Run("should return department when exists", func(t *testing.T) {
		dept := &model.Department{
			OrgID:       2,
			Name:        "Sales",
			Description: "Sales department",
			Level:       1,
		}
		require.NoError(t, repo.Create(context.Background(), dept))

		result, err := repo.GetByID(context.Background(), dept.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, dept.ID, result.ID)
		assert.Equal(t, "Sales", result.Name)
		assert.Equal(t, "Sales department", result.Description)
	})

	t.Run("should return nil when not found", func(t *testing.T) {
		result, err := repo.GetByID(context.Background(), 9999)
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}

func TestDepartmentRepository_GetByOrgID(t *testing.T) {
	cleanupDepartments()
	repo := repository.NewDepartmentRepository(testDB)

	t.Run("should return all departments for org ordered by level and ID", func(t *testing.T) {
		dept1 := &model.Department{OrgID: 10, Name: "Dept Level 1 A", Level: 1}
		dept2 := &model.Department{OrgID: 10, Name: "Dept Level 1 B", Level: 1}
		dept3 := &model.Department{OrgID: 10, Name: "Dept Level 2 A", Level: 2}

		require.NoError(t, repo.Create(context.Background(), dept1))
		require.NoError(t, repo.Create(context.Background(), dept2))
		require.NoError(t, repo.Create(context.Background(), dept3))

		depts, err := repo.GetByOrgID(context.Background(), 10)
		require.NoError(t, err)
		require.Len(t, depts, 3)
		// Should be ordered by level ASC, id ASC
		assert.Equal(t, 1, depts[0].Level)
		assert.Equal(t, 1, depts[1].Level)
		assert.Equal(t, 2, depts[2].Level)
	})

	t.Run("should return empty slice when no departments", func(t *testing.T) {
		depts, err := repo.GetByOrgID(context.Background(), 999)
		require.NoError(t, err)
		assert.Empty(t, depts)
	})
}

func TestDepartmentRepository_Update(t *testing.T) {
	cleanupDepartments()
	repo := repository.NewDepartmentRepository(testDB)

	t.Run("should update department successfully", func(t *testing.T) {
		dept := &model.Department{
			OrgID:       3,
			Name:        "Original Name",
			Description: "original desc",
			Level:       1,
		}
		require.NoError(t, repo.Create(context.Background(), dept))

		dept.Name = "Updated Name"
		dept.Description = "updated description"
		err := repo.Update(context.Background(), dept)
		require.NoError(t, err)

		result, err := repo.GetByID(context.Background(), dept.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, "Updated Name", result.Name)
		assert.Equal(t, "updated description", result.Description)
	})
}

func TestDepartmentRepository_Delete(t *testing.T) {
	cleanupDepartments()
	repo := repository.NewDepartmentRepository(testDB)

	t.Run("should delete department successfully", func(t *testing.T) {
		dept := &model.Department{
			OrgID: 4,
			Name:  "Delete Me",
			Level: 1,
		}
		require.NoError(t, repo.Create(context.Background(), dept))

		err := repo.Delete(context.Background(), dept.ID)
		require.NoError(t, err)

		result, err := repo.GetByID(context.Background(), dept.ID)
		require.NoError(t, err)
		assert.Nil(t, result)
	})

	t.Run("should succeed even if department doesn't exist", func(t *testing.T) {
		err := repo.Delete(context.Background(), 9999)
		assert.NoError(t, err)
	})
}

func TestDepartmentRepository_SetManager(t *testing.T) {
	cleanupDepartments()
	repo := repository.NewDepartmentRepository(testDB)

	t.Run("should set manager successfully", func(t *testing.T) {
		dept := &model.Department{
			OrgID: 5,
			Name:  "Managed Dept",
			Level: 1,
		}
		require.NoError(t, repo.Create(context.Background(), dept))

		managerUserID := 100
		err := repo.SetManager(context.Background(), dept.ID, managerUserID)
		require.NoError(t, err)

		result, err := repo.GetByID(context.Background(), dept.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		require.NotNil(t, result.ManagerUserID)
		assert.Equal(t, managerUserID, *result.ManagerUserID)
	})

	t.Run("should update existing manager", func(t *testing.T) {
		dept := &model.Department{
			OrgID:       6,
			Name:        "Reassigned Dept",
			Level:       1,
			ManagerUserID: func() *int { i := 50; return &i }(),
		}
		require.NoError(t, repo.Create(context.Background(), dept))

		newManagerUserID := 200
		err := repo.SetManager(context.Background(), dept.ID, newManagerUserID)
		require.NoError(t, err)

		result, err := repo.GetByID(context.Background(), dept.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		require.NotNil(t, result.ManagerUserID)
		assert.Equal(t, newManagerUserID, *result.ManagerUserID)
	})
}
