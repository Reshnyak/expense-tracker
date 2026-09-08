package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/dto"
	"github.com/reshnyakdg/expence-tracker/backend/internal/service"
)

// GET /api/v1/spaces/:spaceId/expenses
func (h *Handlers) ListExpenses(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	spaceID, ok := pathUUID(c, "spaceId")
	if !ok {
		return
	}
	q := service.ExpenseListQuery{From: c.Query("from"), To: c.Query("to")}
	if raw := c.Query("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.Error{Code: "bad_request", Message: "limit must be an integer"})
			return
		}
		q.Limit = n
	}
	list, err := h.Svc.ListExpenses(c.Request.Context(), uid, spaceID, q)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, list)
}

// POST /api/v1/spaces/:spaceId/expenses
func (h *Handlers) CreateExpense(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	spaceID, ok := pathUUID(c, "spaceId")
	if !ok {
		return
	}
	var in dto.ExpenseInput
	if !bindJSON(c, &in) {
		return
	}
	exp, err := h.Svc.CreateExpense(c.Request.Context(), uid, spaceID, in)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, exp)
}

// GET /api/v1/spaces/:spaceId/expenses/:expenseId
func (h *Handlers) GetExpense(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	spaceID, ok := pathUUID(c, "spaceId")
	if !ok {
		return
	}
	expenseID, ok := pathUUID(c, "expenseId")
	if !ok {
		return
	}
	exp, err := h.Svc.GetExpense(c.Request.Context(), uid, spaceID, expenseID)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, exp)
}

// PATCH /api/v1/spaces/:spaceId/expenses/:expenseId
func (h *Handlers) UpdateExpense(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	spaceID, ok := pathUUID(c, "spaceId")
	if !ok {
		return
	}
	expenseID, ok := pathUUID(c, "expenseId")
	if !ok {
		return
	}
	var in dto.ExpenseInput
	if !bindJSON(c, &in) {
		return
	}
	exp, err := h.Svc.UpdateExpense(c.Request.Context(), uid, spaceID, expenseID, in)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, exp)
}

// DELETE /api/v1/spaces/:spaceId/expenses/:expenseId
func (h *Handlers) DeleteExpense(c *gin.Context) {
	uid, ok := h.currentUser(c)
	if !ok {
		return
	}
	spaceID, ok := pathUUID(c, "spaceId")
	if !ok {
		return
	}
	expenseID, ok := pathUUID(c, "expenseId")
	if !ok {
		return
	}
	if err := h.Svc.DeleteExpense(c.Request.Context(), uid, spaceID, expenseID); err != nil {
		h.respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
