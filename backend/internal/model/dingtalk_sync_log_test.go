package model_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/xrl/suzuran-cloud/internal/model"
)

func TestDingTalkSyncLogTableName(t *testing.T) {
	assert.Equal(t, "dingtalk_sync_logs", model.DingTalkSyncLog{}.TableName())
}

func TestDingTalkSyncLogStatusField(t *testing.T) {
	var log model.DingTalkSyncLog
	assert.Empty(t, log.Status)

	log.Status = "pending"
	assert.Equal(t, "pending", log.Status)

	log.Status = "success"
	assert.Equal(t, "success", log.Status)

	log.Status = "failed"
	assert.Equal(t, "failed", log.Status)
}

func TestDingTalkSyncLogSyncTypeField(t *testing.T) {
	log := model.DingTalkSyncLog{SyncType: "department"}
	assert.Equal(t, "department", log.SyncType)

	log.SyncType = "user"
	assert.Equal(t, "user", log.SyncType)
}

func TestDingTalkSyncLogCompletedAtPointer(t *testing.T) {
	log := model.DingTalkSyncLog{ID: 1}
	assert.Nil(t, log.CompletedAt)

	now := time.Now()
	log.CompletedAt = &now
	assert.NotNil(t, log.CompletedAt)
	assert.Equal(t, now, *log.CompletedAt)
}

func TestDingTalkSyncLogJSONFieldNames(t *testing.T) {
	now := time.Now()
	log := model.DingTalkSyncLog{
		ID:          1,
		OrgID:       10,
		SyncType:    "user",
		Status:      "success",
		Message:     "synced 5 users",
		CompletedAt: &now,
	}

	b, err := json.Marshal(&log)
	assert.NoError(t, err)

	var m map[string]interface{}
	err = json.Unmarshal(b, &m)
	assert.NoError(t, err)

	assert.Equal(t, float64(1), m["id"])
	assert.Equal(t, float64(10), m["orgId"])
	assert.Equal(t, "user", m["syncType"])
	assert.Equal(t, "success", m["status"])
	assert.Equal(t, "synced 5 users", m["message"])
}
