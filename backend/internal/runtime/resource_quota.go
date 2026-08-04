package runtime

import (
	"fmt"
	"strconv"
	"strings"
)

// ResourceQuota defines CPU and memory limits for a container.
type ResourceQuota struct {
	CPULimit    string // "0.5" → 50% of one core
	MemoryLimit int64  // bytes
	DBConnQuota int
}

// ResourceUsage represents current resource usage of a container.
type ResourceUsage struct {
	CPUUsage    float64 // percentage
	MemoryUsage int64   // bytes
}

// parseCPUQuota converts a CPU quota string (e.g. "0.5") to NanoCPUs (int64).
// Returns 0 if the string is empty or invalid.
func parseCPUQuota(quota string) int64 {
	if quota == "" {
		return 0
	}
	val, err := strconv.ParseFloat(quota, 64)
	if err != nil {
		return 0
	}
	return int64(val * 1e9)
}

// parseMemoryQuota converts a memory quota string (e.g. "512Mi", "1Gi") to bytes.
// Returns 0 if the string is empty or invalid.
func parseMemoryQuota(quota string) int64 {
	if quota == "" {
		return 0
	}
	quota = strings.TrimSpace(quota)
	if len(quota) < 2 {
		return 0
	}

	// Extract numeric part and unit
	var numStr string
	var unit string
	for i, c := range quota {
		if (c >= '0' && c <= '9') || c == '.' {
			numStr = quota[:i+1]
		} else {
			unit = strings.ToLower(quota[i:])
			break
		}
	}

	num, err := strconv.ParseFloat(numStr, 64)
	if err != nil {
		return 0
	}

	switch unit {
	case "", "b":
		return int64(num)
	case "k", "kb":
		return int64(num * 1000)
	case "ki":
		return int64(num * 1024)
	case "m", "mb":
		return int64(num * 1000 * 1000)
	case "mi":
		return int64(num * 1024 * 1024)
	case "g", "gb":
		return int64(num * 1000 * 1000 * 1000)
	case "gi":
		return int64(num * 1024 * 1024 * 1024)
	default:
		return 0
	}
}

// ResourceQuotaFromApp builds a ResourceQuota from an Application's config.
func ResourceQuotaFromApp(app interface{ GetCPUQuota() string }) *ResourceQuota {
	return nil
}

// FormatMemory converts bytes to a human-readable string.
func FormatMemory(bytes int64) string {
	if bytes == 0 {
		return "0"
	}
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%dB", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	suffix := []string{"Ki", "Mi", "Gi", "Ti"}
	return fmt.Sprintf("%.1f%s", float64(bytes)/float64(div), suffix[exp])
}
