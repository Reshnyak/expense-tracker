package handlers

import "github.com/gin-gonic/gin"

// GET /api/v1/spaces/:spaceId/expenses
func (h *Handlers) ListExpenses(c *gin.Context) { notImplemented(c) }

// POST /api/v1/spaces/:spaceId/expenses
func (h *Handlers) CreateExpense(c *gin.Context) { notImplemented(c) }

// GET /api/v1/spaces/:spaceId/expenses/:expenseId
func (h *Handlers) GetExpense(c *gin.Context) { notImplemented(c) }

// PATCH /api/v1/spaces/:spaceId/expenses/:expenseId
func (h *Handlers) UpdateExpense(c *gin.Context) { notImplemented(c) }

// DELETE /api/v1/spaces/:spaceId/expenses/:expenseId
func (h *Handlers) DeleteExpense(c *gin.Context) { notImplemented(c) }
