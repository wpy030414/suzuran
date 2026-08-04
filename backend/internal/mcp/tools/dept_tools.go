package tools

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	mcpserver "github.com/xrl/suzuran-cloud/internal/mcp"
	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/service"
)

// DeptTools provides department-related MCP tools.
type DeptTools struct {
	deptService *service.DepartmentService
}

// NewDeptTools creates a new DeptTools instance.
func NewDeptTools(deptService *service.DepartmentService) *DeptTools {
	return &DeptTools{deptService: deptService}
}

// RegisterTools registers all department tools with the MCP server.
func (t *DeptTools) RegisterTools(server *mcpserver.MCPServer) {
	// dept.list - List departments
	server.AddTool(
		mcp.Tool{
			Name:        "dept.list",
			Description: "List all departments in an organization",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"orgId": map[string]interface{}{
						"type":        "integer",
						"description": "Organization ID",
					},
				},
				Required: []string{"orgId"},
			},
		},
		mcpserver.WrapToolHandler(mcpserver.ToolConfig{
			Name:          "dept.list",
			Description:   "List departments",
			RequiredScope: "org.read",
			Handler:       t.handleDeptList,
		}),
	)

	// dept.get - Get department details
	server.AddTool(
		mcp.Tool{
			Name:        "dept.get",
			Description: "Get department details by ID",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"deptId": map[string]interface{}{
						"type":        "integer",
						"description": "Department ID",
					},
				},
				Required: []string{"deptId"},
			},
		},
		mcpserver.WrapToolHandler(mcpserver.ToolConfig{
			Name:          "dept.get",
			Description:   "Get department",
			RequiredScope: "org.read",
			Handler:       t.handleDeptGet,
		}),
	)

	// dept.tree - Get department tree
	server.AddTool(
		mcp.Tool{
			Name:        "dept.tree",
			Description: "Get department tree structure for an organization",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"orgId": map[string]interface{}{
						"type":        "integer",
						"description": "Organization ID",
					},
				},
				Required: []string{"orgId"},
			},
		},
		mcpserver.WrapToolHandler(mcpserver.ToolConfig{
			Name:          "dept.tree",
			Description:   "Get department tree",
			RequiredScope: "org.read",
			Handler:       t.handleDeptTree,
		}),
	)

	// dept.create - Create department
	server.AddTool(
		mcp.Tool{
			Name:        "dept.create",
			Description: "Create a new department",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"orgId": map[string]interface{}{
						"type":        "integer",
						"description": "Organization ID",
					},
					"name": map[string]interface{}{
						"type":        "string",
						"description": "Department name",
					},
					"parentId": map[string]interface{}{
						"type":        "integer",
						"description": "Parent department ID (optional)",
					},
					"level": map[string]interface{}{
						"type":        "integer",
						"description": "Department level (default: 1)",
					},
					"description": map[string]interface{}{
						"type":        "string",
						"description": "Department description (optional)",
					},
				},
				Required: []string{"orgId", "name"},
			},
		},
		mcpserver.WrapToolHandler(mcpserver.ToolConfig{
			Name:          "dept.create",
			Description:   "Create department",
			RequiredScope: "org.write",
			Handler:       t.handleDeptCreate,
		}),
	)

	// dept.update - Update department
	server.AddTool(
		mcp.Tool{
			Name:        "dept.update",
			Description: "Update department information",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"deptId": map[string]interface{}{
						"type":        "integer",
						"description": "Department ID",
					},
					"name": map[string]interface{}{
						"type":        "string",
						"description": "New name (optional)",
					},
					"parentId": map[string]interface{}{
						"type":        "integer",
						"description": "New parent department ID (optional)",
					},
					"level": map[string]interface{}{
						"type":        "integer",
						"description": "New level (optional)",
					},
					"description": map[string]interface{}{
						"type":        "string",
						"description": "New description (optional)",
					},
				},
				Required: []string{"deptId"},
			},
		},
		mcpserver.WrapToolHandler(mcpserver.ToolConfig{
			Name:          "dept.update",
			Description:   "Update department",
			RequiredScope: "org.write",
			Handler:       t.handleDeptUpdate,
		}),
	)

	// dept.delete - Delete department
	server.AddTool(
		mcp.Tool{
			Name:        "dept.delete",
			Description: "Delete a department",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"deptId": map[string]interface{}{
						"type":        "integer",
						"description": "Department ID to delete",
					},
				},
				Required: []string{"deptId"},
			},
		},
		mcpserver.WrapToolHandler(mcpserver.ToolConfig{
			Name:          "dept.delete",
			Description:   "Delete department",
			RequiredScope: "org.write",
			Handler:       t.handleDeptDelete,
		}),
	)

	// dept.set_manager - Set department manager
	server.AddTool(
		mcp.Tool{
			Name:        "dept.set_manager",
			Description: "Set the manager for a department",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"deptId": map[string]interface{}{
						"type":        "integer",
						"description": "Department ID",
					},
					"managerUserId": map[string]interface{}{
						"type":        "integer",
						"description": "User ID to set as manager",
					},
				},
				Required: []string{"deptId", "managerUserId"},
			},
		},
		mcpserver.WrapToolHandler(mcpserver.ToolConfig{
			Name:          "dept.set_manager",
			Description:   "Set department manager",
			RequiredScope: "org.write",
			Handler:       t.handleDeptSetManager,
		}),
	)
}

