package repository

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/reshnyakdg/expence-tracker/backend/internal/db/sqlc"
	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
)

type refreshTokenRepo struct{ q *sqlc.Queries }

func (r *refreshTokenRepo) Create(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := r.q.CreateRefreshToken(ctx, sqlc.CreateRefreshTokenParams{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
	})
	return mapErr(err)
}

func (r *refreshTokenRepo) Get(ctx context.Context, tokenHash string) (domain.RefreshToken, error) {
	t, err := r.q.GetRefreshToken(ctx, tokenHash)
	if err != nil {
		return domain.RefreshToken{}, mapErr(err)
	}
	return domain.RefreshToken{
		UserID:    t.UserID,
		ExpiresAt: t.ExpiresAt,
		RevokedAt: fromTimestamptz(t.RevokedAt),
	}, nil
}

func (r *refreshTokenRepo) Revoke(ctx context.Context, tokenHash string) error {
	return mapErr(r.q.RevokeRefreshToken(ctx, tokenHash))
}

func (r *refreshTokenRepo) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	return mapErr(r.q.RevokeUserRefreshTokens(ctx, userID))
}
