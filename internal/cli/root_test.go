package cli

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/spf13/pflag"
)

func TestLoadConfigPrecedence(t *testing.T) {
	t.Setenv("DOCKER_VIEW_HTTP_ADDR", ":19090")
	t.Setenv("DOCKER_VIEW_LOG_LEVEL", "warn")

	dir := t.TempDir()
	configPath := filepath.Join(dir, "config.yaml")
	writeTestFile(t, configPath, []byte("http:\n  addr: :18080\nlog:\n  level: info\n"))

	opts := &options{configFile: configPath}
	fs := pflag.NewFlagSet("docker-view", pflag.ContinueOnError)
	addFlags(fs, opts)

	if err := fs.Set("http-addr", ":17070"); err != nil {
		t.Fatalf("set flag: %v", err)
	}

	cfg, err := loadConfig(opts, fs)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}

	if cfg.HTTP.Addr != ":17070" {
		t.Fatalf("expected flag to win, got %q", cfg.HTTP.Addr)
	}

	if cfg.Log.Level != "warn" {
		t.Fatalf("expected env to win over config file, got %q", cfg.Log.Level)
	}
}

func TestLoadConfigReadsConfigFileWhenNoOverrides(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "config.yaml")
	writeTestFile(t, configPath, []byte("docker:\n  host: unix:///var/run/docker.sock\nweb:\n  dir: ./web/dist\n"))

	opts := &options{configFile: configPath}
	fs := pflag.NewFlagSet("docker-view", pflag.ContinueOnError)
	addFlags(fs, opts)

	cfg, err := loadConfig(opts, fs)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}

	if cfg.Docker.Host != "unix:///var/run/docker.sock" {
		t.Fatalf("unexpected docker host %q", cfg.Docker.Host)
	}

	if cfg.Web.Dir != "./web/dist" {
		t.Fatalf("unexpected web dir %q", cfg.Web.Dir)
	}
}

func writeTestFile(t *testing.T, path string, data []byte) {
	t.Helper()
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatalf("write test file: %v", err)
	}
}
