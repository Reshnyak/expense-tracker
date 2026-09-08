// Package dto holds request/response payloads for the HTTP API. Keep these in
// sync with api/openapi.yaml (the contract is the source of truth).
package dto

import "time"

type Error struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details map[string]any `json:"details,omitempty"`
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

type RefreshInput struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// DevLoginInput is the body for POST /api/v1/auth/dev-login (local env only).
type DevLoginInput struct {
	Email string `json:"email" binding:"required,email"`
	Name  string `json:"name" binding:"omitempty,max=120"`
}

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	AvatarURL *string   `json:"avatar_url"`
	CreatedAt time.Time `json:"created_at"`
}

type Space struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Currency  string    `json:"currency"`
	OwnerID   string    `json:"owner_id"`
	CreatedAt time.Time `json:"created_at"`
}

type SpaceInput struct {
	Name     string `json:"name" binding:"required,max=120"`
	Currency string `json:"currency" binding:"omitempty,len=3"`
}

type SpaceMember struct {
	SpaceID  string    `json:"space_id"`
	UserID   string    `json:"user_id"`
	Role     string    `json:"role"`
	JoinedAt time.Time `json:"joined_at"`
	User     User      `json:"user"`
}

type AddMemberInput struct {
	Email string `json:"email" binding:"required,email"`
	Role  string `json:"role" binding:"omitempty,oneof=owner member"`
}

type Category struct {
	ID        string    `json:"id"`
	SpaceID   string    `json:"space_id"`
	Name      string    `json:"name"`
	Color     *string   `json:"color"`
	Icon      *string   `json:"icon"`
	CreatedAt time.Time `json:"created_at"`
}

type CategoryInput struct {
	Name  string `json:"name" binding:"required,max=60"`
	Color string `json:"color" binding:"omitempty,hexcolor"`
	Icon  string `json:"icon" binding:"omitempty,max=32"`
}

type Expense struct {
	ID          string    `json:"id"`
	SpaceID     string    `json:"space_id"`
	PayerID     string    `json:"payer_id"`
	CategoryID  *string   `json:"category_id"`
	AmountCents int64     `json:"amount_cents"`
	Currency    string    `json:"currency"`
	Description *string   `json:"description"`
	SpentAt     string    `json:"spent_at"`
	CreatedBy   string    `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ExpenseInput struct {
	PayerID     string `json:"payer_id" binding:"required,uuid"`
	CategoryID  string `json:"category_id" binding:"omitempty,uuid"`
	AmountCents int64  `json:"amount_cents" binding:"required,gt=0"`
	Currency    string `json:"currency" binding:"omitempty,len=3"`
	Description string `json:"description" binding:"omitempty,max=500"`
	SpentAt     string `json:"spent_at" binding:"required,datetime=2006-01-02"`
}

type ExpenseList struct {
	Items      []Expense `json:"items"`
	NextCursor *string   `json:"next_cursor"`
}

type Balance struct {
	UserID     string `json:"user_id"`
	PaidCents  int64  `json:"paid_cents"`
	ShareCents int64  `json:"share_cents"`
	NetCents   int64  `json:"net_cents"`
}
