package service

import (
	"context"
	"testing"

	"github.com/wanglei/docker-view/internal/audit"
	"github.com/wanglei/docker-view/internal/config"
	"github.com/wanglei/docker-view/internal/docker"
)

func TestSettingsValidateRejectsInvalidValues(t *testing.T) {
	service := NewSettingsService(config.Config{
		Docker: config.DockerConfig{Host: "unix:///var/run/docker.sock"},
	}, stubSettingsGateway{}, audit.NewNopRecorder()).(*settingsService)

	validation := service.Validate(context.Background(), SettingsState{
		Docker: DockerSettings{
			Host:                   "http://bad-host",
			RefreshIntervalSeconds: 0,
		},
		Security: SecuritySettings{
			SessionTimeoutMinutes: 2,
		},
		Appearance: AppearanceSettings{
			Theme: "neon",
		},
	})

	if validation.Valid {
		t.Fatal("expected validation to fail")
	}
	if len(validation.Issues) != 4 {
		t.Fatalf("expected 4 issues, got %d", len(validation.Issues))
	}
}

func TestSettingsSavePersistsDraft(t *testing.T) {
	service := NewSettingsService(config.Config{
		Docker: config.DockerConfig{Host: "unix:///var/run/docker.sock"},
	}, stubSettingsGateway{
		summary: docker.Summary{
			DockerVersion:   "28.0.1",
			APIVersion:      "1.48",
			OperatingSystem: "Linux",
			KernelVersion:   "6.8.0",
			StorageDriver:   "overlay2",
			CgroupDriver:    "systemd",
		},
	}, audit.NewNopRecorder())

	result, err := service.Save(context.Background(), SettingsState{
		Docker: DockerSettings{
			Host:                   "tcp://127.0.0.1:2375",
			TLSEnabled:             true,
			AutoRefresh:            false,
			RefreshIntervalSeconds: 10,
		},
		Security: SecuritySettings{
			RequireAuthentication: true,
			SessionTimeoutMinutes: 60,
			LocalConnectionsOnly:  true,
		},
		Notifications: NotificationSettings{
			Enabled: true,
		},
		Appearance: AppearanceSettings{
			Theme: "dark",
		},
	})
	if err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	if !result.RequiresRestart {
		t.Fatal("expected restart to be required")
	}
	if result.Settings.Docker.Host != "tcp://127.0.0.1:2375" {
		t.Fatalf("unexpected docker host %q", result.Settings.Docker.Host)
	}
	if result.Settings.Docker.DockerVersion != "28.0.1" {
		t.Fatalf("unexpected docker version %q", result.Settings.Docker.DockerVersion)
	}
}

type stubSettingsGateway struct {
	summary docker.Summary
	err     error
}

func (s stubSettingsGateway) Summary(context.Context) (docker.Summary, error) {
	return s.summary, s.err
}
