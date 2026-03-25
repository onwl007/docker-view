package http

import (
	"context"
	"encoding/json"
	"errors"
	nethttp "net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/wanglei/docker-view/internal/audit"
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

func TestImageDetail(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService: stubSummaryService{},
		ResourcesService: stubResourcesService{
			image: service.ImageDetail{
				ID:           "sha256:abc123",
				ShortID:      "abc123",
				RepoTags:     []string{"nginx:latest"},
				RepoDigests:  []string{"nginx@sha256:def456"},
				CreatedAt:    time.Date(2026, time.March, 24, 10, 0, 0, 0, time.UTC),
				SizeBytes:    123456789,
				Containers:   2,
				InUse:        true,
				Architecture: "amd64",
				OS:           "linux",
				Command:      []string{"nginx", "-g", "daemon off;"},
				ExposedPorts: []string{"80/tcp", "443/tcp"},
			},
		},
		MonitoringService:     stubMonitoringService{},
		SettingsService:       stubSettingsService{},
		ResourceActionService: stubResourceActionService{},
	})

	req := httptest.NewRequest(nethttp.MethodGet, "/api/v1/images/sha256:abc123", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}

	var payload successResponse[service.ImageDetail]
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if payload.Data.ID != "sha256:abc123" {
		t.Fatalf("unexpected image id %q", payload.Data.ID)
	}

	if len(payload.Data.ExposedPorts) != 2 {
		t.Fatalf("unexpected image ports %+v", payload.Data.ExposedPorts)
	}
}

func TestVolumeDetail(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService: stubSummaryService{},
		ResourcesService: stubResourcesService{
			volume: service.VolumeDetail{
				Name:               "postgres_data",
				Driver:             "local",
				Mountpoint:         "/var/lib/docker/volumes/postgres_data",
				CreatedAt:          time.Date(2026, time.March, 24, 10, 0, 0, 0, time.UTC),
				Scope:              "local",
				SizeBytes:          1024,
				AttachedContainers: []string{"postgres"},
			},
		},
		MonitoringService:     stubMonitoringService{},
		SettingsService:       stubSettingsService{},
		ResourceActionService: stubResourceActionService{},
	})

	req := httptest.NewRequest(nethttp.MethodGet, "/api/v1/volumes/postgres_data", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}

	var payload successResponse[service.VolumeDetail]
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if payload.Data.Name != "postgres_data" {
		t.Fatalf("unexpected volume name %q", payload.Data.Name)
	}
}

func TestVolumeFiles(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService: stubSummaryService{},
		ResourcesService: stubResourcesService{
			volumeFiles: service.VolumeFileListing{
				VolumeName:  "postgres_data",
				Mountpoint:  "/var/lib/docker/volumes/postgres_data",
				CurrentPath: "config",
				ParentPath:  "",
				Entries: []service.VolumeFileEntry{{
					Name: "app.env",
					Path: "config/app.env",
					Type: "file",
				}},
			},
		},
		MonitoringService:     stubMonitoringService{},
		SettingsService:       stubSettingsService{},
		ResourceActionService: stubResourceActionService{},
	})

	req := httptest.NewRequest(nethttp.MethodGet, "/api/v1/volumes/postgres_data/files?path=config", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}

	var payload successResponse[service.VolumeFileListing]
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if payload.Data.CurrentPath != "config" {
		t.Fatalf("unexpected current path %q", payload.Data.CurrentPath)
	}
}

func TestNetworkDetail(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		SystemSummaryService: stubSummaryService{},
		ResourcesService: stubResourcesService{
			network: service.NetworkDetail{
				ID:         "network-123456",
				ShortID:    "network-1234",
				Name:       "frontend",
				Driver:     "bridge",
				Scope:      "local",
				CreatedAt:  time.Date(2026, time.March, 24, 10, 0, 0, 0, time.UTC),
				Internal:   true,
				Containers: []service.NetworkContainer{{Name: "nginx"}},
			},
		},
		MonitoringService:     stubMonitoringService{},
		SettingsService:       stubSettingsService{},
		ResourceActionService: stubResourceActionService{},
	})

	req := httptest.NewRequest(nethttp.MethodGet, "/api/v1/networks/network-123456", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}

	var payload successResponse[service.NetworkDetail]
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if payload.Data.Name != "frontend" {
		t.Fatalf("unexpected network name %q", payload.Data.Name)
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

	req := httptest.NewRequest(nethttp.MethodGet, "/api/v1/compose/projects", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}

	if location := rec.Header().Get("Location"); location != "" {
		t.Fatalf("expected no redirect, got location %q", location)
	}
}

