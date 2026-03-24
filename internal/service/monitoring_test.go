package service

import (
	"context"
	"testing"
	"time"

	"github.com/wanglei/docker-view/internal/docker"
)

func TestMonitoringHostAggregatesStats(t *testing.T) {
	service := NewMonitoringService(stubMonitoringGateway{
		summary: docker.Summary{
			CPUCores:          8,
			MemoryBytes:       2048,
			ContainersTotal:   4,
			ContainersRunning: 2,
		},
		stats: []docker.ContainerStat{
			{CPUPercent: 10.5, MemoryUsageBytes: 256, NetworkRxBytes: 100, NetworkTxBytes: 50},
			{CPUPercent: 5.25, MemoryUsageBytes: 128, NetworkRxBytes: 40, NetworkTxBytes: 20},
		},
	})

	host, err := service.Host(context.Background())
	if err != nil {
		t.Fatalf("Host() error = %v", err)
	}

	if host.CPUPercent != 15.75 {
		t.Fatalf("expected cpu percent 15.75, got %v", host.CPUPercent)
	}
	if host.MemoryUsedBytes != 384 {
		t.Fatalf("expected memory used 384, got %d", host.MemoryUsedBytes)
	}
	if host.NetworkRxBytes != 140 {
		t.Fatalf("expected network rx 140, got %d", host.NetworkRxBytes)
	}
}

func TestMonitoringContainersMapsStats(t *testing.T) {
	service := NewMonitoringService(stubMonitoringGateway{
		stats: []docker.ContainerStat{{
			ID:               "abc123",
			ShortID:          "abc123",
			Name:             "nginx",
			ReadAt:           time.Unix(0, 0).UTC(),
			CPUPercent:       17.129,
			MemoryUsageBytes: 512,
			MemoryLimitBytes: 1024,
			NetworkRxBytes:   100,
			NetworkTxBytes:   20,
			BlockReadBytes:   4,
			BlockWriteBytes:  8,
			PIDs:             9,
		}},
	})

	items, err := service.Containers(context.Background())
	if err != nil {
		t.Fatalf("Containers() error = %v", err)
	}

	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].MemoryPercent != 50 {
		t.Fatalf("expected memory percent 50, got %v", items[0].MemoryPercent)
	}
	if items[0].CPUPercent != 17.13 {
		t.Fatalf("expected rounded cpu percent 17.13, got %v", items[0].CPUPercent)
	}
}

type stubMonitoringGateway struct {
	summary docker.Summary
	stats   []docker.ContainerStat
	err     error
}

func (s stubMonitoringGateway) Summary(context.Context) (docker.Summary, error) {
	return s.summary, s.err
}

func (s stubMonitoringGateway) ContainerStats(context.Context) ([]docker.ContainerStat, error) {
	return s.stats, s.err
}
