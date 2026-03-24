package service

import (
	"context"
	"errors"
	"testing"
	"time"

	cerrdefs "github.com/containerd/errdefs"
	"github.com/wanglei/docker-view/internal/audit"
	"github.com/wanglei/docker-view/internal/docker"
)

func TestComposeProjectServiceProjects(t *testing.T) {
	svc := NewComposeProjectService(fakeComposeGateway{
		containers: []docker.Container{
			{
				ID:             "abc1234567890",
				Names:          []string{"/edge-proxy"},
				Image:          "nginx:latest",
				CreatedAt:      time.Date(2026, time.March, 20, 12, 0, 0, 0, time.UTC),
				State:          "running",
				Status:         "Up 2 hours",
				ComposeProject: "edge",
				Labels: map[string]string{
					composeServiceLabel: "proxy",
				},
				NetworkNames: []string{"edge_default"},
				Mounts: []docker.Mount{{
					Type: "volume",
					Name: "edge_cache",
				}},
			},
			{
				ID:             "def1234567890",
				Names:          []string{"/edge-api"},
				Image:          "api:latest",
				CreatedAt:      time.Date(2026, time.March, 20, 12, 1, 0, 0, time.UTC),
				State:          "exited",
				Status:         "Exited (0) 10 seconds ago",
				ComposeProject: "edge",
				Labels: map[string]string{
					composeServiceLabel: "api",
				},
				NetworkNames: []string{"edge_default"},
			},
		},
		networks: []docker.Network{{
			ID:        "network-1",
			Name:      "edge_default",
			CreatedAt: time.Date(2026, time.March, 20, 11, 55, 0, 0, time.UTC),
			Labels: map[string]string{
				composeProjectLabel: "edge",
			},
		}},
		volumes: []docker.Volume{{
			Name:      "edge_cache",
			CreatedAt: time.Date(2026, time.March, 20, 11, 56, 0, 0, time.UTC),
			Labels: map[string]string{
				composeProjectLabel: "edge",
			},
		}},
	})

	result, err := svc.Projects(context.Background(), ComposeProjectListParams{Query: "edge"})
	if err != nil {
		t.Fatalf("projects: %v", err)
	}

	if result.Total != 1 {
		t.Fatalf("unexpected total %d", result.Total)
	}

	project := result.Items[0]
	if project.Status != "partial" {
		t.Fatalf("unexpected status %q", project.Status)
	}
	if len(project.Services) != 2 || project.Services[0] != "api" || project.Services[1] != "proxy" {
		t.Fatalf("unexpected services %+v", project.Services)
	}
	if len(project.Networks) != 1 || project.Networks[0] != "edge_default" {
		t.Fatalf("unexpected networks %+v", project.Networks)
	}
}

func TestComposeProjectServiceProjectNotFound(t *testing.T) {
	svc := NewComposeProjectService(fakeComposeGateway{})

	_, err := svc.Project(context.Background(), "missing")
	if err == nil {
		t.Fatal("expected error")
	}
	if errorCode(err) != "not_found" {
		t.Fatalf("unexpected error code %q", errorCode(err))
	}
}

func TestComposeProjectActionServiceDelete(t *testing.T) {
	gateway := &fakeComposeGateway{
		containers: []docker.Container{{
			ID:             "abc1234567890",
			Names:          []string{"/edge-proxy"},
			ComposeProject: "edge",
			State:          "running",
		}},
		networks: []docker.Network{{
			ID:   "network-1",
			Name: "edge_default",
			Labels: map[string]string{
				composeProjectLabel: "edge",
			},
		}},
	}

	svc := NewComposeProjectActionService(gateway, audit.NewLogRecorder(&discardWriter{}))
	if err := svc.Delete(context.Background(), "edge", AuditMetadata{}); err != nil {
		t.Fatalf("delete: %v", err)
	}

	if len(gateway.removedContainers) != 1 || gateway.removedContainers[0] != "abc1234567890" {
		t.Fatalf("unexpected removed containers %+v", gateway.removedContainers)
	}
	if len(gateway.removedNetworks) != 1 || gateway.removedNetworks[0] != "network-1" {
		t.Fatalf("unexpected removed networks %+v", gateway.removedNetworks)
	}
}

