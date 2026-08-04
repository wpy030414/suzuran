package runtime

import (
	"context"
	"fmt"
	"log"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/network"
	"github.com/xrl/suzuran-cloud/internal/model"
)

// Sandbox holds the isolation resources for an application container.
type Sandbox struct {
	ContainerID string
	NetworkID   string
	Volumes     []string
}

// CreateSandbox creates an isolated Docker network for the application.
func (m *RuntimeManager) CreateSandbox(ctx context.Context, app *model.Application) (*Sandbox, error) {
	if m.docker == nil {
		return nil, fmt.Errorf("docker client not available")
	}

	netName := fmt.Sprintf("app-%s-net", app.ID)

	resp, err := m.docker.NetworkCreate(ctx, netName, network.CreateOptions{
		Driver:   "bridge",
		Internal: false,
		Labels: map[string]string{
			"app-id":      app.ID,
			"org-id":      fmt.Sprintf("%d", app.OrgID),
			"managed-by":  "suzuran-cloud",
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create network: %w", err)
	}

	sandbox := &Sandbox{
		NetworkID: resp.ID,
	}

	log.Printf("Created sandbox network %s (%s) for app %s", netName, resp.ID, app.ID)
	return sandbox, nil
}

// DestroySandbox removes the sandbox network and volumes.
func (m *RuntimeManager) DestroySandbox(ctx context.Context, sandbox *Sandbox) error {
	if m.docker == nil {
		return nil
	}

	if sandbox.NetworkID != "" {
		_ = m.docker.NetworkRemove(ctx, sandbox.NetworkID)
	}

	for _, vol := range sandbox.Volumes {
		_ = m.docker.VolumeRemove(ctx, vol, true)
	}

	return nil
}

// GetContainerIP retrieves the IP address of a container on a given network.
func (m *RuntimeManager) GetContainerIP(ctx context.Context, containerID, networkName string) (string, error) {
	if m.docker == nil {
		return "", fmt.Errorf("docker client not available")
	}
	info, err := m.docker.ContainerInspect(ctx, containerID)
	if err != nil {
		return "", err
	}
	if netSettings, ok := info.NetworkSettings.Networks[networkName]; ok {
		return netSettings.IPAddress, nil
	}
	for _, net := range info.NetworkSettings.Networks {
		if net.IPAddress != "" {
			return net.IPAddress, nil
		}
	}
	return "", fmt.Errorf("no IP address found for container %s", containerID)
}

// ListAppContainers lists all containers managed by Suzuran Cloud.
func (m *RuntimeManager) ListAppContainers(ctx context.Context) ([]types.Container, error) {
	if m.docker == nil {
		return nil, fmt.Errorf("docker client not available")
	}
	appFilter := filters.NewArgs(filters.Arg("label", "managed-by=suzuran-cloud"))
	return m.docker.ContainerList(ctx, container.ListOptions{
		All:     true,
		Filters: appFilter,
	})
}
