package app

import (
	"context"
	"errors"
	"net/http"

	"github.com/wanglei/docker-view/internal/config"
	"github.com/wanglei/docker-view/internal/docker"
	serverhttp "github.com/wanglei/docker-view/internal/http"
	"github.com/wanglei/docker-view/internal/service"
)

type App struct {
	cfg           config.Config
	systemSummary service.SystemSummaryService
}

func New(cfg config.Config) (*App, error) {
	dockerClient, err := docker.NewClient(cfg.Docker.Host)
	if err != nil {
		return nil, err
	}

	return &App{
		cfg:           cfg,
		systemSummary: service.NewSystemSummaryService(dockerClient),
	}, nil
}

func (a *App) Run(ctx context.Context) error {
	server := serverhttp.New(a.cfg, serverhttp.ServerOptions{
		SystemSummaryService: a.systemSummary,
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
