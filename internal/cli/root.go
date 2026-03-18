package cli

import (
	"errors"
	"fmt"
	"strings"

	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"github.com/spf13/viper"
	"github.com/wanglei/docker-view/internal/app"
	"github.com/wanglei/docker-view/internal/config"
	"github.com/wanglei/docker-view/pkg/version"
)

const envPrefix = "DOCKER_VIEW"

func NewRootCommand() *cobra.Command {
	opts := newOptions()

	cmd := &cobra.Command{
		Use:           "docker-view",
		Short:         "Manage Linux containers through a web UI",
		SilenceUsage:  true,
		SilenceErrors: true,
		Version:       version.String(),
		RunE: func(cmd *cobra.Command, _ []string) error {
			cfg, err := loadConfig(opts, cmd.Flags())
			if err != nil {
				return err
			}

			return app.New(cfg).Run(cmd.Context())
		},
	}

	addFlags(cmd.PersistentFlags(), opts)
	cmd.AddCommand(newVersionCommand())

	return cmd
}

func newVersionCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Print version information",
		Run: func(cmd *cobra.Command, _ []string) {
			cmd.Println(version.String())
		},
	}
}

type options struct {
	configFile string
}

func newOptions() *options {
	return &options{}
}

func addFlags(fs *pflag.FlagSet, opts *options) {
	fs.StringVar(&opts.configFile, "config", "", "Path to a YAML config file")
	fs.String("http-addr", "", "HTTP listen address")
	fs.String("log-level", "", "Application log level")
	fs.String("docker-host", "", "Docker Engine host")
	fs.String("web-dir", "", "Directory for built frontend assets")
}

func loadConfig(opts *options, fs *pflag.FlagSet) (config.Config, error) {
	v := viper.New()

	config.SetDefaults(v)
	v.SetEnvPrefix(envPrefix)
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_", "-", "_"))
	v.AutomaticEnv()

	if opts.configFile != "" {
		v.SetConfigFile(opts.configFile)
	} else {
		v.SetConfigName("config")
		v.SetConfigType("yaml")
		v.AddConfigPath(".")
		v.AddConfigPath("./configs")
	}

	if err := v.ReadInConfig(); err != nil {
		var configNotFound viper.ConfigFileNotFoundError
		if !errors.As(err, &configNotFound) {
			return config.Config{}, fmt.Errorf("read config: %w", err)
		}
	}

	for key, flagName := range map[string]string{
		"http.addr":   "http-addr",
		"log.level":   "log-level",
		"docker.host": "docker-host",
		"web.dir":     "web-dir",
	} {
		if err := v.BindPFlag(key, fs.Lookup(flagName)); err != nil {
			return config.Config{}, fmt.Errorf("bind flag %q: %w", flagName, err)
		}
	}

	return config.FromViper(v), nil
}