func TestComposeProjectActionServiceRecreateConflict(t *testing.T) {
	gateway := &fakeComposeGateway{
		networks: []docker.Network{{
			ID:   "network-1",
			Name: "edge_default",
			Labels: map[string]string{
				composeProjectLabel: "edge",
			},
		}},
	}

	svc := NewComposeProjectActionService(gateway, audit.NewLogRecorder(&discardWriter{}))
	err := svc.Recreate(context.Background(), "edge", AuditMetadata{})
	if err == nil {
		t.Fatal("expected error")
	}
	if errorCode(err) != "conflict" {
		t.Fatalf("unexpected error code %q", errorCode(err))
	}
}

func TestComposeProjectActionServiceStartNotFound(t *testing.T) {
	gateway := &fakeComposeGateway{
		containers: []docker.Container{{
			ID:             "abc1234567890",
			Names:          []string{"/edge-proxy"},
			ComposeProject: "edge",
			State:          "exited",
		}},
		startErr: cerrdefs.ErrNotFound,
	}

	svc := NewComposeProjectActionService(gateway, audit.NewLogRecorder(&discardWriter{}))
	err := svc.Start(context.Background(), "edge", AuditMetadata{})
	if err == nil {
		t.Fatal("expected error")
	}
	if errorCode(err) != "not_found" {
		t.Fatalf("unexpected error code %q", errorCode(err))
	}
}

type fakeComposeGateway struct {
	containers         []docker.Container
	networks           []docker.Network
	volumes            []docker.Volume
	startErr           error
	stopErr            error
	restartErr         error
	removeContainerErr error
	removeNetworkErr   error
	removedContainers  []string
	removedNetworks    []string
}

func (f fakeComposeGateway) Containers(context.Context) ([]docker.Container, error) {
	return f.containers, nil
}

func (f fakeComposeGateway) Images(context.Context) ([]docker.Image, error) {
	return nil, nil
}

func (f fakeComposeGateway) Volumes(context.Context) ([]docker.Volume, error) {
	return f.volumes, nil
}

func (f fakeComposeGateway) Networks(context.Context) ([]docker.Network, error) {
	return f.networks, nil
}

func (f *fakeComposeGateway) StartContainer(context.Context, string) error {
	return f.startErr
}

func (f *fakeComposeGateway) StopContainer(context.Context, string, *int) error {
	return f.stopErr
}

func (f *fakeComposeGateway) RestartContainer(context.Context, string, *int) error {
	return f.restartErr
}

func (f *fakeComposeGateway) RemoveContainer(_ context.Context, id string, _, _ bool) error {
	if f.removeContainerErr != nil {
		return f.removeContainerErr
	}
	f.removedContainers = append(f.removedContainers, id)
	return nil
}

func (f fakeComposeGateway) PullImage(context.Context, string) error {
	return errors.New("not implemented")
}

func (f fakeComposeGateway) RemoveImage(context.Context, string, bool) error {
	return errors.New("not implemented")
}

func (f fakeComposeGateway) PruneImages(context.Context) error {
	return errors.New("not implemented")
}

func (f fakeComposeGateway) CreateVolume(context.Context, string) error {
	return errors.New("not implemented")
}

func (f fakeComposeGateway) RemoveVolume(context.Context, string, bool) error {
	return errors.New("not implemented")
}

func (f fakeComposeGateway) CreateNetwork(context.Context, string, string, bool) error {
	return errors.New("not implemented")
}

func (f *fakeComposeGateway) RemoveNetwork(_ context.Context, id string) error {
	if f.removeNetworkErr != nil {
		return f.removeNetworkErr
	}
	f.removedNetworks = append(f.removedNetworks, id)
	return nil
}

type discardWriter struct{}

func (discardWriter) Write(p []byte) (int, error) {
	return len(p), nil
}
