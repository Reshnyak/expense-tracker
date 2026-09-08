package service

import (
	"context"

	"github.com/google/uuid"

	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/dto"
)

func (s *Service) Balances(ctx context.Context, userID, spaceID uuid.UUID) ([]dto.Balance, error) {
	if err := s.assertMember(ctx, spaceID, userID); err != nil {
		return nil, err
	}
	balances, err := s.store.Expenses().Balances(ctx, spaceID)
	if err != nil {
		return nil, err
	}
	return mapSlice(balances, balanceToDTO), nil
}
