package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/xrl/suzuran-cloud/internal/model"
)

func TestEvaluateCondition_Numeric(t *testing.T) {
	vars := model.JSONB{"leaveDays": float64(5)}

	cases := []struct {
		expr string
		want bool
	}{
		{"leaveDays > 3", true},
		{"leaveDays < 3", false},
		{"leaveDays >= 5", true},
		{"leaveDays <= 5", true},
		{"leaveDays == 5", true},
		{"leaveDays != 5", false},
		{"leaveDays == 4", false},
	}
	for _, c := range cases {
		got, err := EvaluateCondition(c.expr, vars)
		require.NoError(t, err, "expr: %s", c.expr)
		assert.Equal(t, c.want, got, "expr: %s", c.expr)
	}
}

func TestEvaluateCondition_String(t *testing.T) {
	vars := model.JSONB{"leaveType": "sick"}

	got, err := EvaluateCondition(`leaveType == "sick"`, vars)
	require.NoError(t, err)
	assert.True(t, got)

	got, err = EvaluateCondition(`leaveType == "annual"`, vars)
	require.NoError(t, err)
	assert.False(t, got)
}

func TestEvaluateCondition_Errors(t *testing.T) {
	vars := model.JSONB{"x": float64(1)}

	_, err := EvaluateCondition("", vars)
	require.Error(t, err)

	_, err = EvaluateCondition("no operator here", vars)
	require.Error(t, err)
}
