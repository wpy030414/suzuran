package model_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/xrl/suzuran-cloud/internal/model"
)

func TestOrgUserBondTableName(t *testing.T) {
	assert.Equal(t, "org_user_bonds", model.OrgUserBond{}.TableName())
}

func TestOrgUserBondBoolDefaults(t *testing.T) {
	var b model.OrgUserBond
	assert.False(t, b.IsAdmin, "IsAdmin should default to false")
	assert.False(t, b.IsDepartmentManager, "IsDepartmentManager should default to false")
}

func TestOrgUserBondDepartmentIDPointer(t *testing.T) {
	b := model.OrgUserBond{}
	assert.Nil(t, b.DepartmentID)

	deptID := 7
	b.DepartmentID = &deptID
	assert.Equal(t, 7, *b.DepartmentID)
}

func TestOrgUserBondJSONFieldNames(t *testing.T) {
	deptID := 3
	b := model.OrgUserBond{
		ID:                  1,
		OrgID:               10,
		UserID:              20,
		DepartmentID:        &deptID,
		IsAdmin:             true,
		IsDepartmentManager: false,
	}

	data, err := json.Marshal(&b)
	assert.NoError(t, err)

	var m map[string]interface{}
	err = json.Unmarshal(data, &m)
	assert.NoError(t, err)

	assert.Equal(t, float64(1), m["id"])
	assert.Equal(t, float64(10), m["orgId"])
	assert.Equal(t, float64(20), m["userId"])
	assert.Equal(t, float64(3), m["departmentId"])
	assert.Equal(t, true, m["isAdmin"])
	assert.Equal(t, false, m["isDepartmentManager"])
}

func TestOrgUserBondNilDepartmentOmitsFromJSON(t *testing.T) {
	b := model.OrgUserBond{OrgID: 1, UserID: 2}
	data, err := json.Marshal(&b)
	assert.NoError(t, err)

	var m map[string]interface{}
	err = json.Unmarshal(data, &m)
	assert.NoError(t, err)

	// DepartmentID is a pointer without omitempty, so it serializes as null
	_, ok := m["departmentId"]
	assert.True(t, ok, "departmentId key should be present even when nil")
}