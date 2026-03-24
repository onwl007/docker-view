package app

import (
	"context"
	"errors"
	"net/http"
	"os"

	"github.com/wanglei/docker-view/internal/audit"
	"github.com/wanglei/docker-view/internal/config"
	"github.com/wanglei/docker-view/internal/docker"
	serverhttp "github.com/wanglei/docker-view/internal/http"
	"github.com/wanglei/docker-view/internal/service"
)

type App struct {
	cfg           config.Config
	audit         service.AuditService
	systemSummary service.SystemSummaryService
	resources     service.ResourcesService
	compose       service.ComposeProjectService
	monitoring    service.MonitoringService
	settings      service.SettingsService
	logs          service.ContainerLogsService
	terminal      service.TerminalService
	containerOps  service.ContainerActionService
	resourceOps   service.ResourceActionService
	composeOps    service.ComposeProjectActionService
}

func New(cfg config.Config) (*App, error) {
	dockerClient, err := docker.NewClient(cfg.Docker.Host)
	if err != nil {
		return nil, err
	}

	memoryStore := audit.NewMemoryStore(cfg.Audit.MaxEvents)
	var recorder audit.Recorder = audit.NewNopRecorder()
	if cfg.Audit.Enabled {
		recorder = audit.NewMultiRecorder(
			audit.NewLogRecorder(os.Stdout),
			memoryStore,
		)
	}

	return &App{
		cfg:           cfg,
		audit:         service.NewAuditService(memoryStore),
		systemSummary: service.NewSystemSummaryService(dockerClient),
		resources:     service.NewResourcesService(dockerClient),
		compose:       service.NewComposeProjectService(dockerClient),
		monitoring:    service.NewMonitoringService(dockerClient),
		settings:      service.NewSettingsService(cfg, dockerClient, recorder),
		logs:          service.NewContainerLogsService(dockerClient),
		terminal:      service.NewTerminalService(dockerClient, recorder),
		containerOps:  service.NewContainerActionService(dockerClient, recorder),
		resourceOps:   service.NewResourceActionService(dockerClient, recorder),
		composeOps:    service.NewComposeProjectActionService(dockerClient, recorder),
	}, nil
}

func (a *App) Run(ctx context.Context) error {
	server := serverhttp.New(a.cfg, serverhttp.ServerOptions{
		SystemSummaryService:   a.systemSummary,
		AuditService:           a.audit,
		ResourcesService:       a.resources,
		ComposeService:         a.compose,
		MonitoringService:      a.monitoring,
		SettingsService:        a.settings,
		ContainerLogsService:   a.logs,
		TerminalService:        a.terminal,
		ContainerActionService: a.containerOps,
		ResourceActionService:  a.resourceOps,
		ComposeActionService:   a.composeOps,
	})

	go func() {
		<-ctx.Done()
		_ = server.Shutdown(context.Background())
	}()

	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}

	return nil
}
