package tenant

import (
	handlercommon "github.com/xrl/suzuran-cloud/internal/handler/common"
	"github.com/xrl/suzuran-cloud/internal/service"
)

// UserHandler handles tenant-side member management.
// org_id is resolved from the gin context (set by auth middleware).
type UserHandler struct {
	*handlercommon.OrgMgmtHandler
}

// NewUserHandler creates a tenant-scoped UserHandler.
func NewUserHandler(us *service.UserService) *UserHandler {
	return &UserHandler{
		OrgMgmtHandler: handlercommon.NewOrgMgmtHandler(
			handlercommon.FromContext, nil, us),
	}
}
