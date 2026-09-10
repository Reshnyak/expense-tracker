package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Store is the persistence boundary the service layer depends on. The concrete
// implementation lives in internal/repository (backed by sqlc + pgx). Splitting
// it per aggregate keeps call sites narrow and makes room for the model to grow.
type Store interface {
	Users() UserRepository
	Spaces() SpaceRepository
	Categories() CategoryRepository
	Expenses() ExpenseRepository
	RefreshTokens() RefreshTokenRepository

	// WithTx runs fn against a Store bound to a single transaction. The
	// transaction commits when fn returns nil and rolls back otherwise.
	WithTx(ctx context.Context, fn func(Store) error) error
}

type UserRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (User, error)
	GetByEmail(ctx context.Context, email string) (User, error)
	UpsertFromGoogle(ctx context.Context, p GoogleUpsert) (User, error)
	UpsertByEmail(ctx context.Context, email, name string) (User, error)

	// CreateLocal inserts an email + password account. A duplicate email
	// returns ErrConflict.
	CreateLocal(ctx context.Context, email, name, passwordHash string) (User, error)
	// LocalCredentials returns the user and their bcrypt hash for password
	// login. It returns ErrNotFound both when no user has that email and when
	// the user has no password set (a Google-only account) — callers must not
	// distinguish the two.
	LocalCredentials(ctx context.Context, email string) (User, string, error)
}

type SpaceRepository interface {
	ListForUser(ctx context.Context, userID uuid.UUID) ([]Space, error)
	Create(ctx context.Context, name string, ownerID uuid.UUID, currency string) (Space, error)
	Get(ctx context.Context, id uuid.UUID) (Space, error)
	AddMember(ctx context.Context, spaceID, userID uuid.UUID, role string) (SpaceMember, error)
	ListMembers(ctx context.Context, spaceID uuid.UUID) ([]SpaceMember, error)
	IsMember(ctx context.Context, spaceID, userID uuid.UUID) (bool, error)
}

type CategoryRepository interface {
	List(ctx context.Context, spaceID uuid.UUID) ([]Category, error)
	Create(ctx context.Context, spaceID uuid.UUID, in CategoryInput) (Category, error)
	Get(ctx context.Context, id, spaceID uuid.UUID) (Category, error)
	Update(ctx context.Context, id, spaceID uuid.UUID, in CategoryInput) (Category, error)
	Delete(ctx context.Context, id, spaceID uuid.UUID) error
}

type ExpenseRepository interface {
	List(ctx context.Context, spaceID uuid.UUID, f ExpenseFilter) ([]Expense, error)
	Create(ctx context.Context, spaceID uuid.UUID, in ExpenseInput, createdBy uuid.UUID) (Expense, error)
	Get(ctx context.Context, id, spaceID uuid.UUID) (Expense, error)
	Update(ctx context.Context, id, spaceID uuid.UUID, in ExpenseInput) (Expense, error)
	SoftDelete(ctx context.Context, id, spaceID uuid.UUID) error
	Balances(ctx context.Context, spaceID uuid.UUID) ([]Balance, error)
}

type RefreshTokenRepository interface {
	Create(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error
	Get(ctx context.Context, tokenHash string) (RefreshToken, error)
	Revoke(ctx context.Context, tokenHash string) error
	RevokeAllForUser(ctx context.Context, userID uuid.UUID) error
}
