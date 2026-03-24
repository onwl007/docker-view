package http

import (
	"context"
	"encoding/json"
	"errors"
	nethttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/wanglei/docker-view/internal/config"
	"github.com/wanglei/docker-view/internal/service"
)

func TestHealthz(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService:  stubSummaryService{},
		MonitoringService:     stubMonitoringService{},
		SettingsService:       stubSettingsService{},
		ResourceActionService: stubResourceActionService{},
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
		MonitoringService:     stubMonitoringService{},
		SettingsService:       stubSettingsService{},
		ResourceActionService: stubResourceActionService{},
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
		SystemSummaryService:  stubSummaryService{err: errors.New("docker unavailable")},
		MonitoringService:     stubMonitoringService{},
		SettingsService:       stubSettingsService{},
		ResourceActionService: stubResourceActionService{},
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

func TestContainersList(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService: stubSummaryService{},
		ResourcesService: stubResourcesService{
			containers: service.ListResult[service.ContainerListItem]{
				Items: []service.ContainerListItem{{
					ID:      "abc123",
					ShortID: "abc123",
					Name:    "nginx-proxy",
					Image:   "nginx:latest",
					State:   "running",
				}},
				Total: 1,
			},
		},
		MonitoringService:     stubMonitoringService{},
		SettingsService:       stubSettingsService{},
		ResourceActionService: stubResourceActionService{},
	})

	req := httptest.NewRequest(nethttp.MethodGet, "/api/v1/containers?q=nginx", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}

	var payload successResponse[[]service.ContainerListItem]
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if payload.Meta == nil || payload.Meta.Total != 1 {
		t.Fatalf("unexpected meta payload: %+v", payload.Meta)
	}

	if payload.Data[0].Name != "nginx-proxy" {
		t.Fatalf("unexpected container payload %+v", payload.Data[0])
	}
}

func TestContainerStart(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService:   stubSummaryService{},
		ResourcesService:       stubResourcesService{},
		MonitoringService:      stubMonitoringService{},
		SettingsService:        stubSettingsService{},
		ContainerActionService: stubContainerActionService{},
		ResourceActionService:  stubResourceActionService{},
	})

	req := httptest.NewRequest(nethttp.MethodPost, "/api/v1/containers/abc123/start", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}

	var payload successResponse[map[string]bool]
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if !payload.Data["success"] {
		t.Fatal("expected success result")
	}
}

func TestComposeProjectsList(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService: stubSummaryService{},
		ComposeService: stubComposeService{
			projects: service.ListResult[service.ComposeProjectListItem]{
				Items: []service.ComposeProjectListItem{{
					Name:           "edge",
					Status:         "running",
					ContainerCount: 2,
				}},
				Total: 1,
			},
		},
		MonitoringService:     stubMonitoringService{},
		SettingsService:       stubSettingsService{},
		ResourceActionService: stubResourceActionService{},
		ComposeActionService:  stubComposeActionService{},
	})

	req := httptest.NewRequest(nethttp.MethodGet, "/api/v1/compose/projects?q=edge", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}
}

func TestComposeProjectStart(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService:   stubSummaryService{},
		ComposeService:         stubComposeService{},
		MonitoringService:      stubMonitoringService{},
		SettingsService:        stubSettingsService{},
		ContainerActionService: stubContainerActionService{},
		ResourceActionService:  stubResourceActionService{},
		ComposeActionService:   stubComposeActionService{},
	})

	req := httptest.NewRequest(nethttp.MethodPost, "/api/v1/compose/projects/edge/start", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}
}

