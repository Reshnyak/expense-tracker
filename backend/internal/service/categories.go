package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/dto"
)

func (s *Service) ListCategories(ctx context.Context, userID, spaceID uuid.UUID) ([]dto.Category, error) {
	if err := s.assertMember(ctx, spaceID, userID); err != nil {
		return nil, err
	}
	cats, err := s.store.Categories().List(ctx, spaceID)
	if err != nil {
		return nil, err
	}
	return mapSlice(cats, categoryToDTO), nil
}

func (s *Service) CreateCategory(ctx context.Context, userID, spaceID uuid.UUID, in dto.CategoryInput) (dto.Category, error) {
	if err := s.assertMember(ctx, spaceID, userID); err != nil {
		return dto.Category{}, err
	}
	name := strings.TrimSpace(in.Name)
	if name == "" {
		return dto.Category{}, fmt.Errorf("%w: name is required", domain.ErrValidation)
	}
	c, err := s.store.Categories().Create(ctx, spaceID, domain.CategoryInput{
		Name:  name,
		Color: emptyToNil(in.Color),
		Icon:  emptyToNil(in.Icon),
	})
	if err != nil {
		// unique (space_id, name) violation surfaces as domain.ErrConflict
		return dto.Category{}, err
	}
	return categoryToDTO(c), nil
}
