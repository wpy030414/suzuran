package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/redis/go-redis/v9"
	"github.com/xrl/suzuran-cloud/internal/service"
)

// ToolHandler is a function that handles a tool call.
type ToolHandler func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error)

// ToolConfig holds configuration for a tool.
type ToolConfig struct {
	Name          string
	Description   string
	Handler       ToolHandler
	RequiredScope string
	RateLimiter   *RateLimiter
	AuditService  *service.AuditService
}

// WrapToolHandler wraps a tool handler with authentication, rate limiting, and audit logging.
func WrapToolHandler(config ToolConfig) ToolHandler {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		startTime := time.Now()

		// 1. Extract org_id from arguments if present
		orgID := 0
		if orgIDArg, ok := request.Params.Arguments["orgId"]; ok {
			if id, ok := orgIDArg.(float64); ok {
				orgID = int(id)
			}
		}

		// 2. Validate authentication and authorization
		if err := ValidateToolCall(ctx, config.RequiredScope, orgID); err != nil {
			return CreateErrorResponse(err.Error()), err
		}

		// 3. Check rate limit
		if config.RateLimiter != nil {
			userID, _ := GetUserIDFromContext(ctx)
			if err := config.RateLimiter.Check(ctx, userID, config.Name); err != nil {
				return CreateErrorResponse(err.Error()), err
			}
		}

		// 4. Execute the actual handler
		result, err := config.Handler(ctx, request)

		// 5. Calculate duration
		duration := time.Since(startTime)

		// 6. Audit log
		if config.AuditService != nil {
			AuditToolCall(ctx, config.AuditService, config.Name, request, result, err, duration)
		}

		return result, err
	}
}

// GetIntArg extracts an integer argument from the request.
func GetIntArg(args map[string]interface{}, key string) (int, error) {
	val, ok := args[key]
	if !ok {
		return 0, fmt.Errorf("missing required argument: %s", key)
	}

	// JSON numbers are float64
	if num, ok := val.(float64); ok {
		return int(num), nil
	}

	return 0, fmt.Errorf("argument %s must be a number", key)
}

// GetStringArg extracts a string argument from the request.
func GetStringArg(args map[string]interface{}, key string) (string, error) {
	val, ok := args[key]
	if !ok {
		return "", fmt.Errorf("missing required argument: %s", key)
	}
	str, ok := val.(string)
	if !ok {
		return "", fmt.Errorf("argument %s must be a string", key)
	}
	return str, nil
}

// GetOptionalIntArg extracts an optional integer argument with a default value.
func GetOptionalIntArg(args map[string]interface{}, key string, defaultValue int) int {
	val, ok := args[key]
	if !ok {
		return defaultValue
	}

	if num, ok := val.(float64); ok {
		return int(num)
	}

	return defaultValue
}

// GetOptionalStringArg extracts an optional string argument with a default value.
func GetOptionalStringArg(args map[string]interface{}, key string, defaultValue string) string {
	val, ok := args[key]
	if !ok {
		return defaultValue
	}

	if str, ok := val.(string); ok {
		return str
	}

	return defaultValue
}

// GetOptionalBoolArg extracts an optional boolean argument with a default value.
func GetOptionalBoolArg(args map[string]interface{}, key string, defaultValue bool) bool {
	val, ok := args[key]
	if !ok {
		return defaultValue
	}

	if b, ok := val.(bool); ok {
		return b
	}

	return defaultValue
}

// CreateSuccessResponse creates a success response with JSON data.
func CreateSuccessResponse(data interface{}) (*mcp.CallToolResult, error) {
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal response: %w", err)
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: string(jsonData),
			},
		},
	}, nil
}

// CreateErrorResponse creates an error response for a tool call.
func CreateErrorResponse(message string) *mcp.CallToolResult {
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: fmt.Sprintf("Error: %s", message),
			},
		},
		IsError: true,
	}
}

// NewDefaultRateLimiter creates a rate limiter with default settings (100 requests per minute).
func NewDefaultRateLimiter(client *redis.Client) *RateLimiter {
	return NewRateLimiter(client, 100, time.Minute)
}
