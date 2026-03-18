package app

import (
	"context"
	"errors"
	"net/http"

	"github.com/wanglei/docker-view/internal/config"
	serverhttp "github.com/wanglei/docker-view/internal/http"
)

type App struct {
	cfg config.Config
}

func New(cfg config.Config) *App {
	return &App{cfg: cfg}
}

func (a *App) Run(ctx context.Context) error {
	server := serverhttp.New(a.cfg)

	go func() {
		<-ctx.Done()
		_ = server.Shutdown(context.Background())
	}()

	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}

	return nil
}
