package service

import (
	"context"
	"math"
	"syscall"
	"time"

	"github.com/wanglei/docker-view/internal/docker"
)

type MonitoringService interface {
	Host(ctx context.Context) (MonitoringHost, error)
	Containers(ctx context.Context) ([]MonitoringContainer, error)
}

type MonitoringHost struct {
	SampledAt         time.Time `json:"sampledAt"`
	CPUCores          int       `json:"cpuCores"`
	CPUPercent        float64   `json:"cpuPercent"`
	MemoryUsedBytes   uint64    `json:"memoryUsedBytes"`
	MemoryTotalBytes  uint64    `json:"memoryTotalBytes"`
	DiskUsedBytes     uint64    `json:"diskUsedBytes"`
	DiskTotalBytes    uint64    `json:"diskTotalBytes"`
	NetworkRxBytes    uint64    `json:"networkRxBytes"`
	NetworkTxBytes    uint64    `json:"networkTxBytes"`
	RunningContainers int       `json:"runningContainers"`
	TotalContainers   int       `json:"totalContainers"`
}

type MonitoringContainer struct {
	ID               string    `json:"id"`
	ShortID          string    `json:"shortId"`
	Name             string    `json:"name"`
	ReadAt           time.Time `json:"readAt"`
	CPUPercent       float64   `json:"cpuPercent"`
	MemoryUsageBytes uint64    `json:"memoryUsageBytes"`
	MemoryLimitBytes uint64    `json:"memoryLimitBytes"`
	MemoryPercent    float64   `json:"memoryPercent"`
	NetworkRxBytes   uint64    `json:"networkRxBytes"`
	NetworkTxBytes   uint64    `json:"networkTxBytes"`
	BlockReadBytes   uint64    `json:"blockReadBytes"`
	BlockWriteBytes  uint64    `json:"blockWriteBytes"`
	PIDs             uint64    `json:"pids"`
}

type monitoringGateway interface {
	docker.SystemGateway
	docker.MonitoringGateway
}

type monitoringService struct {
	gateway monitoringGateway
}

func NewMonitoringService(gateway monitoringGateway) MonitoringService {
	return &monitoringService{gateway: gateway}
}

func (s *monitoringService) Host(ctx context.Context) (MonitoringHost, error) {
	summary, err := s.gateway.Summary(ctx)
	if err != nil {
		return MonitoringHost{}, err
	}

	stats, err := s.gateway.ContainerStats(ctx)
	if err != nil {
		return MonitoringHost{}, err
	}

	var cpuPercent float64
	var memoryUsed uint64
	var networkRx uint64
	var networkTx uint64
	for _, item := range stats {
		cpuPercent += item.CPUPercent
		memoryUsed += item.MemoryUsageBytes
		networkRx += item.NetworkRxBytes
		networkTx += item.NetworkTxBytes
	}

	diskUsed, diskTotal := dockerRootUsage(summary.DockerRootDir)

	return MonitoringHost{
		SampledAt:         time.Now().UTC(),
		CPUCores:          summary.CPUCores,
		CPUPercent:        roundFloat(cpuPercent),
		MemoryUsedBytes:   memoryUsed,
		MemoryTotalBytes:  maxUint64(uint64(summary.MemoryBytes), memoryUsed),
		DiskUsedBytes:     diskUsed,
		DiskTotalBytes:    diskTotal,
		NetworkRxBytes:    networkRx,
		NetworkTxBytes:    networkTx,
		RunningContainers: summary.ContainersRunning,
		TotalContainers:   summary.ContainersTotal,
	}, nil
}

func (s *monitoringService) Containers(ctx context.Context) ([]MonitoringContainer, error) {
	stats, err := s.gateway.ContainerStats(ctx)
	if err != nil {
		return nil, err
	}

	items := make([]MonitoringContainer, 0, len(stats))
	for _, item := range stats {
		items = append(items, MonitoringContainer{
			ID:               item.ID,
			ShortID:          item.ShortID,
			Name:             item.Name,
			ReadAt:           item.ReadAt,
			CPUPercent:       roundFloat(item.CPUPercent),
			MemoryUsageBytes: item.MemoryUsageBytes,
			MemoryLimitBytes: item.MemoryLimitBytes,
			MemoryPercent:    percentage(item.MemoryUsageBytes, item.MemoryLimitBytes),
			NetworkRxBytes:   item.NetworkRxBytes,
			NetworkTxBytes:   item.NetworkTxBytes,
			BlockReadBytes:   item.BlockReadBytes,
			BlockWriteBytes:  item.BlockWriteBytes,
			PIDs:             item.PIDs,
		})
	}

	return items, nil
}

func dockerRootUsage(path string) (used uint64, total uint64) {
	if path == "" {
		return 0, 0
	}

	var stat syscall.Statfs_t
	if err := syscall.Statfs(path, &stat); err != nil {
		return 0, 0
	}

	total = stat.Blocks * uint64(stat.Bsize)
	free := stat.Bavail * uint64(stat.Bsize)
	if total < free {
		return 0, total
	}

	return total - free, total
}

func percentage(current uint64, total uint64) float64 {
	if total == 0 {
		return 0
	}

	return roundFloat((float64(current) / float64(total)) * 100)
}

func roundFloat(value float64) float64 {
	return math.Round(value*100) / 100
}

func maxUint64(values ...uint64) uint64 {
	var max uint64
	for _, value := range values {
		if value > max {
			max = value
		}
	}
	return max
}
