package repository

import (
	"context"

	"github.com/google/uuid"

	"github.com/reshnyakdg/expence-tracker/backend/internal/db/sqlc"
	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
)

type userRepo struct{ q *sqlc.Queries }

func (r *userRepo) GetByID(ctx context.Context, id uuid.UUID) (domain.User, error) {
	u, err := r.q.GetUserByID(ctx, id)
	if err != nil {
		return domain.User{}, mapErr(err)
	}
	return userFromSQLC(u), nil
}

func (r *userRepo) GetByEmail(ctx context.Context, email string) (domain.User, error) {
	u, err := r.q.GetUserByEmail(ctx, email)
	if err != nil {
		return domain.User{}, mapErr(err)
	}
	return userFromSQLC(u), nil
}

func (r *userRepo) UpsertFromGoogle(ctx context.Context, p domain.GoogleUpsert) (domain.User, error) {
	sub := p.GoogleSub
	u, err := r.q.UpsertUserFromGoogle(ctx, sqlc.UpsertUserFromGoogleParams{
		Email:     p.Email,
		Name:      p.Name,
		AvatarUrl: p.AvatarURL,
		GoogleSub: &sub,
	})
	if err != nil {
		return domain.User{}, mapErr(err)
	}
	return userFromSQLC(u), nil
}

func (r *userRepo) UpsertByEmail(ctx context.Context, email, name string) (domain.User, error) {
	u, err := r.q.UpsertUserByEmail(ctx, sqlc.UpsertUserByEmailParams{Email: email, Name: name})
	if err != nil {
		return domain.User{}, mapErr(err)
	}
	return userFromSQLC(u), nil
}

func (r *userRepo) CreateLocal(ctx context.Context, email, name, passwordHash string) (domain.User, error) {
	hash := passwordHash
	u, err := r.q.CreateLocalUser(ctx, sqlc.CreateLocalUserParams{
		Email:        email,
		Name:         name,
		PasswordHash: &hash,
	})
	if err != nil {
		return domain.User{}, mapErr(err)
	}
	return userFromSQLC(u), nil
}

func (r *userRepo) LocalCredentials(ctx context.Context, email string) (domain.User, string, error) {
	u, err := r.q.GetLocalCredentialsByEmail(ctx, email)
	if err != nil {
		return domain.User{}, "", mapErr(err)
	}
	// password_hash is guaranteed non-NULL by the query's WHERE clause.
	return userFromSQLC(u), *u.PasswordHash, nil
}
