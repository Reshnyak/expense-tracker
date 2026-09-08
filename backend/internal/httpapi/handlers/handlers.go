// Package handlers implements the HTTP endpoints described in api/openapi.yaml.
// Method bodies are stubs that return 501 until the service layer is wired in.
package handlers

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/reshnyakdg/expence-tracker/backend/internal/auth"
	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/dto"
)

// Handlers bundles the dependencies every endpoint needs.
type Handlers struct {
	DB     *pgxpool.Pool
	Issuer *auth.TokenIssuer
	Google *auth.GoogleAuthenticator
	Log    *slog.Logger
}

func New(db *pgxpool.Pool, issuer *auth.TokenIssuer, google *auth.GoogleAuthenticator, log *slog.Logger) *Handlers {
	return &Handlers{DB: db, Issuer: issuer, Google: google, Log: log}
}

// notImplemented is the placeholder response for every stubbed endpoint.
func notImplemented(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, dto.Error{
		Code:    "not_implemented",
		Message: "endpoint not implemented yet",
	})
}
