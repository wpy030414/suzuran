package model_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/xrl/suzuran-cloud/internal/model"
)

func TestUserTableName(t *testing.T) {
	assert.Equal(t, "users", model.User{}.TableName())
}

func TestUserDingTalkFieldsArePointers(t *testing.T) {
	u := model.User{}
	assert.Nil(t, u.DingtalkUserID, "DingtalkUserID should be nil by default")
	assert.Nil(t, u.DingtalkUnionID, "DingtalkUnionID should be nil by default")
	assert.Nil(t, u.DingtalkOpenID, "DingtalkOpenID should be nil by default")

	uid := "dt_user_001"
	unionID := "union_abc"
	openID := "open_xyz"
	u.DingtalkUserID = &uid
	u.DingtalkUnionID = &unionID
	u.DingtalkOpenID = &openID

	assert.Equal(t, "dt_user_001", *u.DingtalkUserID)
	assert.Equal(t, "union_abc", *u.DingtalkUnionID)
	assert.Equal(t, "open_xyz", *u.DingtalkOpenID)
}

func TestUserPasswordHashHiddenInJSON(t *testing.T) {
	u := model.User{
		ID:           1,
		Phone:        "13800138000",
		Name:         "TestUser",
	}

	b, err := json.Marshal(&u)
	assert.NoError(t, err)

	s := string(b)
	assert.NotContains(t, s, "passwordHash", "PasswordHash should be hidden (json:'-')")
	assert.NotContains(t, s, "secret_hash_value")
	assert.NotContains(t, s, "salt", "Salt should be hidden (json:'-')")
	assert.NotContains(t, s, "some_salt")

	// These fields should be present
	assert.Contains(t, s, "phone")
	assert.Contains(t, s, "name")
}

func TestUserOmitEmptyPointers(t *testing.T) {
	u := model.User{Phone: "13800138000"}

	b, err := json.Marshal(&u)
	assert.NoError(t, err)

	// Pointer fields with omitempty should be absent when nil
	assert.NotContains(t, string(b), "dingtalkUserId")
	assert.NotContains(t, string(b), "dingtalkUnionId")
	assert.NotContains(t, string(b), "dingtalkOpenId")
	assert.NotContains(t, string(b), "avatarUrl")
	assert.NotContains(t, string(b), "email")
	assert.NotContains(t, string(b), "position")

	// Set a DingTalk ID and verify it appears
	dtID := "dt_123"
	u.DingtalkUserID = &dtID
	b, err = json.Marshal(&u)
	assert.NoError(t, err)
	assert.True(t, strings.Contains(string(b), "dingtalkUserId"))
}