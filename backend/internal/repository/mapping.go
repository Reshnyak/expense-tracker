package repository

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/reshnyakdg/expence-tracker/backend/internal/db/sqlc"
	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
)

const pgUniqueViolation = "23505"

// mapErr normalises pgx / pg errors into domain sentinels so the layers above
// never import a database package.
func mapErr(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == pgUniqueViolation {
		return domain.ErrConflict
	}
	return err
}

func toDate(t time.Time) pgtype.Date { return pgtype.Date{Time: t, Valid: true} }

func toNullUUID(p *uuid.UUID) uuid.NullUUID {
	if p == nil {
		return uuid.NullUUID{}
	}
	return uuid.NullUUID{UUID: *p, Valid: true}
}

func fromNullUUID(n uuid.NullUUID) *uuid.UUID {
	if !n.Valid {
		return nil
	}
	u := n.UUID
	return &u
}

func fromTimestamptz(t pgtype.Timestamptz) *time.Time {
	if !t.Valid {
		return nil
	}
	v := t.Time
	return &v
}

func userFromSQLC(u sqlc.User) domain.User {
	return domain.User{
		ID:        u.ID,
		Email:     u.Email,
		Name:      u.Name,
		AvatarURL: u.AvatarUrl,
		CreatedAt: u.CreatedAt,
	}
}

func spaceFromSQLC(s sqlc.Space) domain.Space {
	return domain.Space{
		ID:        s.ID,
		Name:      s.Name,
		Currency:  s.Currency,
		OwnerID:   s.OwnerID,
		CreatedAt: s.CreatedAt,
	}
}

func categoryFromSQLC(c sqlc.Category) domain.Category {
	return domain.Category{
		ID:        c.ID,
		SpaceID:   c.SpaceID,
		Name:      c.Name,
		Color:     c.Color,
		Icon:      c.Icon,
		CreatedAt: c.CreatedAt,
	}
}

func expenseFromSQLC(e sqlc.Expense) domain.Expense {
	return domain.Expense{
		ID:          e.ID,
		SpaceID:     e.SpaceID,
		PayerID:     e.PayerID,
		CategoryID:  fromNullUUID(e.CategoryID),
		AmountCents: e.AmountCents,
		Currency:    e.Currency,
		Description: e.Description,
		SpentAt:     e.SpentAt.Time,
		CreatedBy:   e.CreatedBy,
		CreatedAt:   e.CreatedAt,
		UpdatedAt:   e.UpdatedAt,
	}
}

func memberFromRow(m sqlc.ListSpaceMembersRow) domain.SpaceMember {
	return domain.SpaceMember{
		SpaceID:  m.SpaceID,
		UserID:   m.UserID,
		Role:     m.Role,
		JoinedAt: m.JoinedAt,
		User:     userFromSQLC(m.User),
	}
}

func memberFromSQLC(m sqlc.SpaceMember) domain.SpaceMember {
	return domain.SpaceMember{
		SpaceID:  m.SpaceID,
		UserID:   m.UserID,
		Role:     m.Role,
		JoinedAt: m.JoinedAt,
	}
}

func balanceFromRow(b sqlc.SpaceBalancesRow) domain.Balance {
	return domain.Balance{
		UserID:     b.UserID,
		PaidCents:  b.PaidCents,
		ShareCents: b.ShareCents,
		NetCents:   b.NetCents,
	}
}
