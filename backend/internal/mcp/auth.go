package mcp

import (
	"context"
	"errors"
)

// AuthError represents an authentication or authorization error.
type AuthError struct {
	Message string
	Code    int
}

func (e *AuthError) Error() string {
	return e.Message
}

// RequireScope checks if the context contains the required scope.
// Returns an error if the scope is not present.
func RequireScope(ctx context.Context, requiredScope string) error {
	scopes, err := GetScopesFromContext(ctx)
	if err != nil {
		return &AuthError{
			Message: "no scopes in context",
			Code:    403,
		}
	}

	// Check if the required scope is present
	for _, scope := range scopes {
		if scope == requiredScope {
			return nil
		}
	}

	// Special case: "admin" scope grants all permissions
	for _, scope := range scopes {
		if scope == "admin" {
			return nil
		}
	}

	return &AuthError{
		Message: "insufficient scope: " + requiredScope,
		Code:    403,
	}
}

// RequireRole checks if the context contains one of the required roles.
// Returns an error if none of the roles match.
func RequireRole(ctx context.Context, roles ...string) error {
	currentRole, err := GetRoleFromContext(ctx)
	if err != nil {
		return &AuthError{
			Message: "no role in context",
			Code:    403,
		}
	}

	for _, role := range roles {
		if currentRole == role {
			return nil
		}
	}

	return &AuthError{
		Message: "insufficient role",
		Code:    403,
	}
}

// RequireOrgAccess checks if the user has access to the specified org.
// This is a simplified check - in production you'd verify the user's
// org memberships through the database.
func RequireOrgAccess(ctx context.Context, targetOrgID int) error {
	// Get the current user's org_id from context
	userOrgID, err := GetOrgIDFromContext(ctx)
	if err != nil {
		return &AuthError{
			Message: "no org_id in context",
			Code:    403,
		}
	}

	// For now, only allow access to the user's own org
	// In a more complex system, you'd check org memberships here
	if userOrgID != targetOrgID {
		return &AuthError{
			Message: "access denied to org",
			Code:    403,
		}
	}

	return nil
}

// ValidateToolCall performs comprehensive validation before executing a tool.
// It checks authentication, authorization, and scope requirements.
func ValidateToolCall(ctx context.Context, requiredScope string, requiredOrgID int) error {
	// 1. Check authentication
	_, err := GetUserIDFromContext(ctx)
	if err != nil {
		return &AuthError{
			Message: "unauthenticated",
			Code:    401,
		}
	}

	// 2. Check scope
	if err := RequireScope(ctx, requiredScope); err != nil {
		return err
	}

	// 3. Check org access
	if requiredOrgID > 0 {
		if err := RequireOrgAccess(ctx, requiredOrgID); err != nil {
			return err
		}
	}

	return nil
}

// IsAuthError checks if an error is an authentication/authorization error.
func IsAuthError(err error) bool {
	var authErr *AuthError
	return errors.As(err, &authErr)
}

// GetAuthErrorCode returns the HTTP status code for an auth error.
func GetAuthErrorCode(err error) int {
	var authErr *AuthError
	if errors.As(err, &authErr) {
		return authErr.Code
	}
	return 500
}
