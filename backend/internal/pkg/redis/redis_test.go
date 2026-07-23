package redis_test

import (
	"context"
	"testing"
	"time"

	"github.com/xrl/suzuran-cloud/internal/pkg/redis"
	"github.com/stretchr/testify/require"
)

// tryConnect attempts a quick ping to see if Redis is available.
func tryConnect(t *testing.T) {
	t.Helper()
	err := redis.InitClient()
	if err != nil {
		t.Skipf("Redis not available, skipping: %v", err)
	}
}

func TestInitClient_InvalidAddress(t *testing.T) {
	t.Setenv("REDIS_ADDR", "localhost:1")
	err := redis.InitClient()
	require.Error(t, err)
}

func TestInitClient_DefaultAddress(t *testing.T) {
	t.Setenv("REDIS_ADDR", "")
	err := redis.InitClient()
	if err != nil {
		t.Skipf("Redis not available at default address, skipping: %v", err)
	}
}

func TestSetGetDelete(t *testing.T) {
	t.Setenv("REDIS_ADDR", "localhost:6379")
	t.Setenv("REDIS_PASSWORD", "")
	tryConnect(t)

	ctx := context.Background()
	key := "test:suzuran:ping"
	val := "pong"

	err := redis.Set(ctx, key, val, 10*time.Second)
	require.NoError(t, err)

	result := redis.Get(ctx, key)
	require.NoError(t, result.Err())
	require.Equal(t, val, result.Val())

	err = redis.Delete(ctx, key)
	require.NoError(t, err)

	result = redis.Get(ctx, key)
	require.Error(t, result.Err())
}

func TestGet_NonexistentKey(t *testing.T) {
	t.Setenv("REDIS_ADDR", "localhost:6379")
	t.Setenv("REDIS_PASSWORD", "")
	tryConnect(t)

	ctx := context.Background()
	result := redis.Get(ctx, "test:suzuran:nonexistent-key-xyz")
	require.Error(t, result.Err())
}
