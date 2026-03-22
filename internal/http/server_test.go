package http

import (
	"context"
	"encoding/json"
	"errors"
	nethttp "net/http"
	"net/http/httptest"
	"testing"

	"github.com/wanglei/docker-view/internal/config"
	"github.com/wanglei/docker-view/internal/service"
)

func TestHealthz(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService: stubSummaryService{},
	})

	req := httptest.NewRequest(nethttp.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}

	var payload successResponse[map[string]string]
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if payload.Data["status"] != "ok" {
		t.Fatalf("unexpected status payload %q", payload.Data["status"])
	}
}

func TestSystemSummary(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService: stubSummaryService{
			summary: service.SystemSummary{
				EngineStatus: "connected",
				Containers: service.ResourceSummary{
					Total:   8,
					Running: 6,
					Stopped: 2,
				},
				Images: service.ResourceSummary{
					Total: 24,
				},
			},
		},
	})

	req := httptest.NewRequest(nethttp.MethodGet, "/api/v1/system/summary", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}

	var payload successResponse[service.SystemSummary]
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if payload.Data.Containers.Total != 8 {
		t.Fatalf("unexpected container total %d", payload.Data.Containers.Total)
	}
}

func TestSystemSummaryUnavailable(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService: stubSummaryService{err: errors.New("docker unavailable")},
	})

	req := httptest.NewRequest(nethttp.MethodGet, "/api/v1/system/summary", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusBadGateway {
		t.Fatalf("expected status %d, got %d", nethttp.StatusBadGateway, rec.Code)
	}

	var payload errorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if payload.Error.Code != "docker_unavailable" {
		t.Fatalf("unexpected error code %q", payload.Error.Code)
	}
}

type stubSummaryService struct {
	summary service.SystemSummary
	err     error
}

func (s stubSummaryService) Summary(_ context.Context) (service.SystemSummary, error) {
	if s.err != nil {
		return service.SystemSummary{}, s.err
	}
	return s.summary, nil
}
