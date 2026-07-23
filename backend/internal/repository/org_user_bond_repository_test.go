package repository_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

func cleanupOrgUserBonds() {
	testDB.Exec("DELETE FROM org_user_bonds")
}

func TestOrgUserBondRepository_Create(t *testing.T) {
	cleanupOrgUserBonds()
	repo := repository.NewOrgUserBondRepository(testDB)

	t.Run("should create bond successfully", func(t *testing.T) {
		bond := &model.OrgUserBond{
			OrgID:       1,
			UserID:      1,
			IsAdmin:     true,
		}
		err := repo.Create(context.Background(), bond)
		require.NoError(t, err)
		assert.NotZero(t, bond.ID)
		assert.Equal(t, 1, bond.OrgID)
		assert.Equal(t, 1, bond.UserID)
		assert.True(t, bond.IsAdmin)
	})

	t.Run("should create bond with department", func(t *testing.T) {
		deptID := 5
		bond := &model.OrgUserBond{
			OrgID:        2,
			UserID:       2,
			DepartmentID: &deptID,
			IsAdmin:      false,
		}
		err := repo.Create(context.Background(), bond)
		require.NoError(t, err)
		assert.NotNil(t, bond.DepartmentID)
		assert.Equal(t, deptID, *bond.DepartmentID)
	})
}

func TestOrgUserBondRepository_GetByOrgAndUser(t *testing.T) {
	cleanupOrgUserBonds()
	repo := repository.NewOrgUserBondRepository(testDB)

	t.Run("should return bond when exists", func(t *testing.T) {
		bond := &model.OrgUserBond{
			OrgID:       10,
			UserID:      20,
			IsAdmin:     true,
		}
		require.NoError(t, repo.Create(context.Background(), bond))

		result, err := repo.GetByOrgAndUser(context.Background(), 10, 20)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, bond.ID, result.ID)
		assert.Equal(t, 10, result.OrgID)
		assert.Equal(t, 20, result.UserID)
		assert.True(t, result.IsAdmin)
	})

	t.Run("should return nil when not found", func(t *testing.T) {
		result, err := repo.GetByOrgAndUser(context.Background(), 99, 99)
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}

func TestOrgUserBondRepository_GetByUserID(t *testing.T) {
	cleanupOrgUserBonds()
	repo := repository.NewOrgUserBondRepository(testDB)

	t.Run("should return all bonds for user", func(t *testing.T) {
		bond1 := &model.OrgUserBond{OrgID: 1, UserID: 100}
		bond2 := &model.OrgUserBond{OrgID: 2, UserID: 100}
		bond3 := &model.OrgUserBond{OrgID: 3, UserID: 100}

		require.NoError(t, repo.Create(context.Background(), bond1))
		require.NoError(t, repo.Create(context.Background(), bond2))
		require.NoError(t, repo.Create(context.Background(), bond3))

		bonds, err := repo.GetByUserID(context.Background(), 100)
		require.NoError(t, err)
		require.Len(t, bonds, 3)
	})

	t.Run("should return empty slice when no bonds", func(t *testing.T) {
		bonds, err := repo.GetByUserID(context.Background(), 999)
		require.NoError(t, err)
		assert.Empty(t, bonds)
	})
}

func TestOrgUserBondRepository_GetByOrgID(t *testing.T) {
	cleanupOrgUserBonds()
	repo := repository.NewOrgUserBondRepository(testDB)

	t.Run("should return all bonds for org", func(t *testing.T) {
		bond1 := &model.OrgUserBond{OrgID: 100, UserID: 1}
		bond2 := &model.OrgUserBond{OrgID: 100, UserID: 2}
		bond3 := &model.OrgUserBond{OrgID: 100, UserID: 3}

		require.NoError(t, repo.Create(context.Background(), bond1))
		require.NoError(t, repo.Create(context.Background(), bond2))
		require.NoError(t, repo.Create(context.Background(), bond3))

		bonds, err := repo.GetByOrgID(context.Background(), 100)
		require.NoError(t, err)
		require.Len(t, bonds, 3)
	})

	t.Run("should return empty slice when no bonds", func(t *testing.T) {
		bonds, err := repo.GetByOrgID(context.Background(), 999)
		require.NoError(t, err)
		assert.Empty(t, bonds)
	})
}

func TestOrgUserBondRepository_Update(t *testing.T) {
	cleanupOrgUserBonds()
	repo := repository.NewOrgUserBondRepository(testDB)

	t.Run("should update bond successfully", func(t *testing.T) {
		deptID := 10
		bond := &model.OrgUserBond{
			OrgID:        5,
			UserID:       5,
			DepartmentID: &deptID,
			IsAdmin:      false,
		}
		require.NoError(t, repo.Create(context.Background(), bond))

		bond.IsAdmin = true
		bond.IsDepartmentManager = true
		newDeptID := 20
		bond.DepartmentID = &newDeptID

		err := repo.Update(context.Background(), bond)
		require.NoError(t, err)

		result, err := repo.GetByOrgAndUser(context.Background(), 5, 5)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.True(t, result.IsAdmin)
		assert.True(t, result.IsDepartmentManager)
		assert.Equal(t, newDeptID, *result.DepartmentID)
	})
}

func TestOrgUserBondRepository_Delete(t *testing.T) {
	cleanupOrgUserBonds()
	repo := repository.NewOrgUserBondRepository(testDB)

	t.Run("should delete bond successfully", func(t *testing.T) {
		bond := &model.OrgUserBond{
			OrgID:       7,
			UserID:      7,
		}
		require.NoError(t, repo.Create(context.Background(), bond))

		err := repo.Delete(context.Background(), bond.ID)
		require.NoError(t, err)

		result, err := repo.GetByOrgAndUser(context.Background(), 7, 7)
		require.NoError(t, err)
		assert.Nil(t, result)
	})

	t.Run("should succeed even if bond doesn't exist", func(t *testing.T) {
		err := repo.Delete(context.Background(), 9999)
		assert.NoError(t, err)
	})
}
