package repository_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

var testDB *gorm.DB

func TestMain(m *testing.M) {
	var err error
	testDB, err = gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic(err)
	}

	// AutoMigrate all models
	if err := testDB.AutoMigrate(
		&model.Org{},
		&model.User{},
		&model.OrgUserBond{},
		&model.Department{},
		&model.DingTalkSyncLog{},
		&model.AuditLog{},
	); err != nil {
		panic(fmt.Sprintf("AutoMigrate failed: %v", err))
	}

	m.Run()
}

func cleanupOrgs() {
	testDB.Exec("DELETE FROM orgs")
}

func TestOrgRepository_Create(t *testing.T) {
	cleanupOrgs()
	repo := repository.NewOrgRepository(testDB)

	t.Run("should create org successfully", func(t *testing.T) {
		org := &model.Org{Name: "Test Org", Description: "test description"}
		err := repo.Create(context.Background(), org)
		require.NoError(t, err)
		assert.NotZero(t, org.ID)
		assert.Equal(t, "Test Org", org.Name)
		assert.Equal(t, "test description", org.Description)
	})

	t.Run("should fail on duplicate name", func(t *testing.T) {
		org1 := &model.Org{Name: "Unique Org", Description: "first"}
		err := repo.Create(context.Background(), org1)
		require.NoError(t, err)

		org2 := &model.Org{Name: "Unique Org", Description: "second"}
		err = repo.Create(context.Background(), org2)
		assert.Error(t, err)
	})
}

func TestOrgRepository_GetByID(t *testing.T) {
	cleanupOrgs()
	repo := repository.NewOrgRepository(testDB)

	t.Run("should return org when exists", func(t *testing.T) {
		org := &model.Org{Name: "Get Test Org", Description: "get test"}
		require.NoError(t, repo.Create(context.Background(), org))

		result, err := repo.GetByID(context.Background(), org.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, org.ID, result.ID)
		assert.Equal(t, "Get Test Org", result.Name)
		assert.Equal(t, "get test", result.Description)
	})

	t.Run("should return nil when not found", func(t *testing.T) {
		result, err := repo.GetByID(context.Background(), 9999)
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}

func TestOrgRepository_List(t *testing.T) {
	cleanupOrgs()
	repo := repository.NewOrgRepository(testDB)

	t.Run("should list all orgs ordered by ID", func(t *testing.T) {
		org1 := &model.Org{Name: "Org A", Description: "first"}
		org2 := &model.Org{Name: "Org B", Description: "second"}
		org3 := &model.Org{Name: "Org C", Description: "third"}

		require.NoError(t, repo.Create(context.Background(), org1))
		require.NoError(t, repo.Create(context.Background(), org2))
		require.NoError(t, repo.Create(context.Background(), org3))

		orgs, err := repo.List(context.Background())
		require.NoError(t, err)
		require.Len(t, orgs, 3)
		assert.Equal(t, "Org A", orgs[0].Name)
		assert.Equal(t, "Org B", orgs[1].Name)
		assert.Equal(t, "Org C", orgs[2].Name)
	})

	t.Run("should return empty slice when no orgs", func(t *testing.T) {
		cleanupOrgs()
		orgs, err := repo.List(context.Background())
		require.NoError(t, err)
		assert.Empty(t, orgs)
	})
}

func TestOrgRepository_Update(t *testing.T) {
	cleanupOrgs()
	repo := repository.NewOrgRepository(testDB)

	t.Run("should update org successfully", func(t *testing.T) {
		org := &model.Org{Name: "Original Name", Description: "original desc"}
		require.NoError(t, repo.Create(context.Background(), org))

		org.Name = "Updated Name"
		org.Description = "updated description"
		err := repo.Update(context.Background(), org)
		require.NoError(t, err)

		result, err := repo.GetByID(context.Background(), org.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, "Updated Name", result.Name)
		assert.Equal(t, "updated description", result.Description)
	})
}

func TestOrgRepository_Delete(t *testing.T) {
	cleanupOrgs()
	repo := repository.NewOrgRepository(testDB)

	t.Run("should delete org successfully", func(t *testing.T) {
		org := &model.Org{Name: "Delete Me", Description: "to be deleted"}
		require.NoError(t, repo.Create(context.Background(), org))

		err := repo.Delete(context.Background(), org.ID)
		require.NoError(t, err)

		result, err := repo.GetByID(context.Background(), org.ID)
		require.NoError(t, err)
		assert.Nil(t, result)
	})

	t.Run("should succeed even if org doesn't exist", func(t *testing.T) {
		err := repo.Delete(context.Background(), 9999)
		assert.NoError(t, err)
	})
}
