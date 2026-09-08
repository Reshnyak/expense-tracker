package handlers

import "github.com/gin-gonic/gin"

// GET /api/v1/spaces
func (h *Handlers) ListSpaces(c *gin.Context) { notImplemented(c) }

// POST /api/v1/spaces
func (h *Handlers) CreateSpace(c *gin.Context) { notImplemented(c) }

// GET /api/v1/spaces/:spaceId
func (h *Handlers) GetSpace(c *gin.Context) { notImplemented(c) }

// GET /api/v1/spaces/:spaceId/members
func (h *Handlers) ListMembers(c *gin.Context) { notImplemented(c) }

// POST /api/v1/spaces/:spaceId/members
func (h *Handlers) AddMember(c *gin.Context) { notImplemented(c) }