func TestRootServesFrontendIndexWithoutRedirect(t *testing.T) {
	webDir := t.TempDir()
	indexPath := filepath.Join(webDir, "index.html")
	if err := os.WriteFile(indexPath, []byte("<!doctype html><title>docker-view</title>"), 0o644); err != nil {
		t.Fatalf("write index.html: %v", err)
	}

	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
		Web:  config.WebConfig{Dir: webDir},
	}, ServerOptions{
		SystemSummaryService:  stubSummaryService{},
		MonitoringService:     stubMonitoringService{},
		SettingsService:       stubSettingsService{},
		ResourceActionService: stubResourceActionService{},
	})

	req := httptest.NewRequest(nethttp.MethodGet, "/", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}

	if location := rec.Header().Get("Location"); location != "" {
		t.Fatalf("expected no redirect, got location %q", location)
	}

	if !strings.Contains(rec.Body.String(), "docker-view") {
		t.Fatalf("expected frontend index body, got %q", rec.Body.String())
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

func TestAuditEventsList(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
	}, ServerOptions{
		AuditService: stubAuditService{
			events: service.ListResult[audit.Event]{
				Items: []audit.Event{{
					EventType:  "container.lifecycle",
					TargetType: "container",
					TargetID:   "abc123",
					Action:     "restart",
					Actor:      "tester",
					Result:     "success",
					Timestamp:  time.Date(2026, time.March, 24, 12, 0, 0, 0, time.UTC),
				}},
				Total: 1,
			},
		},
		SystemSummaryService:  stubSummaryService{},
		ComposeService:        stubComposeService{},
		MonitoringService:     stubMonitoringService{},
		SettingsService:       stubSettingsService{},
		ResourceActionService: stubResourceActionService{},
		ComposeActionService:  stubComposeActionService{},
	})

	req := httptest.NewRequest(nethttp.MethodGet, "/api/v1/audit/events?limit=10", nil)
	req.Header.Set("Authorization", "Bearer token")
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusOK {
		t.Fatalf("expected status %d, got %d", nethttp.StatusOK, rec.Code)
	}
}

func TestProtectedMutationRequiresAuthentication(t *testing.T) {
	server := New(config.Config{
		HTTP: config.HTTPConfig{Addr: ":8080"},
		Security: config.SecurityConfig{
			RequireAuthentication: true,
			AuthToken:             "secret",
		},
	}, ServerOptions{
		SystemSummaryService:   stubSummaryService{},
		ComposeService:         stubComposeService{},
		MonitoringService:      stubMonitoringService{},
		SettingsService:        stubSettingsService{},
		ContainerActionService: stubContainerActionService{},
		ResourceActionService:  stubResourceActionService{},
		ComposeActionService:   stubComposeActionService{},
		AuditService:           stubAuditService{},
	})

	req := httptest.NewRequest(nethttp.MethodPost, "/api/v1/containers/abc123/start", nil)
	rec := httptest.NewRecorder()

	server.Handler.ServeHTTP(rec, req)

	if rec.Code != nethttp.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", nethttp.StatusUnauthorized, rec.Code)
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
	containers        service.ListResult[service.ContainerListItem]
	images            service.ListResult[service.ImageListItem]
	image             service.ImageDetail
	volumes           service.ListResult[service.VolumeListItem]
	volume            service.VolumeDetail
	volumeFiles       service.VolumeFileListing
	volumeFileContent service.VolumeFileContent
	networks          service.ListResult[service.NetworkListItem]
	network           service.NetworkDetail
	err               error
}

type stubComposeService struct {
	projects service.ListResult[service.ComposeProjectListItem]
	project  service.ComposeProjectDetail
	err      error
}

type stubAuditService struct {
	events service.ListResult[audit.Event]
	err    error
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
	return s.images, s.err
}

func (s stubResourcesService) Image(_ context.Context, _ string) (service.ImageDetail, error) {
	return s.image, s.err
}

func (s stubResourcesService) Volumes(_ context.Context, _ service.VolumeListParams) (service.ListResult[service.VolumeListItem], error) {
	return s.volumes, s.err
}

func (s stubResourcesService) Volume(_ context.Context, _ string) (service.VolumeDetail, error) {
	return s.volume, s.err
}

func (s stubResourcesService) VolumeFiles(_ context.Context, _, _ string) (service.VolumeFileListing, error) {
	return s.volumeFiles, s.err
}

func (s stubResourcesService) VolumeFileContent(_ context.Context, _, _ string) (service.VolumeFileContent, error) {
	return s.volumeFileContent, s.err
}

func (s stubResourcesService) Networks(_ context.Context, _ service.NetworkListParams) (service.ListResult[service.NetworkListItem], error) {
	return s.networks, s.err
}

func (s stubResourcesService) Network(_ context.Context, _ string) (service.NetworkDetail, error) {
	return s.network, s.err
}

func (s stubComposeService) Projects(_ context.Context, _ service.ComposeProjectListParams) (service.ListResult[service.ComposeProjectListItem], error) {
	return s.projects, s.err
}

func (s stubComposeService) Project(_ context.Context, _ string) (service.ComposeProjectDetail, error) {
	return s.project, s.err
}

func (s stubAuditService) Events(_ context.Context, _ service.AuditListParams) (service.ListResult[audit.Event], error) {
	return s.events, s.err
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
