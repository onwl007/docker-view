package service

import (
	"context"
	"strings"
	"sync"

	"github.com/wanglei/docker-view/internal/config"
	"github.com/wanglei/docker-view/internal/docker"
)

type SettingsService interface {
	Get(ctx context.Context) (SettingsState, error)
	Validate(ctx context.Context, input SettingsState) SettingsValidation
	Save(ctx context.Context, input SettingsState) (SettingsSaveResult, error)
}

type SettingsState struct {
	Docker        DockerSettings       `json:"docker"`
	Security      SecuritySettings     `json:"security"`
	Notifications NotificationSettings `json:"notifications"`
	Appearance    AppearanceSettings   `json:"appearance"`
}

type DockerSettings struct {
	Host                   string `json:"host"`
	TLSEnabled             bool   `json:"tlsEnabled"`
	AutoRefresh            bool   `json:"autoRefresh"`
	RefreshIntervalSeconds int    `json:"refreshIntervalSeconds"`
	DockerVersion          string `json:"dockerVersion,omitempty"`
	APIVersion             string `json:"apiVersion,omitempty"`
	OperatingSystem        string `json:"operatingSystem,omitempty"`
	KernelVersion          string `json:"kernelVersion,omitempty"`
	StorageDriver          string `json:"storageDriver,omitempty"`
	CgroupDriver           string `json:"cgroupDriver,omitempty"`
}

type SecuritySettings struct {
	RequireAuthentication bool `json:"requireAuthentication"`
	TwoFactorEnabled      bool `json:"twoFactorEnabled"`
	SessionTimeoutMinutes int  `json:"sessionTimeoutMinutes"`
	LocalConnectionsOnly  bool `json:"localConnectionsOnly"`
}

type NotificationSettings struct {
	Enabled                 bool `json:"enabled"`
	ContainerStateChanges   bool `json:"containerStateChanges"`
	ResourceAlerts          bool `json:"resourceAlerts"`
	ImageUpdates            bool `json:"imageUpdates"`
	SecurityVulnerabilities bool `json:"securityVulnerabilities"`
}

type AppearanceSettings struct {
	Theme            string `json:"theme"`
	CompactMode      bool   `json:"compactMode"`
	ShowContainerIDs bool   `json:"showContainerIDs"`
}

type SettingsValidation struct {
	Valid           bool            `json:"valid"`
	RequiresRestart bool            `json:"requiresRestart"`
	RestartKeys     []string        `json:"restartKeys,omitempty"`
	Issues          []SettingsIssue `json:"issues,omitempty"`
}

type SettingsIssue struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type SettingsSaveResult struct {
	Settings        SettingsState `json:"settings"`
	RequiresRestart bool          `json:"requiresRestart"`
	RestartKeys     []string      `json:"restartKeys,omitempty"`
}

type settingsService struct {
	gateway docker.SystemGateway
	mu      sync.RWMutex
	state   SettingsState
}

func NewSettingsService(cfg config.Config, gateway docker.SystemGateway) SettingsService {
	return &settingsService{
		gateway: gateway,
		state: SettingsState{
			Docker: DockerSettings{
				Host:                   cfg.Docker.Host,
				AutoRefresh:            true,
				RefreshIntervalSeconds: 5,
			},
			Security: SecuritySettings{
				SessionTimeoutMinutes: 30,
				LocalConnectionsOnly:  true,
			},
			Notifications: NotificationSettings{
				Enabled:               true,
				ContainerStateChanges: true,
				ResourceAlerts:        true,
			},
			Appearance: AppearanceSettings{
				Theme: "system",
			},
		},
	}
}

func (s *settingsService) Get(ctx context.Context) (SettingsState, error) {
	s.mu.RLock()
	state := s.state
	s.mu.RUnlock()

	summary, err := s.gateway.Summary(ctx)
	if err != nil {
		return SettingsState{}, err
	}

	state.Docker.DockerVersion = summary.DockerVersion
	state.Docker.APIVersion = summary.APIVersion
	state.Docker.OperatingSystem = summary.OperatingSystem
	state.Docker.KernelVersion = summary.KernelVersion
	state.Docker.StorageDriver = summary.StorageDriver
	state.Docker.CgroupDriver = summary.CgroupDriver

	return state, nil
}

func (s *settingsService) Validate(_ context.Context, input SettingsState) SettingsValidation {
	issues := make([]SettingsIssue, 0)

	if strings.TrimSpace(input.Docker.Host) == "" {
		issues = append(issues, SettingsIssue{Field: "docker.host", Message: "Docker host is required"})
	} else if !strings.HasPrefix(input.Docker.Host, "unix://") && !strings.HasPrefix(input.Docker.Host, "tcp://") {
		issues = append(issues, SettingsIssue{Field: "docker.host", Message: "Docker host must use unix:// or tcp://"})
	}

	if input.Docker.RefreshIntervalSeconds < 1 || input.Docker.RefreshIntervalSeconds > 300 {
		issues = append(issues, SettingsIssue{Field: "docker.refreshIntervalSeconds", Message: "Refresh interval must be between 1 and 300 seconds"})
	}

	if input.Security.SessionTimeoutMinutes < 5 || input.Security.SessionTimeoutMinutes > 1440 {
		issues = append(issues, SettingsIssue{Field: "security.sessionTimeoutMinutes", Message: "Session timeout must be between 5 and 1440 minutes"})
	}

	if input.Appearance.Theme != "light" && input.Appearance.Theme != "dark" && input.Appearance.Theme != "system" {
		issues = append(issues, SettingsIssue{Field: "appearance.theme", Message: "Theme must be light, dark, or system"})
	}

	restartKeys := make([]string, 0)

	s.mu.RLock()
	current := s.state
	s.mu.RUnlock()

	if current.Docker.Host != input.Docker.Host {
		restartKeys = append(restartKeys, "docker.host")
	}
	if current.Docker.TLSEnabled != input.Docker.TLSEnabled {
		restartKeys = append(restartKeys, "docker.tlsEnabled")
	}
	if current.Security.RequireAuthentication != input.Security.RequireAuthentication {
		restartKeys = append(restartKeys, "security.requireAuthentication")
	}

	return SettingsValidation{
		Valid:           len(issues) == 0,
		RequiresRestart: len(restartKeys) > 0,
		RestartKeys:     restartKeys,
		Issues:          issues,
	}
}

func (s *settingsService) Save(ctx context.Context, input SettingsState) (SettingsSaveResult, error) {
	validation := s.Validate(ctx, input)
	if !validation.Valid {
		message := "settings validation failed"
		if len(validation.Issues) > 0 {
			message = validation.Issues[0].Message
		}
		return SettingsSaveResult{}, &codedError{
			code:    "invalid_argument",
			message: message,
		}
	}

	s.mu.Lock()
	s.state.Docker.Host = input.Docker.Host
	s.state.Docker.TLSEnabled = input.Docker.TLSEnabled
	s.state.Docker.AutoRefresh = input.Docker.AutoRefresh
	s.state.Docker.RefreshIntervalSeconds = input.Docker.RefreshIntervalSeconds
	s.state.Security = input.Security
	s.state.Notifications = input.Notifications
	s.state.Appearance = input.Appearance
	s.mu.Unlock()

	state, err := s.Get(ctx)
	if err != nil {
		return SettingsSaveResult{}, err
	}

	return SettingsSaveResult{
		Settings:        state,
		RequiresRestart: validation.RequiresRestart,
		RestartKeys:     validation.RestartKeys,
	}, nil
}
