package model_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/xrl/suzuran-cloud/internal/model"
)

// --- ReportDefinition ---

func TestReportDefinitionTableName(t *testing.T) {
	assert.Equal(t, "report_definitions", model.ReportDefinition{}.TableName())
}

func TestReportDefinitionJSONBFields(t *testing.T) {
	rd := model.ReportDefinition{
		ID:          1,
		OrgID:       10,
		Name:        "Sales Report",
		Code:        "sales_report",
		QueryConfig: model.JSONB{"table": "orders"},
		ChartConfig: model.JSONB{"type": "bar"},
	}

	b, err := json.Marshal(&rd)
	assert.NoError(t, err)

	var m map[string]interface{}
	err = json.Unmarshal(b, &m)
	assert.NoError(t, err)

	assert.Equal(t, float64(1), m["id"])
	assert.Equal(t, "Sales Report", m["name"])
	assert.Equal(t, "sales_report", m["code"])

	// QueryConfig is a JSONB field
	qc, ok := m["queryConfig"]
	assert.True(t, ok)
	qcMap, ok := qc.(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "orders", qcMap["table"])

	// ChartConfig is a JSONB field
	cc, ok := m["chartConfig"]
	assert.True(t, ok)
	ccMap, ok := cc.(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "bar", ccMap["type"])
}

// --- ApplicationPage ---

func TestApplicationPageTableName(t *testing.T) {
	assert.Equal(t, "application_pages", model.ApplicationPage{}.TableName())
}

func TestApplicationPageJSONBFields(t *testing.T) {
	ap := model.ApplicationPage{
		ID:           1,
		OrgID:        10,
		Name:         "Dashboard",
		Code:         "dashboard",
		LayoutConfig: model.JSONB{"rows": 3},
		WidgetConfig: model.JSONB{"widgets": []interface{}{"chart1"}},
		SkillConfig:  model.JSONB{"enabled": true},
	}

	b, err := json.Marshal(&ap)
	assert.NoError(t, err)

	var m map[string]interface{}
	err = json.Unmarshal(b, &m)
	assert.NoError(t, err)

	assert.Equal(t, "Dashboard", m["name"])
	assert.Equal(t, "dashboard", m["code"])

	// Verify all JSONB fields serialize correctly
	for _, key := range []string{"layoutConfig", "widgetConfig", "skillConfig"} {
		v, ok := m[key]
		assert.True(t, ok, "expected JSONB key %q in output", key)
		assert.IsType(t, map[string]interface{}{}, v, "key %q should be a JSON object", key)
	}
}

func TestApplicationPageVueFields(t *testing.T) {
	ap := model.ApplicationPage{
		VueTemplate: "<template><div>Hello</div></template>",
		VueScript:   "export default { data() { return {} } }",
		VueStyle:    ".container { color: red; }",
	}

	b, err := json.Marshal(&ap)
	assert.NoError(t, err)

	var m map[string]interface{}
	err = json.Unmarshal(b, &m)
	assert.NoError(t, err)

	assert.Equal(t, "<template><div>Hello</div></template>", m["vueTemplate"])
	assert.Equal(t, "export default { data() { return {} } }", m["vueScript"])
	assert.Equal(t, ".container { color: red; }", m["vueStyle"])
}

func TestApplicationPageVueFieldsDefaultEmpty(t *testing.T) {
	var ap model.ApplicationPage
	assert.Empty(t, ap.VueTemplate)
	assert.Empty(t, ap.VueScript)
	assert.Empty(t, ap.VueStyle)
}

// --- WidgetLibrary ---

func TestWidgetLibraryTableName(t *testing.T) {
	assert.Equal(t, "widget_library", model.WidgetLibrary{}.TableName())
}

func TestWidgetLibraryTypeField(t *testing.T) {
	w := model.WidgetLibrary{Type: "chart"}
	assert.Equal(t, "chart", w.Type)

	w.Type = "input"
	assert.Equal(t, "input", w.Type)
}

func TestWidgetLibraryConfigJSONB(t *testing.T) {
	w := model.WidgetLibrary{
		ID:     1,
		Name:   "BarChart",
		Code:   "bar_chart",
		Type:   "chart",
		Config: model.JSONB{"axisX": "label", "axisY": "value"},
	}

	b, err := json.Marshal(&w)
	assert.NoError(t, err)

	var m map[string]interface{}
	err = json.Unmarshal(b, &m)
	assert.NoError(t, err)

	assert.Equal(t, "BarChart", m["name"])
	assert.Equal(t, "bar_chart", m["code"])
	assert.Equal(t, "chart", m["type"])

	cfg, ok := m["config"]
	assert.True(t, ok)
	cfgMap, ok := cfg.(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "label", cfgMap["axisX"])
	assert.Equal(t, "value", cfgMap["axisY"])
}
