package service

import (
	"context"
	"time"

	"github.com/wanglei/docker-view/internal/docker"
)

type SystemSummaryService interface {
	Summary(ctx context.Context) (SystemSummary, error)
}

type SystemSummary struct {
	SampledAt     time.Time       `json:"sampledAt"`
	DockerHost    string          `json:"dockerHost"`
	HostName      string          `json:"hostName"`
	DockerVersion string          `json:"dockerVersion"`
	APIVersion    string          `json:"apiVersion"`
	EngineStatus  string          `json:"engineStatus"`
	Containers    ResourceSummary `json:"containers"`
	Images        ResourceSummary `json:"images"`
	Volumes       ResourceSummary `json:"volumes"`
	Networks      ResourceSummary `json:"networks"`
	Host          HostSummary     `json:"host"`
}

type ResourceSummary struct {
	Total   int `json:"total"`
	Running int `json:"running,omitempty"`
	Stopped int `json:"stopped,omitempty"`
}

type HostSummary struct {
	CPUCores    int   `json:"cpuCores"`
	MemoryBytes int64 `json:"memoryBytes"`
}

type systemSummaryService struct {
	gateway docker.SystemGateway
}

func NewSystemSummaryService(gateway docker.SystemGateway) SystemSummaryService {
	return &systemSummaryService{gateway: gateway}
}

func (s *systemSummaryService) Summary(ctx context.Context) (SystemSummary, error) {
	summary, err := s.gateway.Summary(ctx)
	if err != nil {
		return SystemSummary{}, err
	}

	return SystemSummary{
		SampledAt:     time.Now().UTC(),
		DockerHost:    summary.DockerHost,
		HostName:      summary.HostName,
		DockerVersion: summary.DockerVersion,
		APIVersion:    summary.APIVersion,
		EngineStatus:  "connected",
		Containers: ResourceSummary{
			Total:   summary.ContainersTotal,
			Running: summary.ContainersRunning,
			Stopped: summary.ContainersStopped,
		},
		Images: ResourceSummary{
			Total: summary.ImagesTotal,
		},
		Volumes: ResourceSummary{
			Total: summary.VolumesTotal,
		},
		Networks: ResourceSummary{
			Total: summary.NetworksTotal,
		},
		Host: HostSummary{
			CPUCores:    summary.CPUCores,
			MemoryBytes: summary.MemoryBytes,
		},
	}, nil
}
