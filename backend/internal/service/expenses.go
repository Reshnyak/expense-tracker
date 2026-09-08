package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/dto"
)

const (
	defaultExpenseLimit = 50
	maxExpenseLimit     = 200
)

var (
	minSpentAt = time.Date(1, 1, 1, 0, 0, 0, 0, time.UTC)
	maxSpentAt = time.Date(9999, 12, 31, 0, 0, 0, 0, time.UTC)
)

// ExpenseListQuery holds the raw query-string filters for ListExpenses.
type ExpenseListQuery struct {
	From  string // YYYY-MM-DD or ""
	To    string // YYYY-MM-DD or ""
	Limit int    // 0 = default
}

func (s *Service) ListExpenses(ctx context.Context, userID, spaceID uuid.UUID, q ExpenseListQuery) (dto.ExpenseList, error) {
	if err := s.assertMember(ctx, spaceID, userID); err != nil {
		return dto.ExpenseList{}, err
	}

	f := domain.ExpenseFilter{From: minSpentAt, To: maxSpentAt, Limit: defaultExpenseLimit}
	if q.From != "" {
		t, err := time.Parse(dateLayout, q.From)
		if err != nil {
			return dto.ExpenseList{}, fmt.Errorf("%w: 'from' must be YYYY-MM-DD", domain.ErrValidation)
		}
		f.From = t
	}
	if q.To != "" {
		t, err := time.Parse(dateLayout, q.To)
		if err != nil {
			return dto.ExpenseList{}, fmt.Errorf("%w: 'to' must be YYYY-MM-DD", domain.ErrValidation)
		}
		f.To = t
	}
	if q.Limit > 0 {
		f.Limit = int32(min(q.Limit, maxExpenseLimit))
	}

	items, err := s.store.Expenses().List(ctx, spaceID, f)
	if err != nil {
		return dto.ExpenseList{}, err
	}
	return dto.ExpenseList{Items: mapSlice(items, expenseToDTO), NextCursor: nil}, nil
}

func (s *Service) CreateExpense(ctx context.Context, userID, spaceID uuid.UUID, in dto.ExpenseInput) (dto.Expense, error) {
	if err := s.assertMember(ctx, spaceID, userID); err != nil {
		return dto.Expense{}, err
	}
	din, err := s.buildExpenseInput(ctx, spaceID, in)
	if err != nil {
		return dto.Expense{}, err
	}
	e, err := s.store.Expenses().Create(ctx, spaceID, din, userID)
	if err != nil {
		return dto.Expense{}, err
	}
	return expenseToDTO(e), nil
}

func (s *Service) GetExpense(ctx context.Context, userID, spaceID, expenseID uuid.UUID) (dto.Expense, error) {
	if err := s.assertMember(ctx, spaceID, userID); err != nil {
		return dto.Expense{}, err
	}
	e, err := s.store.Expenses().Get(ctx, expenseID, spaceID)
	if err != nil {
		return dto.Expense{}, err
	}
	return expenseToDTO(e), nil
}

func (s *Service) UpdateExpense(ctx context.Context, userID, spaceID, expenseID uuid.UUID, in dto.ExpenseInput) (dto.Expense, error) {
	if err := s.assertMember(ctx, spaceID, userID); err != nil {
		return dto.Expense{}, err
	}
	din, err := s.buildExpenseInput(ctx, spaceID, in)
	if err != nil {
		return dto.Expense{}, err
	}
	e, err := s.store.Expenses().Update(ctx, expenseID, spaceID, din)
	if err != nil {
		return dto.Expense{}, err
	}
	return expenseToDTO(e), nil
}

func (s *Service) DeleteExpense(ctx context.Context, userID, spaceID, expenseID uuid.UUID) error {
	if err := s.assertMember(ctx, spaceID, userID); err != nil {
		return err
	}
	if _, err := s.store.Expenses().Get(ctx, expenseID, spaceID); err != nil {
		return err // ErrNotFound when already gone / never existed
	}
	return s.store.Expenses().SoftDelete(ctx, expenseID, spaceID)
}

// buildExpenseInput validates and normalises a dto.ExpenseInput into a
// domain.ExpenseInput: payer must be a member, category (if any) must belong to
// the space, currency defaults to the space currency.
func (s *Service) buildExpenseInput(ctx context.Context, spaceID uuid.UUID, in dto.ExpenseInput) (domain.ExpenseInput, error) {
	var out domain.ExpenseInput

	payerID, err := uuid.Parse(in.PayerID)
	if err != nil {
		return out, fmt.Errorf("%w: payer_id must be a uuid", domain.ErrValidation)
	}
	payerIsMember, err := s.store.Spaces().IsMember(ctx, spaceID, payerID)
	if err != nil {
		return out, err
	}
	if !payerIsMember {
		return out, fmt.Errorf("%w: payer is not a member of this space", domain.ErrValidation)
	}

	if in.AmountCents <= 0 {
		return out, fmt.Errorf("%w: amount_cents must be greater than 0", domain.ErrValidation)
	}

	spentAt, err := time.Parse(dateLayout, in.SpentAt)
	if err != nil {
		return out, fmt.Errorf("%w: spent_at must be YYYY-MM-DD", domain.ErrValidation)
	}

	var categoryID *uuid.UUID
	if strings.TrimSpace(in.CategoryID) != "" {
		cid, err := uuid.Parse(in.CategoryID)
		if err != nil {
			return out, fmt.Errorf("%w: category_id must be a uuid", domain.ErrValidation)
		}
		if _, err := s.store.Categories().Get(ctx, cid, spaceID); err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return out, fmt.Errorf("%w: category not found in this space", domain.ErrValidation)
			}
			return out, err
		}
		categoryID = &cid
	}

	currency := strings.ToUpper(strings.TrimSpace(in.Currency))
	if currency == "" {
		sp, err := s.store.Spaces().Get(ctx, spaceID)
		if err != nil {
			return out, err
		}
		currency = sp.Currency
	}
	if len(currency) != 3 {
		return out, fmt.Errorf("%w: currency must be a 3-letter code", domain.ErrValidation)
	}

	out = domain.ExpenseInput{
		PayerID:     payerID,
		CategoryID:  categoryID,
		AmountCents: in.AmountCents,
		Currency:    currency,
		Description: emptyToNil(in.Description),
		SpentAt:     spentAt,
	}
	return out, nil
}
