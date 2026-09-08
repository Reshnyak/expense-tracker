// Package handlers implements the HTTP endpoints described in api/openapi.yaml.
// Handlers are thin: parse the request, call the service, map the result (or a
// domain error) to a response.
package handlers

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/dto"
	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/middleware"
	"github.com/reshnyakdg/expence-tracker/backend/internal/service"
)

// Handlers bundles the dependencies every endpoint needs.
type Handlers struct {
	Svc *service.Service
	Log *slog.Logger
}

func New(svc *service.Service, log *slog.Logger) *Handlers {
	if log == nil {
		log = slog.Default()
	}
	return &Handlers{Svc: svc, Log: log}
}

// currentUser returns the authenticated user id set by middleware.AuthRequired.
// It writes a 401 and returns ok=false if it is somehow missing (should not
// happen behind AuthRequired).
func (h *Handlers) currentUser(c *gin.Context) (uuid.UUID, bool) {
	uid, ok := middleware.UserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Error{Code: "unauthorized", Message: "missing bearer token"})
		return uuid.Nil, false
	}
	return uid, true
}

// pathUUID parses a path parameter as a UUID; a bad value is reported as 404 so
// callers cannot probe the id space.
func pathUUID(c *gin.Context, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Error{Code: "not_found", Message: "resource not found"})
		return uuid.Nil, false
	}
	return id, true
}

// bindJSON binds and validates a JSON body, writing a 400 with details on failure.
func bindJSON(c *gin.Context, v any) bool {
	if err := c.ShouldBindJSON(v); err != nil {
		c.JSON(http.StatusBadRequest, dto.Error{
			Code:    "bad_request",
			Message: "invalid request body",
			Details: map[string]any{"error": err.Error()},
		})
		return false
	}
	return true
}

// respondError maps a domain sentinel error to the matching HTTP status.
func (h *Handlers) respondError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		c.JSON(http.StatusNotFound, dto.Error{Code: "not_found", Message: err.Error()})
	case errors.Is(err, domain.ErrForbidden):
		c.JSON(http.StatusForbidden, dto.Error{Code: "forbidden", Message: err.Error()})
	case errors.Is(err, domain.ErrConflict):
		c.JSON(http.StatusConflict, dto.Error{Code: "conflict", Message: err.Error()})
	case errors.Is(err, domain.ErrValidation):
		c.JSON(http.StatusUnprocessableEntity, dto.Error{Code: "validation_failed", Message: err.Error()})
	case errors.Is(err, domain.ErrUnauthorized):
		c.JSON(http.StatusUnauthorized, dto.Error{Code: "unauthorized", Message: err.Error()})
	default:
		h.Log.Error("unhandled error", "path", c.FullPath(), "err", err)
		c.JSON(http.StatusInternalServerError, dto.Error{Code: "internal", Message: "internal server error"})
	}
}
