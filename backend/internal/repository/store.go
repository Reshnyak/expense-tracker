// Package repository implements domain.Store on top of the sqlc-generated
// queries and a pgx pool. All conversions between database types (pgtype.*,
// uuid.NullUUID, ...) and the framework-free domain types live in this package;
// nothing above it imports internal/db/sqlc.
package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/reshnyakdg/expence-tracker/backend/internal/db/sqlc"
	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
)

// Store is the concrete domain.Store. When pool is nil the Store is bound to an
// open transaction (created by WithTx) and must not start another.
type Store struct {
	pool *pgxpool.Pool
	q    *sqlc.Queries
}

// New builds a Store backed by pool.
func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool, q: sqlc.New(pool)}
}

func (s *Store) Users() domain.UserRepository   { return &userRepo{s.q} }
func (s *Store) Spaces() domain.SpaceRepository { return &spaceRepo{s.q} }
func (s *Store) Categories() domain.CategoryRepository {
	return &categoryRepo{s.q}
}
func (s *Store) Expenses() domain.ExpenseRepository { return &expenseRepo{s.q} }
func (s *Store) RefreshTokens() domain.RefreshTokenRepository {
	return &refreshTokenRepo{s.q}
}

// WithTx runs fn inside a single pgx transaction. A nested call (pool == nil)
// reuses the current transaction instead of opening a new one.
func (s *Store) WithTx(ctx context.Context, fn func(domain.Store) error) error {
	if s.pool == nil {
		return fn(s)
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := fn(&Store{q: s.q.WithTx(tx)}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

var _ domain.Store = (*Store)(nil)