func TestImagePull(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService:   stubSummaryService{},
		ResourcesService:       stubResourcesService{},
		MonitoringService:      stubMonitoringService{},
		SettingsService:        stubSettingsService{},
		ContainerActionService: stubContainerActionService{},
		ResourceActionService:  stubResourceActionService{},
	})

	req := httptest.NewRequest(nethttp.MethodPost, "/api/v1/images/pull", strings.NewReader(`{"reference":"nginx:latest"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}
}

func TestMonitoringHost(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService: stubSummaryService{},
		MonitoringService: stubMonitoringService{
			host: service.MonitoringHost{
				CPUCores:          8,
				CPUPercent:        23.4,
				MemoryTotalBytes:  1024,
				MemoryUsedBytes:   256,
				RunningContainers: 3,
				TotalContainers:   5,
			},
		},
		SettingsService:       stubSettingsService{},
		ResourceActionService: stubResourceActionService{},
	})

	req := httptest.NewRequest(nethttp.MethodGet, "/api/v1/monitoring/host", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}
}

func TestContainerLogs(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService: stubSummaryService{},
		MonitoringService:    stubMonitoringService{},
		SettingsService:      stubSettingsService{},
		ContainerLogsService: stubContainerLogsService{
			logs: []service.ContainerLogEntry{{
				Stream:  "stdout",
				Message: "server started",
			}},
		},
		ResourceActionService: stubResourceActionService{},
	})

	req := httptest.NewRequest(nethttp.MethodGet, "/api/v1/containers/abc123/logs?tail=10", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}
}

func TestExecSessionCreate(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService: stubSummaryService{},
		MonitoringService:    stubMonitoringService{},
		SettingsService:      stubSettingsService{},
		TerminalService: stubTerminalService{
			session: service.TerminalSession{
				SessionID:     "exec_123",
				WebSocketPath: "/api/v1/terminal/sessions/exec_123/ws",
			},
		},
		ResourceActionService: stubResourceActionService{},
	})

	req := httptest.NewRequest(nethttp.MethodPost, "/api/v1/containers/abc123/exec-sessions", strings.NewReader(`{"command":["/bin/sh"],"tty":true}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}
}

