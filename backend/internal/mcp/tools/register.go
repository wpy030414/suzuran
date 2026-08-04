package tools

import (
	mcpserver "github.com/xrl/suzuran-cloud/internal/mcp"
	"github.com/xrl/suzuran-cloud/internal/service"
	"github.com/xrl/suzuran-cloud/internal/storage"
	"gorm.io/gorm"
)

// RegisterAllTools registers all MCP tools with the server.
func RegisterAllTools(
	server *mcpserver.MCPServer,
	orgService *service.OrgService,
	userService *service.UserService,
	deptService *service.DepartmentService,
	fileStorage *storage.MinIOClient,
	db *gorm.DB,
) {
	// Register organization tools
	orgTools := NewOrgTools(orgService)
	orgTools.RegisterTools(server)

	// Register user tools
	userTools := NewUserTools(userService)
	userTools.RegisterTools(server)

	// Register department tools
	deptTools := NewDeptTools(deptService)
	deptTools.RegisterTools(server)

	// Register file tools (only if file storage is available)
	if fileStorage != nil {
		fileTools := NewFileTools(fileStorage)
		fileTools.RegisterTools(server)
	}

	// Register audit tools
	auditTools := NewAuditTools(db)
	auditTools.RegisterTools(server)
}
