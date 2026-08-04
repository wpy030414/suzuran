package mcp

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RateLimitError represents a rate limit exceeded error.
type RateLimitError struct {
	Limit     int
	Remaining int
	ResetAt   time.Time
}

func (e *RateLimitError) Error() string {
	return fmt.Sprintf("rate limit exceeded: %d requests per minute, reset at %s", e.Limit, e.ResetAt.Format(time.RFC3339))
}

// RateLimiter implements a sliding window rate limiter using Redis.
type RateLimiter struct {
	client *redis.Client
	limit  int
	window time.Duration
}

// NewRateLimiter creates a new rate limiter.
// limit: maximum number of requests allowed in the window
// window: time window for the rate limit (e.g., 1 minute)
func NewRateLimiter(client *redis.Client, limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		client: client,
		limit:  limit,
		window: window,
	}
}

// Check checks if the request should be rate limited.
// Returns nil if the request is allowed, or a RateLimitError if exceeded.
func (r *RateLimiter) Check(ctx context.Context, userID int, toolName string) error {
	if r.client == nil {
		// No Redis client, skip rate limiting
		return nil
	}

	now := time.Now()
	windowStart := now.Add(-r.window)

	// Redis key for this user's rate limit
	key := fmt.Sprintf("mcp:ratelimit:%d:%s", userID, toolName)

	// Use Redis sorted set to track requests
	// Score is the timestamp, member is a unique request ID
	pipe := r.client.Pipeline()

	// Remove old entries outside the window
	pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", windowStart.Unix()))

	// Add current request
	pipe.ZAdd(ctx, key, redis.Z{
		Score:  float64(now.Unix()),
		Member: fmt.Sprintf("%d", now.UnixNano()),
	})

	// Count requests in the window
	countCmd := pipe.ZCard(ctx, key)

	// Set expiration on the key (clean up after window expires)
	pipe.Expire(ctx, key, r.window)

	// Execute pipeline
	_, err := pipe.Exec(ctx)
	if err != nil {
		// If Redis fails, allow the request (fail open)
		// In production, you might want to fail closed or use a fallback
		return nil
	}

	count := int(countCmd.Val())

	if count > r.limit {
		// Calculate when the oldest request will expire
		oldest, err := r.client.ZRangeWithScores(ctx, key, 0, 0).Result()
		if err == nil && len(oldest) > 0 {
			oldestTimestamp := int64(oldest[0].Score)
			resetAt := time.Unix(oldestTimestamp, 0).Add(r.window)
			return &RateLimitError{
				Limit:     r.limit,
				Remaining: 0,
				ResetAt:   resetAt,
			}
		}
		return &RateLimitError{
			Limit:     r.limit,
			Remaining: 0,
			ResetAt:   now.Add(r.window),
		}
	}

	return nil
}

// GetRemaining returns the number of remaining requests for a user.
func (r *RateLimiter) GetRemaining(ctx context.Context, userID int, toolName string) (int, error) {
	if r.client == nil {
		return r.limit, nil
	}

	now := time.Now()
	windowStart := now.Add(-r.window)
	key := fmt.Sprintf("mcp:ratelimit:%d:%s", userID, toolName)

	// Remove old entries
	r.client.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", windowStart.Unix()))

	// Count current requests
	count, err := r.client.ZCard(ctx, key).Result()
	if err != nil {
		return 0, err
	}

	remaining := r.limit - int(count)
	if remaining < 0 {
		remaining = 0
	}

	return remaining, nil
}
