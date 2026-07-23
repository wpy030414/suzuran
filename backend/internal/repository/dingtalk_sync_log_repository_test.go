package repository_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

func cleanupDingTalkSyncLogs() {
	testDB.Exec("DELETE FROM dingtalk_sync_logs")
}

func TestDingTalkSyncLogRepository_Create(t *testing.T) {
	cleanupDingTalkSyncLogs()
	repo := repository.NewDingTalkSyncLogRepository(testDB)

	t.Run("should create sync log successfully", func(t *testing.T) {
		log := &model.DingTalkSyncLog{
			OrgID:     1,
			SyncType:  "department",
			Status:    "pending",
			StartedAt: time.Now(),
		}
		err := repo.Create(context.Background(), log)
		require.NoError(t, err)
		assert.NotZero(t, log.ID)
		assert.Equal(t, 1, log.OrgID)
		assert.Equal(t, "department", log.SyncType)
		assert.Equal(t, "pending", log.Status)
	})

	t.Run("should create sync log for user sync", func(t *testing.T) {
		log := &model.DingTalkSyncLog{
			OrgID:     2,
			SyncType:  "user",
			Status:    "pending",
			StartedAt: time.Now(),
		}
		err := repo.Create(context.Background(), log)
		require.NoError(t, err)
		assert.Equal(t, "user", log.SyncType)
	})
}

func TestDingTalkSyncLogRepository_UpdateStatus(t *testing.T) {
	cleanupDingTalkSyncLogs()
	repo := repository.NewDingTalkSyncLogRepository(testDB)

	t.Run("should update status to success", func(t *testing.T) {
		log := &model.DingTalkSyncLog{
			OrgID:     3,
			SyncType:  "department",
			Status:    "pending",
			StartedAt: time.Now(),
		}
		require.NoError(t, repo.Create(context.Background(), log))

		err := repo.UpdateStatus(context.Background(), log.ID, "success", "Sync completed successfully")
		require.NoError(t, err)

		var updated model.DingTalkSyncLog
		testDB.First(&updated, log.ID)
		assert.Equal(t, "success", updated.Status)
		assert.Equal(t, "Sync completed successfully", updated.Message)
		assert.NotNil(t, updated.CompletedAt)
	})

	t.Run("should update status to failed", func(t *testing.T) {
		log := &model.DingTalkSyncLog{
			OrgID:     4,
			SyncType:  "user",
			Status:    "pending",
			StartedAt: time.Now(),
		}
		require.NoError(t, repo.Create(context.Background(), log))

		err := repo.UpdateStatus(context.Background(), log.ID, "failed", "Connection timeout")
		require.NoError(t, err)

		var updated model.DingTalkSyncLog
		testDB.First(&updated, log.ID)
		assert.Equal(t, "failed", updated.Status)
		assert.Equal(t, "Connection timeout", updated.Message)
		assert.NotNil(t, updated.CompletedAt)
	})

	t.Run("should succeed even if log doesn't exist", func(t *testing.T) {
		err := repo.UpdateStatus(context.Background(), 9999, "success", "test")
		assert.NoError(t, err)
	})

	t.Run("should handle different message types", func(t *testing.T) {
		testCases := []struct {
			name    string
			status  string
			message string
		}{
			{"Success with empty message", "success", ""},
			{"Success with detailed message", "success", "Processed 100 departments"},
			{"Failed with error message", "failed", "Error: API rate limit exceeded"},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				log := &model.DingTalkSyncLog{
					OrgID:     10,
					SyncType:  "department",
					Status:    "pending",
					StartedAt: time.Now(),
				}
				require.NoError(t, repo.Create(context.Background(), log))

				err := repo.UpdateStatus(context.Background(), log.ID, tc.status, tc.message)
				require.NoError(t, err)

				var updated model.DingTalkSyncLog
				testDB.First(&updated, log.ID)
				assert.Equal(t, tc.status, updated.Status)
				assert.Equal(t, tc.message, updated.Message)
			})
		}
	})
}
