package config

import "github.com/spf13/viper"

type Config struct {
	HTTP     HTTPConfig
	Log      LogConfig
	Docker   DockerConfig
	Web      WebConfig
	Security SecurityConfig
	Audit    AuditConfig
}

type HTTPConfig struct {
	Addr string
}

type LogConfig struct {
	Level string
}

type DockerConfig struct {
	Host string
}

type WebConfig struct {
	Dir string
}

type SecurityConfig struct {
	RequireAuthentication bool
	AuthToken             string
}

type AuditConfig struct {
	Enabled   bool
	MaxEvents int
}

func SetDefaults(v *viper.Viper) {
	v.SetDefault("http.addr", ":8080")
	v.SetDefault("log.level", "info")
	v.SetDefault("docker.host", "unix:///var/run/docker.sock")
	v.SetDefault("web.dir", "./web/dist")
	v.SetDefault("security.requireAuthentication", false)
	v.SetDefault("security.authToken", "")
	v.SetDefault("audit.enabled", true)
	v.SetDefault("audit.maxEvents", 500)
}

func FromViper(v *viper.Viper) Config {
	return Config{
		HTTP: HTTPConfig{
			Addr: v.GetString("http.addr"),
		},
		Log: LogConfig{
			Level: v.GetString("log.level"),
		},
		Docker: DockerConfig{
			Host: v.GetString("docker.host"),
		},
		Web: WebConfig{
			Dir: v.GetString("web.dir"),
		},
		Security: SecurityConfig{
			RequireAuthentication: v.GetBool("security.requireAuthentication"),
			AuthToken:             v.GetString("security.authToken"),
		},
		Audit: AuditConfig{
			Enabled:   v.GetBool("audit.enabled"),
			MaxEvents: v.GetInt("audit.maxEvents"),
		},
	}
}
