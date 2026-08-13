package provider

import (
	handlercommon "github.com/xrl/suzuran-cloud/internal/handler/common"
	"github.com/xrl/suzuran-cloud/internal/service"
)

// OrgMemberHandler exposes department + member management for the provider portal.
// org_id is resolved from the :orgId URL parameter.
type OrgMemberHandler struct {
	*handlercommon.OrgMgmtHandler
}

// NewOrgMemberHandler creates a provider-scoped OrgMemberHandler.
func NewOrgMemberHandler(ds *service.DepartmentService, us *service.UserService) *OrgMemberHandler {
	return &OrgMemberHandler{
		OrgMgmtHandler: handlercommon.NewOrgMgmtHandler(
			handlercommon.FromParam("orgId"), ds, us),
	}
}
