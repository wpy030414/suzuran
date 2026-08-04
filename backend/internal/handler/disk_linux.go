//go:build linux

package handler

import (
	"syscall"
)

// DiskStats represents disk usage statistics
type DiskStats struct {
	Total uint64
	Used  uint64
	Free  uint64
}

// getDiskUsage returns disk usage statistics for the given path
func getDiskUsage(path string) (*DiskStats, error) {
	var stat syscall.Statfs_t
	err := syscall.Statfs(path, &stat)
	if err != nil {
		return nil, err
	}

	total := stat.Blocks * uint64(stat.Bsize)
	free := stat.Bfree * uint64(stat.Bsize)
	used := total - free

	return &DiskStats{
		Total: total,
		Used:  used,
		Free:  free,
	}, nil
}
