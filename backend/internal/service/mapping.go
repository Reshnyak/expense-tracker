package service

import (
	"strings"

	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/dto"
)

const dateLayout = "2006-01-02"

func mapSlice[T, R any](in []T, f func(T) R) []R {
	out := make([]R, len(in))
	for i, v := range in {
		out[i] = f(v)
	}
	return out
}

// emptyToNil trims s and returns nil when the result is empty, else a pointer to
// the trimmed value.
func emptyToNil(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

func userToDTO(u domain.User) dto.User {
	return dto.User{
		ID:        u.ID.String(),
		Email:     u.Email,
		Name:      u.Name,
		AvatarURL: u.AvatarURL,
		CreatedAt: u.CreatedAt,
	}
}

func spaceToDTO(s domain.Space) dto.Space {
	return dto.Space{
		ID:        s.ID.String(),
		Name:      s.Name,
		Currency:  s.Currency,
		OwnerID:   s.OwnerID.String(),
		CreatedAt: s.CreatedAt,
	}
}

func memberToDTO(m domain.SpaceMember) dto.SpaceMember {
	return dto.SpaceMember{
		SpaceID:  m.SpaceID.String(),
		UserID:   m.UserID.String(),
		Role:     m.Role,
		JoinedAt: m.JoinedAt,
		User:     userToDTO(m.User),
	}
}

func categoryToDTO(c domain.Category) dto.Category {
	return dto.Category{
		ID:        c.ID.String(),
		SpaceID:   c.SpaceID.String(),
		Name:      c.Name,
		Color:     c.Color,
		Icon:      c.Icon,
		CreatedAt: c.CreatedAt,
	}
}

func expenseToDTO(e domain.Expense) dto.Expense {
	var cat *string
	if e.CategoryID != nil {
		v := e.CategoryID.String()
		cat = &v
	}
	return dto.Expense{
		ID:          e.ID.String(),
		SpaceID:     e.SpaceID.String(),
		PayerID:     e.PayerID.String(),
		CategoryID:  cat,
		AmountCents: e.AmountCents,
		Currency:    e.Currency,
		Description: e.Description,
		SpentAt:     e.SpentAt.Format(dateLayout),
		CreatedBy:   e.CreatedBy.String(),
		CreatedAt:   e.CreatedAt,
		UpdatedAt:   e.UpdatedAt,
	}
}

func balanceToDTO(b domain.Balance) dto.Balance {
	return dto.Balance{
		UserID:     b.UserID.String(),
		PaidCents:  b.PaidCents,
		ShareCents: b.ShareCents,
		NetCents:   b.NetCents,
	}
}
