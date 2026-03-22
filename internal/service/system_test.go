package service

import (
	"context"
	"errors"
	"testing"

	"github.com/wanglei/docker-view/internal/docker"
)

func TestSystemSummaryServiceSummary(t *testing.T) {
	gateway := fakeGateway{
		summary: docker.Summary{
			DockerHost:        "unix:///var/run/docker.sock",
			HostName:          "prod-docker-01",
			DockerVersion:     "28.0.1",
			APIVersion:        "1.48",
			ContainersTotal:   12,
			ContainersRunning: 8,
			ContainersStopped: 4,
			ImagesTotal:       24,
			VolumesTotal:      8,
			NetworksTotal:     5,
			CPUCores:          8,
			MemoryBytes:       34359738368,
		},
	}

	svc := NewSystemSummaryService(gateway)
	summary, err := svc.Summary(context.Background())
	if err != nil {
		t.Fatalf("summary: %v", err)
	}

	if summary.EngineStatus != "connected" {
		t.Fatalf("unexpected engine status %q", summary.EngineStatus)
	}

	if summary.Containers.Total != 12 || summary.Containers.Running != 8 || summary.Containers.Stopped != 4 {
		t.Fatalf("unexpected container counts: %+v", summary.Containers)
	}

	if summary.Host.CPUCores != 8 || summary.Host.MemoryBytes != 34359738368 {
		t.Fatalf("unexpected host summary: %+v", summary.Host)
	}
}

func TestSystemSummaryServiceSummaryError(t *testing.T) {
	svc := NewSystemSummaryService(fakeGateway{err: errors.New("boom")})
	if _, err := svc.Summary(context.Background()); err == nil {
		t.Fatal("expected error")
	}
}

type fakeGateway struct {
	summary docker.Summary
	err     error
}

func (f fakeGateway) Summary(context.Context) (docker.Summary, error) {
	if f.err != nil {
		return docker.Summary{}, f.err
	}
	return f.summary, nil
}
