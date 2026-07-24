package common

import (
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"
)

// OrgIDResolver resolves the organization ID from a gin context.
type OrgIDResolver func(*gin.Context) (int, error)

// FromContext resolves org_id from gin context (set by middleware for tenant).
func FromContext(c *gin.Context) (int, error) {
	v, exists := c.Get("org_id")
	if !exists {
		return 0, fmt.Errorf("org_id not found in context")
	}
	id, ok := v.(int)
	if !ok {
		return 0, fmt.Errorf("org_id has wrong type")
	}
	return id, nil
}

// FromParam resolves org_id from a URL path parameter (for provider).
func FromParam(name string) OrgIDResolver {
	return func(c *gin.Context) (int, error) {
		val := c.Param(name)
		id, err := strconv.Atoi(val)
		if err != nil {
			return 0, fmt.Errorf("invalid %s: %s", name, val)
		}
		return id, nil
	}
}
