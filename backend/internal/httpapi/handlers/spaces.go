package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/dto"
)

// GET /api/v1/spaces
func (h *Handlers) ListSpaces(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	spaces, err := h.Svc.ListSpaces(c.Request.Context(), uid)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, spaces)
}

// POST /api/v1/spaces
func (h *Handlers) CreateSpace(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	var in dto.SpaceInput
	if !bindJSON(c, &in) {
		return
	}
	space, err := h.Svc.CreateSpace(c.Request.Context(), uid, in)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, space)
}

// GET /api/v1/spaces/:spaceId
func (h *Handlers) GetSpace(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	spaceID, ok := pathUUID(c, "spaceId")
	if !ok {
		return
	}
	space, err := h.Svc.GetSpace(c.Request.Context(), uid, spaceID)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, space)
}

// GET /api/v1/spaces/:spaceId/members
func (h *Handlers) ListMembers(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	spaceID, ok := pathUUID(c, "spaceId")
	if !ok {
		return
	}
	members, err := h.Svc.ListMembers(c.Request.Context(), uid, spaceID)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, members)
}

// POST /api/v1/spaces/:spaceId/members
func (h *Handlers) AddMember(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	spaceID, ok := pathUUID(c, "spaceId")
	if !ok {
		return
	}
	var in dto.AddMemberInput
	if !bindJSON(c, &in) {
		return
	}
	member, err := h.Svc.AddMember(c.Request.Context(), uid, spaceID, in)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, member)
}
