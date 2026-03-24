package docker

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	mobycontainer "github.com/moby/moby/api/types/container"
	mobyclient "github.com/moby/moby/client"
)

type MonitoringGateway interface {
	ContainerStats(ctx context.Context) ([]ContainerStat, error)
}

type ContainerStat struct {
	ID               string
	ShortID          string
	Name             string
	ReadAt           time.Time
	CPUPercent       float64
	MemoryUsageBytes uint64
	MemoryLimitBytes uint64
	NetworkRxBytes   uint64
	NetworkTxBytes   uint64
	BlockReadBytes   uint64
	BlockWriteBytes  uint64
	PIDs             uint64
}

func (c *Client) ContainerStats(ctx context.Context) ([]ContainerStat, error) {
	containers, err := c.client.ContainerList(ctx, mobyclient.ContainerListOptions{})
	if err != nil {
		return nil, err
	}

	stats := make([]ContainerStat, 0, len(containers.Items))
	for _, item := range containers.Items {
		result, err := c.client.ContainerStats(ctx, item.ID, mobyclient.ContainerStatsOptions{
			Stream:                false,
			IncludePreviousSample: true,
		})
		if err != nil {
			return nil, err
		}

		var payload mobycontainer.StatsResponse
		decodeErr := json.NewDecoder(result.Body).Decode(&payload)
		_ = result.Body.Close()
		if decodeErr != nil {
			return nil, decodeErr
		}

		stats = append(stats, ContainerStat{
			ID:               item.ID,
			ShortID:          shortContainerID(item.ID),
			Name:             shortName(item.Names, item.ID),
			ReadAt:           payload.Read.UTC(),
			CPUPercent:       cpuPercent(payload),
			MemoryUsageBytes: payload.MemoryStats.Usage,
			MemoryLimitBytes: payload.MemoryStats.Limit,
			NetworkRxBytes:   networkRxBytes(payload),
			NetworkTxBytes:   networkTxBytes(payload),
			BlockReadBytes:   blockReadBytes(payload),
			BlockWriteBytes:  blockWriteBytes(payload),
			PIDs:             payload.PidsStats.Current,
		})
	}

	return stats, nil
}

func shortContainerID(value string) string {
	trimmed := strings.TrimPrefix(value, "sha256:")
	if len(trimmed) > 12 {
		return trimmed[:12]
	}

	return trimmed
}

func cpuPercent(stats mobycontainer.StatsResponse) float64 {
	cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage) - float64(stats.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(stats.CPUStats.SystemUsage) - float64(stats.PreCPUStats.SystemUsage)
	if cpuDelta <= 0 || systemDelta <= 0 {
		return 0
	}

	onlineCPUs := float64(stats.CPUStats.OnlineCPUs)
	if onlineCPUs <= 0 {
		onlineCPUs = float64(len(stats.CPUStats.CPUUsage.PercpuUsage))
	}
	if onlineCPUs <= 0 {
		onlineCPUs = 1
	}

	return (cpuDelta / systemDelta) * onlineCPUs * 100
}

func networkRxBytes(stats mobycontainer.StatsResponse) uint64 {
	var total uint64
	for _, network := range stats.Networks {
		total += network.RxBytes
	}
	return total
}

func networkTxBytes(stats mobycontainer.StatsResponse) uint64 {
	var total uint64
	for _, network := range stats.Networks {
		total += network.TxBytes
	}
	return total
}

func blockReadBytes(stats mobycontainer.StatsResponse) uint64 {
	return blockIOBytes(stats, "read")
}

func blockWriteBytes(stats mobycontainer.StatsResponse) uint64 {
	return blockIOBytes(stats, "write")
}

func blockIOBytes(stats mobycontainer.StatsResponse, op string) uint64 {
	var total uint64
	for _, entry := range stats.BlkioStats.IoServiceBytesRecursive {
		if strings.EqualFold(entry.Op, op) {
			total += entry.Value
		}
	}
	return total
}
