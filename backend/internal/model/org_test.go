package model_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/xrl/suzuran-cloud/internal/model"
)

func TestOrgTableName(t *testing.T) {
	assert.Equal(t, "orgs", model.Org{}.TableName())
}

func TestOrgJSONFieldNames(t *testing.T) {
	b, err := json.Marshal(&model.Org{
		ID:          1,
		Name:        "TestOrg",
		Description: "desc",
	})
	assert.NoError(t, err)

	var m map[string]interface{}
	err = json.Unmarshal(b, &m)
	assert.NoError(t, err)

	// Field names should use camelCase
	_, ok := m["id"]
	assert.True(t, ok, "expected json key 'id'")
	_, ok = m["name"]
	assert.True(t, ok, "expected json key 'name'")
	_, ok = m["description"]
	assert.True(t, ok, "expected json key 'description'")
	_, ok = m["createdAt"]
	assert.True(t, ok, "expected json key 'createdAt'")
	_, ok = m["updatedAt"]
	assert.True(t, ok, "expected json key 'updatedAt'")
}

func TestOrgZeroValues(t *testing.T) {
	var o model.Org
	assert.Zero(t, o.ID)
	assert.Empty(t, o.Name)
	assert.Empty(t, o.Description)
	assert.True(t, o.CreatedAt.IsZero())
	assert.True(t, o.UpdatedAt.IsZero())
}
