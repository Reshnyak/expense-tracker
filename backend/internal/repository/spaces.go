package repository

import (
	"context"

	"github.com/google/uuid"

	"github.com/reshnyakdg/expence-tracker/backend/internal/db/sqlc"
	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
)

type spaceRepo struct{ q *sqlc.Queries }

func (r *spaceRepo) ListForUser(ctx context.Context, userID uuid.UUID) ([]domain.Space, error) {
	rows, err := r.q.ListSpacesForUser(ctx, userID)
	if err != nil {
		return nil, mapErr(err)
	}
	out := make([]domain.Space, len(rows))
	for i, s := range rows {
		out[i] = spaceFromSQLC(s)
	}
	return out, nil
}

func (r *spaceRepo) Create(ctx context.Context, name string, ownerID uuid.UUID, currency string) (domain.Space, error) {
	s, err := r.q.CreateSpace(ctx, sqlc.CreateSpaceParams{
		Name:     name,
		OwnerID:  ownerID,
		Currency: currency,
	})
	if err != nil {
		return domain.Space{}, mapErr(err)
	}
	return spaceFromSQLC(s), nil
}

func (r *spaceRepo) Get(ctx context.Context, id uuid.UUID) (domain.Space, error) {
	s, err := r.q.GetSpace(ctx, id)
	if err != nil {
		return domain.Space{}, mapErr(err)
	}
	return spaceFromSQLC(s), nil
}

func (r *spaceRepo) AddMember(ctx context.Context, spaceID, userID uuid.UUID, role string) (domain.SpaceMember, error) {
	m, err := r.q.AddSpaceMember(ctx, sqlc.AddSpaceMemberParams{
		SpaceID: spaceID,
		UserID:  userID,
		Role:    role,
	})
	if err != nil {
		return domain.SpaceMember{}, mapErr(err)
	}
	return memberFromSQLC(m), nil
}

func (r *spaceRepo) ListMembers(ctx context.Context, spaceID uuid.UUID) ([]domain.SpaceMember, error) {
	rows, err := r.q.ListSpaceMembers(ctx, spaceID)
	if err != nil {
		return nil, mapErr(err)
	}
	out := make([]domain.SpaceMember, len(rows))
	for i, m := range rows {
		out[i] = memberFromRow(m)
	}
	return out, nil
}

func (r *spaceRepo) IsMember(ctx context.Context, spaceID, userID uuid.UUID) (bool, error) {
	ok, err := r.q.IsSpaceMember(ctx, sqlc.IsSpaceMemberParams{SpaceID: spaceID, UserID: userID})
	if err != nil {
		return false, mapErr(err)
	}
	return ok, nil
}
