package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GET /api/v1/spaces/:spaceId/balances
func (h *Handlers) SpaceBalances(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	spaceID, ok := pathUUID(c, "spaceId")
	if !ok {
		return
	}
	balances, err := h.Svc.Balances(c.Request.Context(), uid, spaceID)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, balances)
}
