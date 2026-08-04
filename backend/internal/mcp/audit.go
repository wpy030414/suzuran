package mcp

import (
	"context"
	"encoding/json"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/xrl/suzuran-cloud/internal/service"
)

// ToolCallAudit represents an audit log entry for a tool call.
type ToolCallAudit struct {
	UserID       int                    `json:"user_id"`
	OrgID        int                    `json:"org_id"`
	Role         string                 `json:"role"`
	ToolName     string                 `json:"tool_name"`
	Arguments    map[string]interface{} `json:"arguments"`
	Result       interface{}            `json:"result,omitempty"`
	Error        string                 `json:"error,omitempty"`
	Duration     time.Duration          `json:"duration_ms"`
	Timestamp    time.Time              `json:"timestamp"`
}

// AuditToolCall logs a tool call to the audit system.
// This should be called after every tool execution.
func AuditToolCall(
	ctx context.Context,
	auditService *service.AuditService,
	toolName string,
	request mcp.CallToolRequest,
	result *mcp.CallToolResult,
	err error,
	duration time.Duration,
) {
	// Extract context information
	userID, _ := GetUserIDFromContext(ctx)
	orgID, _ := GetOrgIDFromContext(ctx)
	role, _ := GetRoleFromContext(ctx)

	// Build audit log entry
	audit := ToolCallAudit{
		UserID:    userID,
		OrgID:     orgID,
		Role:      role,
		ToolName:  toolName,
		Arguments: request.Params.Arguments,
		Duration:  duration,
		Timestamp: time.Now(),
	}

	// Add result or error
	if err != nil {
		audit.Error = err.Error()
	} else if result != nil {
		audit.Result = result
	}

	// Convert audit to map for storage
	auditMap := map[string]interface{}{
		"user_id":    audit.UserID,
		"org_id":     audit.OrgID,
		"role":       audit.Role,
		"tool_name":  audit.ToolName,
		"arguments":  audit.Arguments,
		"duration_ms": audit.Duration.Milliseconds(),
		"timestamp":  audit.Timestamp,
	}

	if audit.Error != "" {
		auditMap["error"] = audit.Error
	}

	if audit.Result != nil {
		// Marshal result to JSON to avoid storing large objects
		if resultJSON, err := json.Marshal(audit.Result); err == nil {
			auditMap["result"] = json.RawMessage(resultJSON)
		}
	}

	// Log to audit service
	// Using action="mcp_tool_call" and resource_type="mcp"
	_ = auditService.LogOperation(
		ctx,
		audit.OrgID,
		audit.UserID,
		"mcp_tool_call",
		"mcp",
		0, // resource_id not applicable for MCP
		auditMap,
		200, // status code - we're logging success even if tool returned error
	)
}
