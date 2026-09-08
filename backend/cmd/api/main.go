// Command api is the Expence Tracker HTTP server entrypoint.
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/reshnyakdg/expence-tracker/backend/internal/auth"
	"github.com/reshnyakdg/expence-tracker/backend/internal/config"
	"github.com/reshnyakdg/expence-tracker/backend/internal/db"
	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi"
	"github.com/reshnyakdg/expence-tracker/backend/internal/platform"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "api:", err)
		os.Exit(1)
	}
}

func run() error {
	configDir := os.Getenv("CONFIG_DIR")
	if configDir == "" {
		configDir = "config"
	}

	cfg, err := config.Load(configDir)
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	log := platform.NewLogger(cfg.Log.Level, cfg.Log.Format)
	log.Info("starting api", "env", cfg.AppEnv)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	pool, err := db.NewPool(ctx, db.Config{
		URL:      cfg.Database.URL,
		MaxConns: cfg.Database.MaxConns,
		MinConns: cfg.Database.MinConns,
	})
	if err != nil {
		return fmt.Errorf("connect database: %w", err)
	}
	defer pool.Close()

	issuer := auth.NewTokenIssuer(cfg.JWT.Secret, cfg.JWT.AccessTTL, cfg.JWT.RefreshTTL)
	google := auth.NewGoogleAuthenticator(
		cfg.GoogleOAuth.ClientID,
		cfg.GoogleOAuth.ClientSecret,
		cfg.GoogleOAuth.RedirectURL,
	)
	stateCodec := auth.NewStateCodec(cfg.JWT.Secret, 10*time.Minute)

	devAuth := cfg.AppEnv == "local"
	if devAuth {
		log.Warn("dev-login enabled (app_env=local): POST /api/v1/auth/dev-login is open")
	}

	handler := httpapi.NewRouter(httpapi.Deps{
		DB:        pool,
		Issuer:    issuer,
		Google:    google,
		State:     stateCodec,
		Log:       log,
		WebOrigin: cfg.HTTP.WebOrigin,
		DevAuth:   devAuth,
	})

	srv := &http.Server{
		Addr:         cfg.HTTP.Addr,
		Handler:      handler,
		ReadTimeout:  cfg.HTTP.ReadTimeout,
		WriteTimeout: cfg.HTTP.WriteTimeout,
	}

	if err := platform.RunServer(ctx, srv, cfg.HTTP.ShutdownTimeout, log); err != nil {
		return fmt.Errorf("server: %w", err)
	}
	log.Info("bye")
	return nil
}
