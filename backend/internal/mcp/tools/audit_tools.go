package tools

import (
	"context"
	"fmt"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	mcpserver "github.com/xrl/suzuran-cloud/internal/mcp"
	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/service"
	"gorm.io/gorm"
)

// AuditTools provides audit logging-related MCP tools.
type AuditTools struct {
	db           *gorm.DB
	rateLimiter  *mcpserver.RateLimiter
	auditService *service.AuditService
}

// NewAuditTools creates a new AuditTools instance.
func NewAuditTools(db *gorm.DB, rl *mcpserver.RateLimiter, as *service.AuditService) *AuditTools {
	return &AuditTools{db: db, rateLimiter: rl, auditService: as}
}

// RegisterTools registers all audit tools with the MCP server.
func (t *AuditTools) RegisterTools(server *mcpserver.MCPServer) {
	// audit.query - Query audit logs
	server.AddTool(
		mcp.Tool{
			Name:        "audit.query",
			Description: "Query audit logs with filters",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"orgId": map[string]interface{}{
						"type":        "integer",
						"description": "Organization ID (optional)",
					},
					"userId": map[string]interface{}{
						"type":        "integer",
						"description": "User ID (optional)",
					},
					"action": map[string]interface{}{
						"type":        "string",
						"description": "Action type (optional, e.g., create, update, delete)",
					},
					"resourceType": map[string]interface{}{
						"type":        "string",
						"description": "Resource type (optional, e.g., user, org, dept)",
					},
					"startTime": map[string]interface{}{
						"type":        "string",
						"description": "Start time in RFC3339 format (optional)",
					},
					"endTime": map[string]interface{}{
						"type":        "string",
						"description": "End time in RFC3339 format (optional)",
					},
					"limit": map[string]interface{}{
						"type":        "integer",
						"description": "Maximum number of logs to return (default: 100)",
					},
					"offset": map[string]interface{}{
						"type":        "integer",
						"description": "Offset for pagination (default: 0)",
					},
				},
			},
		},
		mcpserver.WrapToolHandler(mcpserver.ToolConfig{
			Name:          "audit.query",
			Description:   "Query audit logs",
			RequiredScope: "audit.read",
			Handler:       t.handleAuditQuery,
			RateLimiter:   t.rateLimiter,
			AuditService:  t.auditService,
		}),
	)

	// audit.log - Create an audit log entry
	server.AddTool(
		mcp.Tool{
			Name:        "audit.log",
			Description: "Create a custom audit log entry",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"orgId": map[string]interface{}{
						"type":        "integer",
						"description": "Organization ID",
					},
					"action": map[string]interface{}{
						"type":        "string",
						"description": "Action performed",
					},
					"resourceType": map[string]interface{}{
						"type":        "string",
						"description": "Type of resource affected",
					},
					"resourceId": map[string]interface{}{
						"type":        "integer",
						"description": "ID of the resource affected (optional)",
					},
					"metadata": map[string]interface{}{
						"type":        "object",
						"description": "Additional metadata (optional)",
					},
				},
				Required: []string{"orgId", "action", "resourceType"},
			},
		},
		mcpserver.WrapToolHandler(mcpserver.ToolConfig{
			Name:          "audit.log",
			Description:   "Create audit log",
			RequiredScope: "audit.write",
			Handler:       t.handleAuditLog,
			RateLimiter:   t.rateLimiter,
			AuditService:  t.auditService,
		}),
	)
}

// handleAuditQuery handles the audit.query tool.
func (t *AuditTools) handleAuditQuery(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	// Build query
	query := t.db.WithContext(ctx).Model(&model.AuditLog{})

	// Apply filters
	if orgID, ok := request.Params.Arguments["orgId"].(float64); ok {
		query = query.Where("org_id = ?", int(orgID))
	}

	if userID, ok := request.Params.Arguments["userId"].(float64); ok {
		query = query.Where("user_id = ?", int(userID))
	}

	if action, ok := request.Params.Arguments["action"].(string); ok && action != "" {
		query = query.Where("action = ?", action)
	}

	if resourceType, ok := request.Params.Arguments["resourceType"].(string); ok && resourceType != "" {
		query = query.Where("resource_type = ?", resourceType)
	}

	if startTimeStr, ok := request.Params.Arguments["startTime"].(string); ok && startTimeStr != "" {
		startTime, err := time.Parse(time.RFC3339, startTimeStr)
		if err != nil {
			return nil, fmt.Errorf("invalid startTime format: %w", err)
		}
		query = query.Where("created_at >= ?", startTime)
	}

	if endTimeStr, ok := request.Params.Arguments["endTime"].(string); ok && endTimeStr != "" {
		endTime, err := time.Parse(time.RFC3339, endTimeStr)
		if err != nil {
			return nil, fmt.Errorf("invalid endTime format: %w", err)
		}
		query = query.Where("created_at <= ?", endTime)
	}

	// Apply pagination
	limit := mcpserver.GetOptionalIntArg(request.Params.Arguments, "limit", 100)
	offset := mcpserver.GetOptionalIntArg(request.Params.Arguments, "offset", 0)

	query = query.Limit(limit).Offset(offset)

	// Order by created_at descending
	query = query.Order("created_at DESC")

	// Execute query
	var logs []model.AuditLog
	if err := query.Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("failed to query audit logs: %w", err)
	}

	return mcpserver.CreateSuccessResponse(map[string]interface{}{
		"logs": logs,
		"count": len(logs),
		"limit": limit,
		"offset": offset,
	})
}

// handleAuditLog handles the audit.log tool.
func (t *AuditTools) handleAuditLog(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	orgID, err := mcpserver.GetIntArg(request.Params.Arguments, "orgId")
	if err != nil {
		return nil, err
	}

	action, err := mcpserver.GetStringArg(request.Params.Arguments, "action")
	if err != nil {
		return nil, err
	}

	resourceType, err := mcpserver.GetStringArg(request.Params.Arguments, "resourceType")
	if err != nil {
		return nil, err
	}

	// Get user ID from context
	userID, err := mcpserver.GetUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	// Build audit log entry
	log := &model.AuditLog{
		OrgID:        &orgID,
		UserID:       &userID,
		Action:       action,
		ResourceType: resourceType,
		CreatedAt:    time.Now(),
	}

	// Optional resource ID
	if resourceID, ok := request.Params.Arguments["resourceId"].(float64); ok {
		id := int(resourceID)
		log.ResourceID = &id
	}

	// Optional metadata
	if metadata, ok := request.Params.Arguments["metadata"].(map[string]interface{}); ok {
		log.RequestData = model.JSONB(metadata)
	}

	// Save to database
	if err := t.db.WithContext(ctx).Create(log).Error; err != nil {
		return nil, fmt.Errorf("failed to create audit log: %w", err)
	}

	return mcpserver.CreateSuccessResponse(map[string]interface{}{
		"success": true,
		"message": "Audit log created successfully",
		"logId":   log.ID,
	})
}
