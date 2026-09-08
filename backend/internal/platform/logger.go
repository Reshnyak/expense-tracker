// Package platform holds cross-cutting infrastructure helpers (logging, HTTP
// server lifecycle) that are not tied to any particular domain.
package platform

import (
	"log/slog"
	"os"
	"strings"
)

// NewLogger builds a slog.Logger. format is "json" or "text"; level is one of
// debug|info|warn|error (defaults to info).
func NewLogger(level, format string) *slog.Logger {
	opts := &slog.HandlerOptions{Level: parseLevel(level)}

	var handler slog.Handler
	if strings.EqualFold(format, "json") {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}
	return slog.New(handler)
}

func parseLevel(level string) slog.Level {
	switch strings.ToLower(level) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
