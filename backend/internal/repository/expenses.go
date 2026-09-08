package repository

import (
	"context"

	"github.com/google/uuid"

	"github.com/reshnyakdg/expence-tracker/backend/internal/db/sqlc"
	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
)

type expenseRepo struct{ q *sqlc.Queries }

func (r *expenseRepo) List(ctx context.Context, spaceID uuid.UUID, f domain.ExpenseFilter) ([]domain.Expense, error) {
	rows, err := r.q.ListExpenses(ctx, sqlc.ListExpensesParams{
		SpaceID:  spaceID,
		FromDate: toDate(f.From),
		ToDate:   toDate(f.To),
		RowLimit: f.Limit,
	})
	if err != nil {
		return nil, mapErr(err)
	}
	out := make([]domain.Expense, len(rows))
	for i, e := range rows {
		out[i] = expenseFromSQLC(e)
	}
	return out, nil
}

func (r *expenseRepo) Create(ctx context.Context, spaceID uuid.UUID, in domain.ExpenseInput, createdBy uuid.UUID) (domain.Expense, error) {
	e, err := r.q.CreateExpense(ctx, sqlc.CreateExpenseParams{
		SpaceID:     spaceID,
		PayerID:     in.PayerID,
		CategoryID:  toNullUUID(in.CategoryID),
		AmountCents: in.AmountCents,
		Currency:    in.Currency,
		Description: in.Description,
		SpentAt:     toDate(in.SpentAt),
		CreatedBy:   createdBy,
	})
	if err != nil {
		return domain.Expense{}, mapErr(err)
	}
	return expenseFromSQLC(e), nil
}

func (r *expenseRepo) Get(ctx context.Context, id, spaceID uuid.UUID) (domain.Expense, error) {
	e, err := r.q.GetExpense(ctx, sqlc.GetExpenseParams{ID: id, SpaceID: spaceID})
	if err != nil {
		return domain.Expense{}, mapErr(err)
	}
	return expenseFromSQLC(e), nil
}

func (r *expenseRepo) Update(ctx context.Context, id, spaceID uuid.UUID, in domain.ExpenseInput) (domain.Expense, error) {
	e, err := r.q.UpdateExpense(ctx, sqlc.UpdateExpenseParams{
		ID:          id,
		SpaceID:     spaceID,
		PayerID:     in.PayerID,
		CategoryID:  toNullUUID(in.CategoryID),
		AmountCents: in.AmountCents,
		Currency:    in.Currency,
		Description: in.Description,
		SpentAt:     toDate(in.SpentAt),
	})
	if err != nil {
		return domain.Expense{}, mapErr(err)
	}
	return expenseFromSQLC(e), nil
}

func (r *expenseRepo) SoftDelete(ctx context.Context, id, spaceID uuid.UUID) error {
	return mapErr(r.q.SoftDeleteExpense(ctx, sqlc.SoftDeleteExpenseParams{ID: id, SpaceID: spaceID}))
}

func (r *expenseRepo) Balances(ctx context.Context, spaceID uuid.UUID) ([]domain.Balance, error) {
	rows, err := r.q.SpaceBalances(ctx, spaceID)
	if err != nil {
		return nil, mapErr(err)
	}
	out := make([]domain.Balance, len(rows))
	for i, b := range rows {
		out[i] = balanceFromRow(b)
	}
	return out, nil
}
