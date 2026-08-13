package service

import (
	"encoding/json"
	"fmt"
)

// decodeDefinition converts the raw JSONB map into a WorkflowDef struct.
func decodeDefinition(raw map[string]interface{}) (*WorkflowDef, error) {
	if raw == nil {
		return nil, fmt.Errorf("definition is empty")
	}
	bytes, err := json.Marshal(raw)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal definition: %w", err)
	}
	var wf WorkflowDef
	if err := json.Unmarshal(bytes, &wf); err != nil {
		return nil, fmt.Errorf("failed to unmarshal definition: %w", err)
	}
	return &wf, nil
}

// validateDefinition checks structural integrity: steps unique, one start,
// all gotos point to existing steps, end steps have a result.
func validateDefinition(wf *WorkflowDef) error {
	if len(wf.Steps) == 0 {
		return fmt.Errorf("workflow has no steps")
	}
	names := make(map[string]*WorkflowStep)
	startCount := 0
	for i := range wf.Steps {
		s := &wf.Steps[i]
		if s.Name == "" {
			return fmt.Errorf("step %d has no name", i)
		}
		if _, dup := names[s.Name]; dup {
			return fmt.Errorf("duplicate step name: %s", s.Name)
		}
		names[s.Name] = s
		if s.Type == "start" {
			startCount++
			if s.Next == "" {
				return fmt.Errorf("start step %s has no next", s.Name)
			}
		}
	}
	if startCount == 0 {
		return fmt.Errorf("workflow has no start step")
	}
	if startCount > 1 {
		return fmt.Errorf("workflow has multiple start steps")
	}
	for name, s := range names {
		switch s.Type {
		case "start", "approval", "condition", "end":
		default:
			return fmt.Errorf("step %s has unknown type %q", name, s.Type)
		}
		if s.Type == "approval" && s.Assignee == nil {
			return fmt.Errorf("approval step %s has no assignee", name)
		}
		if s.Type == "end" && s.Result == "" {
			return fmt.Errorf("end step %s has no result", name)
		}
		if s.Type == "condition" && len(s.Conditions) == 0 {
			return fmt.Errorf("condition step %s has no conditions", name)
		}
	}
	// Validate goto targets.
	for _, s := range wf.Steps {
		if s.Type == "start" && !exists(names, s.Next) {
			return gotoErr(s.Name, s.Next)
		}
		if s.OnApprove != nil && !exists(names, s.OnApprove.Goto) {
			return gotoErr(s.Name, s.OnApprove.Goto)
		}
		if s.OnReject != nil && !exists(names, s.OnReject.Goto) {
			return gotoErr(s.Name, s.OnReject.Goto)
		}
		for _, c := range s.Conditions {
			if c.When != "" && !exists(names, c.Goto) {
				return gotoErr(s.Name, c.Goto)
			}
			if c.Otherwise != "" && !exists(names, c.Otherwise) {
				return gotoErr(s.Name, c.Otherwise)
			}
		}
	}
	return nil
}

func exists(steps map[string]*WorkflowStep, name string) bool {
	_, ok := steps[name]
	return ok
}

func gotoErr(from, to string) error {
	return fmt.Errorf("step %s references unknown next step %q", from, to)
}

// findStep returns the step with the given name, or nil.
func findStep(wf *WorkflowDef, name string) *WorkflowStep {
	for i := range wf.Steps {
		if wf.Steps[i].Name == name {
			return &wf.Steps[i]
		}
	}
	return nil
}
