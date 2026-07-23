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
			Phone:        "13800138000",
			PasswordHash: "hashed_password",
			Salt:         "random_salt",
			Name:         "Test User",
			Email:        "test@example.com",
			Position:     "Developer",
		}
		err := repo.Create(context.Background(), user)
		require.NoError(t, err)
		assert.NotZero(t, user.ID)
		assert.Equal(t, "13800138000", user.Phone)
		assert.Equal(t, "Test User", user.Name)
	})

	t.Run("should fail on duplicate phone", func(t *testing.T) {
		cleanupUsers()
		user1 := &model.User{
			Phone:        "13900139000",
			PasswordHash: "hash1",
			Salt:         "salt1",
			Name:         "User One",
		}
		err := repo.Create(context.Background(), user1)
		require.NoError(t, err)

		user2 := &model.User{
			Phone:        "13900139000",
			PasswordHash: "hash2",
			Salt:         "salt2",
			Name:         "User Two",
		}
		err = repo.Create(context.Background(), user2)
		assert.Error(t, err)
	})
}

func TestUserRepository_GetByID(t *testing.T) {
	cleanupUsers()
	repo := repository.NewUserRepository(testDB)

	t.Run("should return user when exists", func(t *testing.T) {
		user := &model.User{
			Phone:        "13800138001",
			PasswordHash: "hash",
			Salt:         "salt",
			Name:         "Get User",
			Email:        "get@example.com",
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
			Phone:        "13800138002",
			PasswordHash: "hash",
			Salt:         "salt",
			Name:         "Phone User",
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
			Phone:        "13800138003",
			PasswordHash: "hash",
			Salt:         "salt",
			Name:         "Original Name",
			Email:        "original@example.com",
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
			Phone:        "13800138004",
			PasswordHash: "hash",
			Salt:         "salt",
			Name:         "Delete User",
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
		user1 := &model.User{Phone: "13800138010", PasswordHash: "h", Salt: "s", Name: "User A"}
		user2 := &model.User{Phone: "13800138011", PasswordHash: "h", Salt: "s", Name: "User B"}
		user3 := &model.User{Phone: "13800138012", PasswordHash: "h", Salt: "s", Name: "User C"}

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
