package service

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	cerrdefs "github.com/containerd/errdefs"
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

func TestResourcesServiceVolumeFilesAndContent(t *testing.T) {
	rootDir := t.TempDir()
	configDir := filepath.Join(rootDir, "config")
	if err := os.Mkdir(configDir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(rootDir, "README.txt"), []byte("hello from volume"), 0o644); err != nil {
		t.Fatalf("write file: %v", err)
	}
	if err := os.WriteFile(filepath.Join(configDir, "app.env"), []byte("PORT=8080"), 0o644); err != nil {
		t.Fatalf("write nested file: %v", err)
	}

	svc := NewResourcesService(fakeResourcesGateway{
		volumes: []docker.Volume{{
			Name:       "postgres_data",
			Driver:     "local",
			Mountpoint: rootDir,
			CreatedAt:  time.Date(2026, time.March, 21, 12, 0, 0, 0, time.UTC),
		}},
	})

	listing, err := svc.VolumeFiles(context.Background(), "postgres_data", "")
	if err != nil {
		t.Fatalf("volume files: %v", err)
	}
	if len(listing.Entries) != 2 || listing.Entries[0].Type != "directory" {
		t.Fatalf("unexpected root listing %+v", listing.Entries)
	}

	content, err := svc.VolumeFileContent(context.Background(), "postgres_data", "README.txt")
	if err != nil {
		t.Fatalf("volume file content: %v", err)
	}
	if content.Content != "hello from volume" {
		t.Fatalf("unexpected file content %q", content.Content)
	}
}

func TestResourcesServiceVolumeFilesAndContentUsesDockerGateway(t *testing.T) {
	svc := NewResourcesService(fakeResourcesGateway{
		volumes: []docker.Volume{{
			Name:       "postgres_data",
			Driver:     "local",
			Mountpoint: "/var/lib/docker/volumes/postgres_data/_data",
			CreatedAt:  time.Date(2026, time.March, 21, 12, 0, 0, 0, time.UTC),
		}},
		volumeArchiveEntries: []docker.VolumeFileArchiveEntry{
			{Name: "config", Type: "directory", ModifiedAt: time.Date(2026, time.March, 21, 12, 1, 0, 0, time.UTC)},
			{Name: "README.txt", Type: "file", SizeBytes: 17, ModifiedAt: time.Date(2026, time.March, 21, 12, 2, 0, 0, time.UTC)},
		},
		volumeFileReadResult: docker.VolumeFileReadResult{
			Name:       "README.txt",
			SizeBytes:  17,
			ModifiedAt: time.Date(2026, time.March, 21, 12, 2, 0, 0, time.UTC),
			Content:    []byte("hello from docker"),
		},
	})

	listing, err := svc.VolumeFiles(context.Background(), "postgres_data", "")
	if err != nil {
		t.Fatalf("volume files via docker gateway: %v", err)
	}
	if len(listing.Entries) != 2 || listing.Entries[0].Name != "config" {
		t.Fatalf("unexpected docker gateway listing %+v", listing.Entries)
	}

	content, err := svc.VolumeFileContent(context.Background(), "postgres_data", "README.txt")
	if err != nil {
		t.Fatalf("volume file content via docker gateway: %v", err)
	}
	if content.Content != "hello from docker" {
		t.Fatalf("unexpected docker gateway content %q", content.Content)
	}
}

func TestResourcesServiceNetworkDetail(t *testing.T) {
	svc := NewResourcesService(fakeResourcesGateway{
		networkDetail: docker.NetworkDetail{
			ID:         "network-1234567890",
			Name:       "frontend",
			Driver:     "bridge",
			Scope:      "local",
			CreatedAt:  time.Date(2026, time.March, 25, 10, 0, 0, 0, time.UTC),
			Internal:   true,
			Attachable: true,
			EnableIPv4: true,
			IPAMConfigs: []docker.NetworkIPAMConfig{{
				Subnet:  "172.20.0.0/16",
				Gateway: "172.20.0.1",
			}},
			Containers: []docker.NetworkContainer{{
				ID:          "container-1234567890",
				Name:        "nginx",
				IPv4Address: "172.20.0.2/16",
			}},
		},
	})

	detail, err := svc.Network(context.Background(), "network-1234567890")
	if err != nil {
		t.Fatalf("network detail: %v", err)
	}
	if detail.Name != "frontend" || detail.ShortID == "" {
		t.Fatalf("unexpected network detail %+v", detail)
	}
	if len(detail.Containers) != 1 || detail.Containers[0].ShortID == "" {
		t.Fatalf("unexpected network containers %+v", detail.Containers)
	}
}

type fakeResourcesGateway struct {
	containers           []docker.Container
	images               []docker.Image
	imageDetail          docker.ImageDetail
	volumes              []docker.Volume
	volumeDetail         docker.VolumeDetail
	volumeArchiveEntries []docker.VolumeFileArchiveEntry
	volumeFileReadResult docker.VolumeFileReadResult
	volumeArchiveErr     error
	volumeFileReadErr    error
	networks             []docker.Network
	networkDetail        docker.NetworkDetail
}

func (f fakeResourcesGateway) Containers(context.Context) ([]docker.Container, error) {
	return f.containers, nil
}

func (f fakeResourcesGateway) Images(context.Context) ([]docker.Image, error) {
	return f.images, nil
}

func (f fakeResourcesGateway) Image(context.Context, string) (docker.ImageDetail, error) {
	return f.imageDetail, nil
}

func (f fakeResourcesGateway) Volume(context.Context, string) (docker.VolumeDetail, error) {
	if f.volumeDetail.Name != "" {
		return f.volumeDetail, nil
	}
	if len(f.volumes) > 0 {
		return docker.VolumeDetail{
			Name:       f.volumes[0].Name,
			Driver:     f.volumes[0].Driver,
			Mountpoint: f.volumes[0].Mountpoint,
			CreatedAt:  f.volumes[0].CreatedAt,
			Scope:      f.volumes[0].Scope,
			Labels:     f.volumes[0].Labels,
			SizeBytes:  f.volumes[0].SizeBytes,
		}, nil
	}
	return docker.VolumeDetail{}, nil
}

func (f fakeResourcesGateway) Volumes(context.Context) ([]docker.Volume, error) {
	return f.volumes, nil
}

func (f fakeResourcesGateway) Network(context.Context, string) (docker.NetworkDetail, error) {
	return f.networkDetail, nil
}

func (f fakeResourcesGateway) Networks(context.Context) ([]docker.Network, error) {
	return f.networks, nil
}

func (f fakeResourcesGateway) ListVolumeFiles(context.Context, string, string) ([]docker.VolumeFileArchiveEntry, error) {
	if f.volumeArchiveEntries == nil && f.volumeArchiveErr == nil {
		return nil, cerrdefs.ErrUnavailable.WithMessage("docker volume archive listing is not configured in test")
	}
	return f.volumeArchiveEntries, f.volumeArchiveErr
}

func (f fakeResourcesGateway) ReadVolumeFile(context.Context, string, string, int64) (docker.VolumeFileReadResult, error) {
	if f.volumeFileReadResult.Name == "" &&
		f.volumeFileReadResult.SizeBytes == 0 &&
		f.volumeFileReadResult.ModifiedAt.IsZero() &&
		len(f.volumeFileReadResult.Content) == 0 &&
		!f.volumeFileReadResult.Truncated &&
		f.volumeFileReadErr == nil {
		return docker.VolumeFileReadResult{}, cerrdefs.ErrUnavailable.WithMessage("docker volume file read is not configured in test")
	}
	return f.volumeFileReadResult, f.volumeFileReadErr
}
