package domain

import (
	"time"

	"github.com/google/uuid"
)

// Member roles.
const (
	RoleOwner  = "owner"
	RoleMember = "member"
)

// User is a person who signed in (via Google or, in local dev, dev-login).
type User struct {
	ID        uuid.UUID
	Email     string
	Name      string
	AvatarURL *string
	CreatedAt time.Time
}

// Space is a shared expense journal.
type Space struct {
	ID        uuid.UUID
	Name      string
	Currency  string
	OwnerID   uuid.UUID
	CreatedAt time.Time
}

// SpaceMember is a user's membership in a space, with the user embedded.
type SpaceMember struct {
	SpaceID  uuid.UUID
	UserID   uuid.UUID
	Role     string
	JoinedAt time.Time
	User     User
}

// Category is a per-space expense label.
type Category struct {
	ID        uuid.UUID
	SpaceID   uuid.UUID
	Name      string
	Color     *string
	Icon      *string
	CreatedAt time.Time
}

// Expense is a single recorded spend. Amounts are in minor units (cents).
type Expense struct {
	ID          uuid.UUID
	SpaceID     uuid.UUID
	PayerID     uuid.UUID
	CategoryID  *uuid.UUID
	AmountCents int64
	Currency    string
	Description *string
	SpentAt     time.Time
	CreatedBy   uuid.UUID
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// Balance is an equal-split settlement figure for one member of a space.
// NetCents > 0 means the member is owed money.
type Balance struct {
	UserID     uuid.UUID
	PaidCents  int64
	ShareCents int64
	NetCents   int64
}

// RefreshToken is the stored side of an opaque refresh token (the raw value is
// never persisted — only its hash).
type RefreshToken struct {
	UserID    uuid.UUID
	ExpiresAt time.Time
	RevokedAt *time.Time
}

// Active reports whether the token can still be exchanged at time now.
func (t RefreshToken) Active(now time.Time) bool {
	return t.RevokedAt == nil && now.Before(t.ExpiresAt)
}

// --- input / value objects -------------------------------------------------

// GoogleUpsert carries the fields taken from a Google profile.
type GoogleUpsert struct {
	Email     string
	Name      string
	AvatarURL *string
	GoogleSub string
}

// SpaceInput is the payload for creating a space (currency already defaulted).
type SpaceInput struct {
	Name     string
	Currency string
}

// CategoryInput is the payload for creating a category.
type CategoryInput struct {
	Name  string
	Color *string
	Icon  *string
}

// ExpenseInput is the payload for creating or updating an expense (currency
// already defaulted to the space currency by the service when omitted).
type ExpenseInput struct {
	PayerID     uuid.UUID
	CategoryID  *uuid.UUID
	AmountCents int64
	Currency    string
	Description *string
	SpentAt     time.Time
}

// ExpenseFilter bounds a ListExpenses query. From/To are inclusive; Limit is
// already clamped to [1, 200] by the service.
type ExpenseFilter struct {
	From  time.Time
	To    time.Time
	Limit int32
}
