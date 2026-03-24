package service

import (
	"context"
	"time"

	"github.com/wanglei/docker-view/internal/docker"
)

type ContainerLogsService interface {
	Logs(ctx context.Context, params ContainerLogsParams) ([]ContainerLogEntry, error)
	Stream(ctx context.Context, params ContainerLogsParams, send func(ContainerLogEntry) error) error
}

type ContainerLogsParams struct {
	ContainerID string
	Stdout      bool
	Stderr      bool
	Since       string
	Until       string
	Tail        string
	Timestamps  bool
}

type ContainerLogEntry struct {
	Stream    string    `json:"stream"`
	Timestamp time.Time `json:"timestamp,omitempty"`
	Message   string    `json:"message"`
}

type containerLogsService struct {
	gateway docker.LogGateway
}

func NewContainerLogsService(gateway docker.LogGateway) ContainerLogsService {
	return &containerLogsService{gateway: gateway}
}

func (s *containerLogsService) Logs(ctx context.Context, params ContainerLogsParams) ([]ContainerLogEntry, error) {
	entries, err := s.gateway.Logs(ctx, params.ContainerID, docker.LogOptions{
		ShowStdout: params.Stdout,
		ShowStderr: params.Stderr,
		Since:      params.Since,
		Until:      params.Until,
		Tail:       params.Tail,
		Timestamps: params.Timestamps,
		Follow:     false,
	})
	if err != nil {
		return nil, wrapDockerError(err, "container not found", "container logs are not available")
	}

	return mapLogEntries(entries), nil
}

func (s *containerLogsService) Stream(ctx context.Context, params ContainerLogsParams, send func(ContainerLogEntry) error) error {
	err := s.gateway.StreamLogs(ctx, params.ContainerID, docker.LogOptions{
		ShowStdout: params.Stdout,
		ShowStderr: params.Stderr,
		Since:      params.Since,
		Until:      params.Until,
		Tail:       params.Tail,
		Timestamps: params.Timestamps,
		Follow:     true,
	}, func(entry docker.LogEntry) error {
		return send(ContainerLogEntry{
			Stream:    entry.Stream,
			Timestamp: entry.Timestamp,
			Message:   entry.Message,
		})
	})
	if err != nil {
		return wrapDockerError(err, "container not found", "container logs are not available")
	}

	return nil
}

func mapLogEntries(entries []docker.LogEntry) []ContainerLogEntry {
	items := make([]ContainerLogEntry, 0, len(entries))
	for _, entry := range entries {
		items = append(items, ContainerLogEntry{
			Stream:    entry.Stream,
			Timestamp: entry.Timestamp,
			Message:   entry.Message,
		})
	}
	return items
}
