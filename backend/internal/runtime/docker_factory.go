//go:build !windows

package runtime

import (
	"github.com/docker/docker/client"
)

// NewDockerClient creates a Docker client from the environment.
// On non-Windows platforms this directly wraps the Docker SDK client.
func NewDockerClient() (DockerClient, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}
	return cli, nil
}
