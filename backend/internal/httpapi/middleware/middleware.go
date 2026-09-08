// Package middleware holds Gin middleware shared across routes.
package middleware

import (
	"log/slog"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/reshnyakdg/expence-tracker/backend/internal/auth"
	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/dto"
)

const (
	ctxUserIDKey    = "userID"
	ctxRequestIDKey = "requestID"
	headerRequestID = "X-Request-Id"
)

// RequestID assigns a request id (honouring an inbound X-Request-Id) and echoes
// it back on the response.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		rid := c.GetHeader(headerRequestID)
		if rid == "" {
			rid = uuid.NewString()
		}
		c.Set(ctxRequestIDKey, rid)
		c.Header(headerRequestID, rid)
		c.Next()
	}
}

// Logger emits one structured line per request.
func Logger(log *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		log.Info("http request",
			slog.String("method", c.Request.Method),
			slog.String("path", c.Request.URL.Path),
			slog.Int("status", c.Writer.Status()),
			slog.Duration("took", time.Since(start)),
			slog.String("request_id", c.GetString(ctxRequestIDKey)),
		)
	}
}

// CORS is a minimal allow-list CORS handler for the SPA origin.
func CORS(origin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-Id")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		}
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

// AuthRequired validates the Bearer access token and stores the user id in the
// Gin context (read it with UserID).
func AuthRequired(issuer *auth.TokenIssuer) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		token, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || token == "" {
			c.AbortWithStatusJSON(401, dto.Error{Code: "unauthorized", Message: "missing bearer token"})
			return
		}
		uid, err := issuer.ParseAccess(token)
		if err != nil {
			c.AbortWithStatusJSON(401, dto.Error{Code: "unauthorized", Message: "invalid token"})
			return
		}
		c.Set(ctxUserIDKey, uid)
		c.Next()
	}
}

// UserID returns the authenticated user id set by AuthRequired.
func UserID(c *gin.Context) (uuid.UUID, bool) {
	v, ok := c.Get(ctxUserIDKey)
	if !ok {
		return uuid.Nil, false
	}
	uid, ok := v.(uuid.UUID)
	return uid, ok
}
