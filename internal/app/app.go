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
	systemSummary service.SystemSummaryService
	resources     service.ResourcesService
	monitoring    service.MonitoringService
	settings      service.SettingsService
	containerOps  service.ContainerActionService
	resourceOps   service.ResourceActionService
}

func New(cfg config.Config) (*App, error) {
	dockerClient, err := docker.NewClient(cfg.Docker.Host)
	if err != nil {
		return nil, err
	}

	return &App{
		cfg:           cfg,
		systemSummary: service.NewSystemSummaryService(dockerClient),
		resources:     service.NewResourcesService(dockerClient),
		monitoring:    service.NewMonitoringService(dockerClient),
		settings:      service.NewSettingsService(cfg, dockerClient),
		containerOps:  service.NewContainerActionService(dockerClient, audit.NewLogRecorder(os.Stdout)),
		resourceOps:   service.NewResourceActionService(dockerClient, audit.NewLogRecorder(os.Stdout)),
	}, nil
}

func (a *App) Run(ctx context.Context) error {
	server := serverhttp.New(a.cfg, serverhttp.ServerOptions{
		SystemSummaryService:   a.systemSummary,
		ResourcesService:       a.resources,
		MonitoringService:      a.monitoring,
		SettingsService:        a.settings,
		ContainerActionService: a.containerOps,
		ResourceActionService:  a.resourceOps,
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
