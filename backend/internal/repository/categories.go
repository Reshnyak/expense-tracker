package repository

import (
	"context"

	"github.com/google/uuid"

	"github.com/reshnyakdg/expence-tracker/backend/internal/db/sqlc"
	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
)

type categoryRepo struct{ q *sqlc.Queries }

func (r *categoryRepo) List(ctx context.Context, spaceID uuid.UUID) ([]domain.Category, error) {
	rows, err := r.q.ListCategories(ctx, spaceID)
	if err != nil {
		return nil, mapErr(err)
	}
	out := make([]domain.Category, len(rows))
	for i, c := range rows {
		out[i] = categoryFromSQLC(c)
	}
	return out, nil
}

func (r *categoryRepo) Create(ctx context.Context, spaceID uuid.UUID, in domain.CategoryInput) (domain.Category, error) {
	c, err := r.q.CreateCategory(ctx, sqlc.CreateCategoryParams{
		SpaceID: spaceID,
		Name:    in.Name,
		Color:   in.Color,
		Icon:    in.Icon,
	})
	if err != nil {
		return domain.Category{}, mapErr(err)
	}
	return categoryFromSQLC(c), nil
}

func (r *categoryRepo) Get(ctx context.Context, id, spaceID uuid.UUID) (domain.Category, error) {
	c, err := r.q.GetCategory(ctx, sqlc.GetCategoryParams{ID: id, SpaceID: spaceID})
	if err != nil {
		return domain.Category{}, mapErr(err)
	}
	return categoryFromSQLC(c), nil
}
