package service

import (
	"context"
	"testing"
	"time"

	"github.com/wanglei/docker-view/internal/docker"
)

func TestResourcesServiceContainers(t *testing.T) {
	svc := NewResourcesService(fakeResourcesGateway{
		containers: []docker.Container{
			{
				ID:             "abc1234567890",
				Names:          []string{"/nginx-proxy"},
				Image:          "nginx:latest",
				CreatedAt:      time.Date(2026, time.March, 22, 12, 0, 0, 0, time.UTC),
				State:          "running",
				Status:         "Up 2 hours",
				ComposeProject: "edge",
				Ports: []docker.Port{{
					PrivatePort: 80,
					PublicPort:  8080,
					Protocol:    "tcp",
				}},
				NetworkNames: []string{"bridge"},
				Mounts: []docker.Mount{{
					Type: "volume",
					Name: "nginx_data",
				}},
			},
		},
	})

	result, err := svc.Containers(context.Background(), ContainerListParams{
		Query: "nginx",
		All:   true,
	})
	if err != nil {
		t.Fatalf("containers: %v", err)
	}

	if result.Total != 1 {
		t.Fatalf("unexpected total %d", result.Total)
	}

	if result.Items[0].Ports[0] != "8080:80/tcp" {
		t.Fatalf("unexpected ports %+v", result.Items[0].Ports)
	}

	if result.Items[0].ComposeProject != "edge" {
		t.Fatalf("unexpected compose project %q", result.Items[0].ComposeProject)
	}
}

func TestResourcesServiceVolumes(t *testing.T) {
	svc := NewResourcesService(fakeResourcesGateway{
		volumes: []docker.Volume{
			{
				Name:       "postgres_data",
				Driver:     "local",
				Mountpoint: "/var/lib/docker/volumes/postgres_data",
				CreatedAt:  time.Date(2026, time.March, 21, 12, 0, 0, 0, time.UTC),
			},
		},
		containers: []docker.Container{
			{
				ID:    "container-1",
				Names: []string{"/postgres"},
				Mounts: []docker.Mount{{
					Type: "volume",
					Name: "postgres_data",
				}},
			},
		},
	})

	result, err := svc.Volumes(context.Background(), VolumeListParams{})
	if err != nil {
		t.Fatalf("volumes: %v", err)
	}

	if len(result.Items[0].AttachedContainers) != 1 || result.Items[0].AttachedContainers[0] != "postgres" {
		t.Fatalf("unexpected attached containers %+v", result.Items[0].AttachedContainers)
	}
}

type fakeResourcesGateway struct {
	containers []docker.Container
	images     []docker.Image
	volumes    []docker.Volume
	networks   []docker.Network
}

func (f fakeResourcesGateway) Containers(context.Context) ([]docker.Container, error) {
	return f.containers, nil
}

func (f fakeResourcesGateway) Images(context.Context) ([]docker.Image, error) {
	return f.images, nil
}

func (f fakeResourcesGateway) Volumes(context.Context) ([]docker.Volume, error) {
	return f.volumes, nil
}

func (f fakeResourcesGateway) Networks(context.Context) ([]docker.Network, error) {
	return f.networks, nil
}
