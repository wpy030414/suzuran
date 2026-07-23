package model_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/xrl/suzuran-cloud/internal/model"
)

func TestDepartmentTableName(t *testing.T) {
	assert.Equal(t, "departments", model.Department{}.TableName())
}

func TestDepartmentParentIDNilForRoot(t *testing.T) {
	d := model.Department{ID: 1, Name: "Root"}
	assert.Nil(t, d.ParentID, "root department should have nil ParentID")

	childID := 10
	d.ParentID = &childID
	assert.NotNil(t, d.ParentID)
	assert.Equal(t, 10, *d.ParentID)
}

func TestDepartmentManagerUserIDPointer(t *testing.T) {
	d := model.Department{}
	assert.Nil(t, d.ManagerUserID, "default ManagerUserID should be nil")

	mgrID := 42
	d.ManagerUserID = &mgrID
	assert.Equal(t, 42, *d.ManagerUserID)
}

func TestDepartmentLevelField(t *testing.T) {
	d := model.Department{Level: 1}
	assert.Equal(t, 1, d.Level)

	d.Level = 3
	assert.Equal(t, 3, d.Level)
}

func TestDepartmentJSONFieldNames(t *testing.T) {
	mgrID := 5
	parentID := 2
	d := model.Department{
		ID:            1,
		OrgID:         10,
		Name:          "Engineering",
		ParentID:      &parentID,
		Level:         2,
		ManagerUserID: &mgrID,
		Description:   "Engineering dept",
	}

	b, err := json.Marshal(&d)
	assert.NoError(t, err)

	var m map[string]interface{}
	err = json.Unmarshal(b, &m)
	assert.NoError(t, err)

	assert.Equal(t, float64(1), m["id"])
	assert.Equal(t, float64(10), m["orgId"])
	assert.Equal(t, "Engineering", m["name"])
	assert.Equal(t, float64(2), m["parentId"])
	assert.Equal(t, float64(2), m["level"])
	assert.Equal(t, float64(5), m["managerUserId"])
	assert.Equal(t, "Engineering dept", m["description"])
}
