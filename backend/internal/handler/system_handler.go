package handler

import (
	"fmt"
	"net/http"
	"os/exec"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// getSystemMemory returns total system memory in bytes using syscall
func getSystemMemory() (uint64, uint64) {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	// Get actual system total memory
	var totalMemory uint64

	switch runtime.GOOS {
	case "darwin":
		// On macOS, use os/exec to call sysctl
		totalMemory = 8 * 1024 * 1024 * 1024 // Default 8GB
		cmd := exec.Command("sysctl", "-n", "hw.memsize")
		if output, err := cmd.Output(); err == nil {
			var memSize uint64
			if _, err := fmt.Sscanf(string(output), "%d", &memSize); err == nil {
				totalMemory = memSize
			}
		}
	default:
		// For other systems, use a reasonable estimate
		totalMemory = 8 * 1024 * 1024 * 1024 // 8GB default
	}

	return mem.Alloc, totalMemory
}

// SystemHandler handles system monitoring requests
type SystemHandler struct {
	db *gorm.DB
}

// NewSystemHandler creates a new system handler
func NewSystemHandler(db *gorm.DB) *SystemHandler {
	return &SystemHandler{db: db}
}

// SystemMetrics represents system metrics
type SystemMetrics struct {
	MemoryUsage    uint64 `json:"memoryUsage"` // bytes
	MemoryTotal    uint64 `json:"memoryTotal"` // bytes
	DiskUsage      uint64 `json:"diskUsage"`   // bytes
	DiskTotal      uint64 `json:"diskTotal"`   // bytes
	CPUCores       int    `json:"cpuCores"`
	GoroutineCount int    `json:"goroutineCount"`
	Uptime         string `json:"uptime"`
	Timestamp      string `json:"timestamp"`
}

// GetSystemMetrics returns current system metrics
func (h *SystemHandler) GetSystemMetrics(c *gin.Context) {
	memoryUsage, memoryTotal := getSystemMemory()

	metrics := &SystemMetrics{
		MemoryUsage:    memoryUsage,
		MemoryTotal:    memoryTotal,
		CPUCores:       runtime.NumCPU(),
		GoroutineCount: runtime.NumGoroutine(),
		Timestamp:      time.Now().Format(time.RFC3339),
	}

	// Get disk usage using platform-specific implementation
	if diskStats, err := getDiskUsage("."); err == nil && diskStats != nil {
		metrics.DiskTotal = diskStats.Total
		metrics.DiskUsage = diskStats.Used
	} else {
		// Set default values if disk info not available
		metrics.DiskTotal = 0
		metrics.DiskUsage = 0
	}

	// Calculate uptime from server start time
	startTime, exists := c.Get("serverStartTime")
	if exists {
		if startTimeStr, ok := startTime.(string); ok {
			if t, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
				duration := time.Since(t)
				hours := int(duration.Hours())
				minutes := int(duration.Minutes()) % 60
				metrics.Uptime = formatDuration(hours, minutes)
			}
		}
	}

	c.JSON(http.StatusOK, metrics)
}

// DatabaseMetrics represents database connection metrics
type DatabaseMetrics struct {
	ActiveConnections int    `json:"activeConnections"`
	IdleConnections   int    `json:"idleConnections"`
	MaxOpenConns      int    `json:"maxOpenConns"`
	OpenConnections   int    `json:"openConnections"`
	InUse             int    `json:"inUse"`
	Idle              int    `json:"idle"`
	WaitCount         int64  `json:"waitCount"`
	WaitDuration      string `json:"waitDuration"`
	MaxIdleClosed     int64  `json:"maxIdleClosed"`
	MaxLifetimeClosed int64  `json:"maxLifetimeClosed"`
}

// GetDatabaseMetrics returns database connection pool metrics
func (h *SystemHandler) GetDatabaseMetrics(c *gin.Context) {
	sqlDB, err := h.db.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	stats := sqlDB.Stats()

	metrics := &DatabaseMetrics{
		ActiveConnections: stats.InUse,
		IdleConnections:   stats.Idle,
		MaxOpenConns:      stats.MaxOpenConnections,
		OpenConnections:   stats.OpenConnections,
		InUse:             stats.InUse,
		Idle:              stats.Idle,
		WaitCount:         stats.WaitCount,
		WaitDuration:      stats.WaitDuration.String(),
		MaxIdleClosed:     stats.MaxIdleClosed,
		MaxLifetimeClosed: stats.MaxLifetimeClosed,
	}

	c.JSON(http.StatusOK, metrics)
}

func formatDuration(hours, minutes int) string {
	if hours > 0 {
		return fmt.Sprintf("%d小时%d分钟", hours, minutes)
	}
	return fmt.Sprintf("%d分钟", minutes)
}
