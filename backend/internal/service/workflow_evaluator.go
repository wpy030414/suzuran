package service

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/xrl/suzuran-cloud/internal/model"
)

// EvaluateCondition evaluates a simple comparison expression of the form
// "<var> <op> <value>" against the given variables.
//
// Supported operators: > < >= <= == !=
// The variable is looked up in vars (case-sensitive). Values may be numeric or string literals.
// Returns an error for malformed expressions or type mismatches.
func EvaluateCondition(expr string, vars model.JSONB) (bool, error) {
	expr = strings.TrimSpace(expr)
	if expr == "" {
		return false, fmt.Errorf("empty condition expression")
	}

	operators := []string{">=", "<=", "==", "!=", ">", "<"}
	for _, op := range operators {
		if idx := strings.Index(expr, op); idx > 0 {
			left := strings.TrimSpace(expr[:idx])
			right := strings.TrimSpace(expr[idx+len(op):])
			return compare(left, op, right, vars)
		}
	}
	return false, fmt.Errorf("no comparison operator found in %q", expr)
}

func compare(left, op, right string, vars model.JSONB) (bool, error) {
	lv, err := resolveOperand(left, vars)
	if err != nil {
		return false, err
	}
	rv, err := resolveOperand(right, vars)
	if err != nil {
		return false, err
	}

	// Try numeric comparison first.
	ln, lIsNum := toFloat(lv)
	rn, rIsNum := toFloat(rv)
	if lIsNum && rIsNum {
		switch op {
		case ">":
			return ln > rn, nil
		case "<":
			return ln < rn, nil
		case ">=":
			return ln >= rn, nil
		case "<=":
			return ln <= rn, nil
		case "==":
			return ln == rn, nil
		case "!=":
			return ln != rn, nil
		}
	}

	// Fall back to string comparison.
	ls := fmt.Sprintf("%v", lv)
	rs := fmt.Sprintf("%v", rv)
	switch op {
	case "==":
		return ls == rs, nil
	case "!=":
		return ls != rs, nil
	case ">", "<", ">=", "<=":
		return false, fmt.Errorf("operator %s requires numeric operands but got strings", op)
	}
	return false, fmt.Errorf("unsupported operator %s", op)
}

// resolveOperand returns the value of an operand: either a variable lookup
// or a literal (number or quoted/unquoted string).
func resolveOperand(token string, vars model.JSONB) (interface{}, error) {
	token = strings.Trim(token, `"'`)
	if v, ok := vars[token]; ok {
		return v, nil
	}
	// Literal number?
	if _, err := strconv.ParseFloat(token, 64); err == nil {
		return token, nil
	}
	return token, nil // treat as string literal
}

func toFloat(v interface{}) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	case string:
		if f, err := strconv.ParseFloat(n, 64); err == nil {
			return f, true
		}
		return 0, false
	}
	return 0, false
}