// handleDeptList handles the dept.list tool.
func (t *DeptTools) handleDeptList(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	orgID, err := mcpserver.GetIntArg(request.Params.Arguments, "orgId")
	if err != nil {
		return nil, err
	}

	depts, err := t.deptService.GetDeptsByOrgID(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list departments: %w", err)
	}

	return mcpserver.CreateSuccessResponse(map[string]interface{}{
		"departments": depts,
	})
}

// handleDeptGet handles the dept.get tool.
func (t *DeptTools) handleDeptGet(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	deptID, err := mcpserver.GetIntArg(request.Params.Arguments, "deptId")
	if err != nil {
		return nil, err
	}

	dept, err := t.deptService.GetDeptByID(ctx, deptID)
	if err != nil {
		return nil, fmt.Errorf("failed to get department: %w", err)
	}
	if dept == nil {
		return nil, fmt.Errorf("department not found: %d", deptID)
	}

	return mcpserver.CreateSuccessResponse(dept)
}

// handleDeptTree handles the dept.tree tool.
func (t *DeptTools) handleDeptTree(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	orgID, err := mcpserver.GetIntArg(request.Params.Arguments, "orgId")
	if err != nil {
		return nil, err
	}

	tree, err := t.deptService.BuildTree(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to build department tree: %w", err)
	}

	return mcpserver.CreateSuccessResponse(map[string]interface{}{
		"tree": tree,
	})
}

// handleDeptCreate handles the dept.create tool.
func (t *DeptTools) handleDeptCreate(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	orgID, err := mcpserver.GetIntArg(request.Params.Arguments, "orgId")
	if err != nil {
		return nil, err
	}

	name, err := mcpserver.GetStringArg(request.Params.Arguments, "name")
	if err != nil {
		return nil, err
	}

	level := mcpserver.GetOptionalIntArg(request.Params.Arguments, "level", 1)
	description := mcpserver.GetOptionalStringArg(request.Params.Arguments, "description", "")

	// Optional parent ID
	var parentID *int
	if parentIDArg, ok := request.Params.Arguments["parentId"]; ok {
		if id, ok := parentIDArg.(float64); ok {
			idInt := int(id)
			parentID = &idInt
		}
	}

	dept := &model.Department{
		OrgID:       orgID,
		Name:        name,
		ParentID:    parentID,
		Level:       level,
		Description: description,
	}

	created, err := t.deptService.CreateDept(ctx, dept)
	if err != nil {
		return nil, fmt.Errorf("failed to create department: %w", err)
	}

	return mcpserver.CreateSuccessResponse(created)
}

// handleDeptUpdate handles the dept.update tool.
func (t *DeptTools) handleDeptUpdate(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	deptID, err := mcpserver.GetIntArg(request.Params.Arguments, "deptId")
	if err != nil {
		return nil, err
	}

	// Get existing department
	dept, err := t.deptService.GetDeptByID(ctx, deptID)
	if err != nil {
		return nil, fmt.Errorf("failed to get department: %w", err)
	}
	if dept == nil {
		return nil, fmt.Errorf("department not found: %d", deptID)
	}

	// Update fields if provided
	if name, ok := request.Params.Arguments["name"].(string); ok && name != "" {
		dept.Name = name
	}
	if description, ok := request.Params.Arguments["description"].(string); ok {
		dept.Description = description
	}
	if level, ok := request.Params.Arguments["level"].(float64); ok {
		dept.Level = int(level)
	}
	if parentIDArg, ok := request.Params.Arguments["parentId"]; ok {
		if id, ok := parentIDArg.(float64); ok {
			idInt := int(id)
			dept.ParentID = &idInt
		}
	}

	err = t.deptService.UpdateDept(ctx, dept)
	if err != nil {
		return nil, fmt.Errorf("failed to update department: %w", err)
	}

	return mcpserver.CreateSuccessResponse(map[string]interface{}{
		"success": true,
		"message": "Department updated successfully",
	})
}

// handleDeptDelete handles the dept.delete tool.
func (t *DeptTools) handleDeptDelete(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	deptID, err := mcpserver.GetIntArg(request.Params.Arguments, "deptId")
	if err != nil {
		return nil, err
	}

	err = t.deptService.DeleteDept(ctx, deptID)
	if err != nil {
		return nil, fmt.Errorf("failed to delete department: %w", err)
	}

	return mcpserver.CreateSuccessResponse(map[string]interface{}{
		"success": true,
		"message": "Department deleted successfully",
	})
}

// handleDeptSetManager handles the dept.set_manager tool.
func (t *DeptTools) handleDeptSetManager(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	deptID, err := mcpserver.GetIntArg(request.Params.Arguments, "deptId")
	if err != nil {
		return nil, err
	}

	managerUserID, err := mcpserver.GetIntArg(request.Params.Arguments, "managerUserId")
	if err != nil {
		return nil, err
	}

	err = t.deptService.SetManager(ctx, deptID, managerUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to set department manager: %w", err)
	}

	return mcpserver.CreateSuccessResponse(map[string]interface{}{
		"success": true,
		"message": "Department manager set successfully",
	})
}
