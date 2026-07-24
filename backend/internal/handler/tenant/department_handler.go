package tenant

import (
	handlercommon "github.com/xrl/suzuran-cloud/internal/handler/common"
	"github.com/xrl/suzuran-cloud/internal/service"
)

// DepartmentHandler handles tenant-side department management.
// org_id is resolved from the gin context (set by auth middleware).
type DepartmentHandler struct {
	*handlercommon.OrgMgmtHandler
}

// NewDepartmentHandler creates a tenant-scoped DepartmentHandler.
func NewDepartmentHandler(ds *service.DepartmentService, us *service.UserService) *DepartmentHandler {
	return &DepartmentHandler{
		OrgMgmtHandler: handlercommon.NewOrgMgmtHandler(
			handlercommon.FromContext, ds, us, ""),
	}
}
