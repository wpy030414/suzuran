package model_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/xrl/suzuran-cloud/internal/model"
)

func TestFormDefinitionTableName(t *testing.T) {
	assert.Equal(t, "form_definitions", model.FormDefinition{}.TableName())
}

func TestFormDefinitionSchemaIsJSONB(t *testing.T) {
	// JSONB is a map[string]interface{} alias
	fd := model.FormDefinition{
		Schema: model.JSONB{"type": "object", "fields": []interface{}{"name", "age"}},
	}
	assert.NotNil(t, fd.Schema)
	assert.Equal(t, "object", fd.Schema["type"])
}

func TestFormDefinitionStatusField(t *testing.T) {
	fd := model.FormDefinition{Status: "draft"}
	assert.Equal(t, "draft", fd.Status)

	fd.Status = "published"
	assert.Equal(t, "published", fd.Status)
}

func TestFormDefinitionStatusDefaultZeroValue(t *testing.T) {
	var fd model.FormDefinition
	// Go zero value for string is "", but GORM default is "draft"
	assert.Empty(t, fd.Status)
}

func TestFormDefinitionJSONMarshaling(t *testing.T) {
	fd := model.FormDefinition{
		ID:        1,
		OrgID:     10,
		Name:      "Leave Form",
		Code:      "leave_form",
		Schema:    model.JSONB{"title": "Leave Request"},
		Status:    "published",
		CreatedBy: 5,
	}

	b, err := json.Marshal(&fd)
	assert.NoError(t, err)

	var m map[string]interface{}
	err = json.Unmarshal(b, &m)
	assert.NoError(t, err)

	assert.Equal(t, float64(1), m["id"])
	assert.Equal(t, float64(10), m["orgId"])
	assert.Equal(t, "Leave Form", m["name"])
	assert.Equal(t, "leave_form", m["code"])
	assert.Equal(t, "published", m["status"])
	assert.Equal(t, float64(5), m["createdBy"])

	// Schema should serialize as a JSON object
	schema, ok := m["schema"]
	assert.True(t, ok)
	schemaMap, ok := schema.(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "Leave Request", schemaMap["title"])
}