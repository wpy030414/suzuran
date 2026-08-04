//go:build windows

package runtime

import (
	"fmt"
)

// NewDockerClient returns a stub on Windows during local development.
// The Docker SDK has Windows-specific compilation issues (sockets.DialPipe),
// so we return a no-op client. In production, the backend runs inside a
// Linux container where the real implementation (docker_factory_unix.go) is used.
func NewDockerClient() (DockerClient, error) {
	return nil, fmt.Errorf("docker client not supported on Windows; run backend in a Linux container")
}
