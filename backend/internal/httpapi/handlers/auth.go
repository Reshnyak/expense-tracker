package handlers

import "github.com/gin-gonic/gin"

// GET /api/v1/auth/google/login
func (h *Handlers) GoogleLogin(c *gin.Context) { notImplemented(c) }

// GET /api/v1/auth/google/callback
func (h *Handlers) GoogleCallback(c *gin.Context) { notImplemented(c) }

// POST /api/v1/auth/refresh
func (h *Handlers) Refresh(c *gin.Context) { notImplemented(c) }

// POST /api/v1/auth/logout
func (h *Handlers) Logout(c *gin.Context) { notImplemented(c) }

// GET /api/v1/me
func (h *Handlers) Me(c *gin.Context) { notImplemented(c) }