func TestSettingsValidate(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService: stubSummaryService{},
		MonitoringService:    stubMonitoringService{},
		SettingsService: stubSettingsService{
			validation: service.SettingsValidation{
				Valid: false,
				Issues: []service.SettingsIssue{{
					Field:   "docker.host",
					Message: "Docker host is required",
				}},
			},
		},
		ResourceActionService: stubResourceActionService{},
	})

	req := httptest.NewRequest(nethttp.MethodPost, "/api/v1/settings/validate", strings.NewReader(`{"docker":{"host":""}}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}
}

type stubSummaryService struct {
	summary service.SystemSummary
	err     error
}

type stubResourcesService struct {
	containers service.ListResult[service.ContainerListItem]
	err        error
}

type stubComposeService struct {
	projects service.ListResult[service.ComposeProjectListItem]
	project  service.ComposeProjectDetail
	err      error
}

type stubContainerActionService struct {
	err error
}

type stubMonitoringService struct {
	host       service.MonitoringHost
	containers []service.MonitoringContainer
	err        error
}

type stubSettingsService struct {
	settings   service.SettingsState
	validation service.SettingsValidation
	saveResult service.SettingsSaveResult
	err        error
}

type stubContainerLogsService struct {
	logs []service.ContainerLogEntry
	err  error
}

type stubTerminalService struct {
	session service.TerminalSession
	err     error
}

type stubResourceActionService struct {
	err error
}

type stubComposeActionService struct {
	err error
}

func (s stubSummaryService) Summary(_ context.Context) (service.SystemSummary, error) {
	if s.err != nil {
		return service.SystemSummary{}, s.err
	}
	return s.summary, nil
}

func (s stubResourcesService) Containers(_ context.Context, _ service.ContainerListParams) (service.ListResult[service.ContainerListItem], error) {
	if s.err != nil {
		return service.ListResult[service.ContainerListItem]{}, s.err
	}
	return s.containers, nil
}

func (s stubResourcesService) Images(_ context.Context, _ service.ImageListParams) (service.ListResult[service.ImageListItem], error) {
	return service.ListResult[service.ImageListItem]{}, s.err
}

func (s stubResourcesService) Volumes(_ context.Context, _ service.VolumeListParams) (service.ListResult[service.VolumeListItem], error) {
	return service.ListResult[service.VolumeListItem]{}, s.err
}

func (s stubResourcesService) Networks(_ context.Context, _ service.NetworkListParams) (service.ListResult[service.NetworkListItem], error) {
	return service.ListResult[service.NetworkListItem]{}, s.err
}

func (s stubComposeService) Projects(_ context.Context, _ service.ComposeProjectListParams) (service.ListResult[service.ComposeProjectListItem], error) {
	return s.projects, s.err
}

func (s stubComposeService) Project(_ context.Context, _ string) (service.ComposeProjectDetail, error) {
	return s.project, s.err
}

func (s stubMonitoringService) Host(_ context.Context) (service.MonitoringHost, error) {
	return s.host, s.err
}

func (s stubMonitoringService) Containers(_ context.Context) ([]service.MonitoringContainer, error) {
	return s.containers, s.err
}

func (s stubSettingsService) Get(_ context.Context) (service.SettingsState, error) {
	return s.settings, s.err
}

func (s stubSettingsService) Validate(_ context.Context, _ service.SettingsState) service.SettingsValidation {
	return s.validation
}

func (s stubSettingsService) Save(_ context.Context, _ service.SettingsState) (service.SettingsSaveResult, error) {
	return s.saveResult, s.err
}

func (s stubContainerLogsService) Logs(_ context.Context, _ service.ContainerLogsParams) ([]service.ContainerLogEntry, error) {
	return s.logs, s.err
}

func (s stubContainerLogsService) Stream(_ context.Context, _ service.ContainerLogsParams, _ func(service.ContainerLogEntry) error) error {
	return s.err
}

func (s stubTerminalService) CreateSession(_ context.Context, _ service.TerminalSessionParams) (service.TerminalSession, error) {
	return s.session, s.err
}

func (s stubTerminalService) ProxySession(_ context.Context, _ string, _ service.TerminalBridge) error {
	return s.err
}

func (s stubContainerActionService) Start(_ context.Context, _ service.ContainerTimeoutParams) error {
	return s.err
}

func (s stubContainerActionService) Stop(_ context.Context, _ service.ContainerTimeoutParams) error {
	return s.err
}

func (s stubContainerActionService) Restart(_ context.Context, _ service.ContainerTimeoutParams) error {
	return s.err
}

func (s stubContainerActionService) Delete(_ context.Context, _ service.ContainerDeleteParams) error {
	return s.err
}

func (s stubResourceActionService) PullImage(_ context.Context, _ service.ImagePullParams) error {
	return s.err
}

func (s stubResourceActionService) DeleteImage(_ context.Context, _ service.ImageDeleteParams) error {
	return s.err
}

func (s stubResourceActionService) PruneImages(_ context.Context, _ service.AuditMetadata) error {
	return s.err
}

func (s stubResourceActionService) CreateVolume(_ context.Context, _ service.VolumeCreateParams) error {
	return s.err
}

func (s stubResourceActionService) DeleteVolume(_ context.Context, _ service.VolumeDeleteParams) error {
	return s.err
}

func (s stubResourceActionService) CreateNetwork(_ context.Context, _ service.NetworkCreateParams) error {
	return s.err
}

func (s stubResourceActionService) DeleteNetwork(_ context.Context, _ service.NetworkDeleteParams) error {
	return s.err
}

func (s stubComposeActionService) Start(_ context.Context, _ string, _ service.AuditMetadata) error {
	return s.err
}

func (s stubComposeActionService) Stop(_ context.Context, _ string, _ service.AuditMetadata) error {
	return s.err
}

func (s stubComposeActionService) Recreate(_ context.Context, _ string, _ service.AuditMetadata) error {
	return s.err
}

func (s stubComposeActionService) Delete(_ context.Context, _ string, _ service.AuditMetadata) error {
	return s.err
}
