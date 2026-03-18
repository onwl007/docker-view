package config

import "github.com/spf13/viper"

type Config struct {
	HTTP   HTTPConfig
	Log    LogConfig
	Docker DockerConfig
	Web    WebConfig
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

func SetDefaults(v *viper.Viper) {
	v.SetDefault("http.addr", ":8080")
	v.SetDefault("log.level", "info")
	v.SetDefault("docker.host", "unix:///var/run/docker.sock")
	v.SetDefault("web.dir", "./web/dist")
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
	}
}
