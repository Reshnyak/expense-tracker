package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/dto"
)

// GET /api/v1/auth/google/login
func (h *Handlers) GoogleLogin(c *gin.Context) {
	url, err := h.Svc.GoogleLoginURL(c.Query("redirect_uri"))
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.Redirect(http.StatusFound, url)
}

// GET /api/v1/auth/google/callback
func (h *Handlers) GoogleCallback(c *gin.Context) {
	pair, err := h.Svc.CompleteGoogleLogin(c.Request.Context(), c.Query("code"), c.Query("state"))
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, pair)
}

// POST /api/v1/auth/dev-login  (only wired when app_env=local)
func (h *Handlers) DevLogin(c *gin.Context) {
	var in dto.DevLoginInput
	if !bindJSON(c, &in) {
		return
	}
	pair, err := h.Svc.DevLogin(c.Request.Context(), in.Email, in.Name)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, pair)
}

// POST /api/v1/auth/refresh
func (h *Handlers) Refresh(c *gin.Context) {
	var in dto.RefreshInput
	if !bindJSON(c, &in) {
		return
	}
	pair, err := h.Svc.Refresh(c.Request.Context(), in.RefreshToken)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, pair)
}

// POST /api/v1/auth/logout
func (h *Handlers) Logout(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	if err := h.Svc.Logout(c.Request.Context(), uid); err != nil {
		h.respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// GET /api/v1/me
func (h *Handlers) Me(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	user, err := h.Svc.Me(c.Request.Context(), uid)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, user)
}
