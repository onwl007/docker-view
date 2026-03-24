package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/wanglei/docker-view/internal/docker"
)

func TestContainerLogsServiceMapsEntries(t *testing.T) {
	svc := NewContainerLogsService(stubLogGateway{
		logs: []docker.LogEntry{{
			Stream:    "stdout",
			Timestamp: time.Unix(1, 0).UTC(),
			Message:   "hello",
		}},
	})

	items, err := svc.Logs(context.Background(), ContainerLogsParams{ContainerID: "abc"})
	if err != nil {
		t.Fatalf("Logs() error = %v", err)
	}
	if len(items) != 1 || items[0].Message != "hello" {
		t.Fatalf("unexpected logs payload %+v", items)
	}
}

func TestContainerLogsServiceWrapsErrors(t *testing.T) {
	svc := NewContainerLogsService(stubLogGateway{err: errors.New("boom")})

	_, err := svc.Logs(context.Background(), ContainerLogsParams{ContainerID: "abc"})
	if err == nil {
		t.Fatal("expected error")
	}
	if errorCode(err) != "docker_unavailable" {
		t.Fatalf("unexpected error code %q", errorCode(err))
	}
}

type stubLogGateway struct {
	logs []docker.LogEntry
	err  error
}

func (s stubLogGateway) Logs(context.Context, string, docker.LogOptions) ([]docker.LogEntry, error) {
	return s.logs, s.err
}

func (s stubLogGateway) StreamLogs(context.Context, string, docker.LogOptions, func(docker.LogEntry) error) error {
	return s.err
}
