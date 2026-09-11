package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/dto"
)

// GET /api/v1/spaces/:spaceId/categories
func (h *Handlers) ListCategories(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	spaceID, ok := pathUUID(c, "spaceId")
	if !ok {
		return
	}
	cats, err := h.Svc.ListCategories(c.Request.Context(), uid, spaceID)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, cats)
}

// POST /api/v1/spaces/:spaceId/categories
func (h *Handlers) CreateCategory(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	spaceID, ok := pathUUID(c, "spaceId")
	if !ok {
		return
	}
	var in dto.CategoryInput
	if !bindJSON(c, &in) {
		return
	}
	cat, err := h.Svc.CreateCategory(c.Request.Context(), uid, spaceID, in)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, cat)
}

// PATCH /api/v1/spaces/:spaceId/categories/:categoryId
func (h *Handlers) UpdateCategory(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	spaceID, ok := pathUUID(c, "spaceId")
	if !ok {
		return
	}
	categoryID, ok := pathUUID(c, "categoryId")
	if !ok {
		return
	}
	var in dto.CategoryInput
	if !bindJSON(c, &in) {
		return
	}
	cat, err := h.Svc.UpdateCategory(c.Request.Context(), uid, spaceID, categoryID, in)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, cat)
}

// DELETE /api/v1/spaces/:spaceId/categories/:categoryId
func (h *Handlers) DeleteCategory(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	spaceID, ok := pathUUID(c, "spaceId")
	if !ok {
		return
	}
	categoryID, ok := pathUUID(c, "categoryId")
	if !ok {
		return
	}
	if err := h.Svc.DeleteCategory(c.Request.Context(), uid, spaceID, categoryID); err != nil {
		h.respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
