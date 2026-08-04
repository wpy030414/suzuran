package repository_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

func cleanupUsers() {
	testDB.Exec("DELETE FROM users")
}

func TestUserRepository_Create(t *testing.T) {
	cleanupUsers()
	repo := repository.NewUserRepository(testDB)

	t.Run("should create user successfully", func(t *testing.T) {
		cleanupUsers()
		user := &model.User{
			Phone:    "13800138000",
			Name:     "Test User",
			Email:    "test@example.com",
			Position: "Developer",
		}
		err := repo.Create(context.Background(), user)
		require.NoError(t, err)
		assert.NotZero(t, user.ID)
		assert.Equal(t, "13800138000", user.Phone)
		assert.Equal(t, "Test User", user.Name)
	})

	t.Run("should allow multiple users with empty phone (OAuth-only)", func(t *testing.T) {
		cleanupUsers()
		user1 := &model.User{Name: "User One"}
		err := repo.Create(context.Background(), user1)
		require.NoError(t, err)

		user2 := &model.User{Name: "User Two"}
		err = repo.Create(context.Background(), user2)
		// OAuth users may not have a phone at all; empty phone must not collide.
		assert.NoError(t, err)
		assert.NotZero(t, user2.ID)
	})
}

func TestUserRepository_GetByID(t *testing.T) {
	cleanupUsers()
	repo := repository.NewUserRepository(testDB)

	t.Run("should return user when exists", func(t *testing.T) {
		user := &model.User{
			Phone: "13800138001",
			Name:  "Get User",
			Email: "get@example.com",
		}
		require.NoError(t, repo.Create(context.Background(), user))

		result, err := repo.GetByID(context.Background(), user.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, user.ID, result.ID)
		assert.Equal(t, "Get User", result.Name)
		assert.Equal(t, "get@example.com", result.Email)
	})

	t.Run("should return nil when not found", func(t *testing.T) {
		result, err := repo.GetByID(context.Background(), 9999)
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}

func TestUserRepository_GetByPhone(t *testing.T) {
	cleanupUsers()
	repo := repository.NewUserRepository(testDB)

	t.Run("should return user by phone", func(t *testing.T) {
		user := &model.User{
			Phone: "13800138002",
			Name:  "Phone User",
		}
		require.NoError(t, repo.Create(context.Background(), user))

		result, err := repo.GetByPhone(context.Background(), "13800138002")
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, user.ID, result.ID)
		assert.Equal(t, "Phone User", result.Name)
	})

	t.Run("should return nil when phone not found", func(t *testing.T) {
		result, err := repo.GetByPhone(context.Background(), "99999999999")
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}

func TestUserRepository_Update(t *testing.T) {
	cleanupUsers()
	repo := repository.NewUserRepository(testDB)

	t.Run("should update user successfully", func(t *testing.T) {
		user := &model.User{
			Phone: "13800138003",
			Name:  "Original Name",
			Email: "original@example.com",
		}
		require.NoError(t, repo.Create(context.Background(), user))

		user.Name = "Updated Name"
		user.Email = "updated@example.com"
		user.Position = "Senior Developer"
		err := repo.Update(context.Background(), user)
		require.NoError(t, err)

		result, err := repo.GetByID(context.Background(), user.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, "Updated Name", result.Name)
		assert.Equal(t, "updated@example.com", result.Email)
		assert.Equal(t, "Senior Developer", result.Position)
	})
}

func TestUserRepository_Delete(t *testing.T) {
	cleanupUsers()
	repo := repository.NewUserRepository(testDB)

	t.Run("should delete user successfully", func(t *testing.T) {
		user := &model.User{
			Phone: "13800138004",
			Name:  "Delete User",
		}
		require.NoError(t, repo.Create(context.Background(), user))

		err := repo.Delete(context.Background(), user.ID)
		require.NoError(t, err)

		result, err := repo.GetByID(context.Background(), user.ID)
		require.NoError(t, err)
		assert.Nil(t, result)
	})

	t.Run("should succeed even if user doesn't exist", func(t *testing.T) {
		err := repo.Delete(context.Background(), 9999)
		assert.NoError(t, err)
	})
}

func TestUserRepository_List(t *testing.T) {
	cleanupUsers()
	repo := repository.NewUserRepository(testDB)

	t.Run("should list all users ordered by ID", func(t *testing.T) {
		cleanupUsers()
		user1 := &model.User{Phone: "13800138010", Name: "User A"}
		user2 := &model.User{Phone: "13800138011", Name: "User B"}
		user3 := &model.User{Phone: "13800138012", Name: "User C"}

		require.NoError(t, repo.Create(context.Background(), user1))
		require.NoError(t, repo.Create(context.Background(), user2))
		require.NoError(t, repo.Create(context.Background(), user3))

		users, err := repo.List(context.Background())
		require.NoError(t, err)
		require.Len(t, users, 3)
		assert.Equal(t, "User A", users[0].Name)
		assert.Equal(t, "User B", users[1].Name)
		assert.Equal(t, "User C", users[2].Name)
	})

	t.Run("should return empty slice when no users", func(t *testing.T) {
		cleanupUsers()
		users, err := repo.List(context.Background())
		require.NoError(t, err)
		assert.Empty(t, users)
	})
}
