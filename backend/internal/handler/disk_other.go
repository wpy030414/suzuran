//go:build !linux

package handler

// DiskStats represents disk usage statistics
type DiskStats struct {
	Total uint64
	Used  uint64
	Free  uint64
}

// getDiskUsage returns disk usage statistics for the given path
// On non-Linux platforms, returns nil to indicate unsupported
func getDiskUsage(path string) (*DiskStats, error) {
	// Disk statistics not supported on this platform
	return nil, nil
}
