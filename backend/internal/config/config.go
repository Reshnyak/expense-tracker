// Package config loads layered configuration: config/default.yaml, then
// config/<APP_ENV>.yaml, then environment variable overrides.
package config

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	AppEnv      string            `mapstructure:"app_env"`
	HTTP        HTTPConfig        `mapstructure:"http"`
	Database    DatabaseConfig    `mapstructure:"database"`
	JWT         JWTConfig         `mapstructure:"jwt"`
	GoogleOAuth GoogleOAuthConfig `mapstructure:"google_oauth"`
	Log         LogConfig         `mapstructure:"log"`
}

type HTTPConfig struct {
	Addr            string        `mapstructure:"addr"`
	WebOrigin       string        `mapstructure:"web_origin"`
	ReadTimeout     time.Duration `mapstructure:"read_timeout"`
	WriteTimeout    time.Duration `mapstructure:"write_timeout"`
	ShutdownTimeout time.Duration `mapstructure:"shutdown_timeout"`
}

type DatabaseConfig struct {
	URL      string `mapstructure:"url"`
	MaxConns int32  `mapstructure:"max_conns"`
	MinConns int32  `mapstructure:"min_conns"`
}

type JWTConfig struct {
	Secret     string        `mapstructure:"secret"`
	AccessTTL  time.Duration `mapstructure:"access_ttl"`
	RefreshTTL time.Duration `mapstructure:"refresh_ttl"`
}

type GoogleOAuthConfig struct {
	ClientID     string `mapstructure:"client_id"`
	ClientSecret string `mapstructure:"client_secret"`
	RedirectURL  string `mapstructure:"redirect_url"`
}

type LogConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
}

// Load reads configuration from configDir. APP_ENV (default "local") selects the
// overlay file. Environment variables override any key: nested keys map with "_"
// (e.g. http.addr -> HTTP_ADDR, database.url -> DATABASE_URL).
func Load(configDir string) (*Config, error) {
	v := viper.New()
	v.SetConfigType("yaml")
	v.AddConfigPath(configDir)

	v.SetConfigName("default")
	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("read default config: %w", err)
	}

	appEnv := firstNonEmpty(os.Getenv("APP_ENV"), v.GetString("app_env"), "local")
	v.SetConfigName(appEnv)
	if err := v.MergeInConfig(); err != nil {
		var notFound viper.ConfigFileNotFoundError
		if !errors.As(err, &notFound) {
			return nil, fmt.Errorf("merge %s config: %w", appEnv, err)
		}
	}

	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()
	bindEnv(v)

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}
	cfg.AppEnv = appEnv
	return &cfg, nil
}

// bindEnv registers the keys we want overridable from the environment so
// AutomaticEnv picks them up even when absent from the yaml files.
func bindEnv(v *viper.Viper) {
	for _, key := range []string{
		"http.addr", "http.web_origin",
		"database.url",
		"jwt.secret", "jwt.access_ttl", "jwt.refresh_ttl",
		"google_oauth.client_id", "google_oauth.client_secret", "google_oauth.redirect_url",
		"log.level", "log.format",
	} {
		_ = v.BindEnv(key)
	}
}

func firstNonEmpty(vals ...string) string {
	for _, s := range vals {
		if s != "" {
			return s
		}
	}
	return ""
}
