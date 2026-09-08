package service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
)

// fakeStore is an in-memory domain.Store for service unit tests. WithTx runs the
// callback against the same store (no isolation) — good enough for logic tests.
type fakeStore struct {
	users    map[uuid.UUID]domain.User
	spaces   map[uuid.UUID]domain.Space
	members  map[uuid.UUID][]domain.SpaceMember // spaceID -> members
	cats     map[uuid.UUID]domain.Category      // categoryID -> category
	expenses map[uuid.UUID]domain.Expense       // expenseID -> expense (soft-deleted removed)
	tokens   map[string]*domain.RefreshToken    // hash -> token
}

func newFakeStore() *fakeStore {
	return &fakeStore{
		users:    map[uuid.UUID]domain.User{},
		spaces:   map[uuid.UUID]domain.Space{},
		members:  map[uuid.UUID][]domain.SpaceMember{},
		cats:     map[uuid.UUID]domain.Category{},
		expenses: map[uuid.UUID]domain.Expense{},
		tokens:   map[string]*domain.RefreshToken{},
	}
}

func (f *fakeStore) Users() domain.UserRepository                 { return (*fakeUsers)(f) }
func (f *fakeStore) Spaces() domain.SpaceRepository               { return (*fakeSpaces)(f) }
func (f *fakeStore) Categories() domain.CategoryRepository        { return (*fakeCats)(f) }
func (f *fakeStore) Expenses() domain.ExpenseRepository           { return (*fakeExpenses)(f) }
func (f *fakeStore) RefreshTokens() domain.RefreshTokenRepository { return (*fakeTokens)(f) }

func (f *fakeStore) WithTx(ctx context.Context, fn func(domain.Store) error) error {
	return fn(f)
}

// --- users ---------------------------------------------------------------

type fakeUsers fakeStore

func (r *fakeUsers) GetByID(_ context.Context, id uuid.UUID) (domain.User, error) {
	u, ok := r.users[id]
	if !ok {
		return domain.User{}, domain.ErrNotFound
	}
	return u, nil
}

func (r *fakeUsers) GetByEmail(_ context.Context, email string) (domain.User, error) {
	for _, u := range r.users {
		if u.Email == email {
			return u, nil
		}
	}
	return domain.User{}, domain.ErrNotFound
}

func (r *fakeUsers) UpsertFromGoogle(_ context.Context, p domain.GoogleUpsert) (domain.User, error) {
	for _, u := range r.users {
		if u.Email == p.Email {
			u.Name = p.Name
			u.AvatarURL = p.AvatarURL
			r.users[u.ID] = u
			return u, nil
		}
	}
	u := domain.User{ID: uuid.New(), Email: p.Email, Name: p.Name, AvatarURL: p.AvatarURL, CreatedAt: time.Now()}
	r.users[u.ID] = u
	return u, nil
}

func (r *fakeUsers) UpsertByEmail(_ context.Context, email, name string) (domain.User, error) {
	for _, u := range r.users {
		if u.Email == email {
			u.Name = name
			r.users[u.ID] = u
			return u, nil
		}
	}
	u := domain.User{ID: uuid.New(), Email: email, Name: name, CreatedAt: time.Now()}
	r.users[u.ID] = u
	return u, nil
}

// --- spaces ------------------------------------------------------------------

type fakeSpaces fakeStore

func (r *fakeSpaces) ListForUser(_ context.Context, userID uuid.UUID) ([]domain.Space, error) {
	var out []domain.Space
	for spaceID, ms := range r.members {
		for _, m := range ms {
			if m.UserID == userID {
				out = append(out, r.spaces[spaceID])
			}
		}
	}
	return out, nil
}

func (r *fakeSpaces) Create(_ context.Context, name string, ownerID uuid.UUID, currency string) (domain.Space, error) {
	sp := domain.Space{ID: uuid.New(), Name: name, Currency: currency, OwnerID: ownerID, CreatedAt: time.Now()}
	r.spaces[sp.ID] = sp
	return sp, nil
}

func (r *fakeSpaces) Get(_ context.Context, id uuid.UUID) (domain.Space, error) {
	sp, ok := r.spaces[id]
	if !ok {
		return domain.Space{}, domain.ErrNotFound
	}
	return sp, nil
}

func (r *fakeSpaces) AddMember(_ context.Context, spaceID, userID uuid.UUID, role string) (domain.SpaceMember, error) {
	for i, m := range r.members[spaceID] {
		if m.UserID == userID {
			r.members[spaceID][i].Role = role
			return r.members[spaceID][i], nil
		}
	}
	m := domain.SpaceMember{SpaceID: spaceID, UserID: userID, Role: role, JoinedAt: time.Now(), User: r.users[userID]}
	r.members[spaceID] = append(r.members[spaceID], m)
	return m, nil
}

func (r *fakeSpaces) ListMembers(_ context.Context, spaceID uuid.UUID) ([]domain.SpaceMember, error) {
	out := make([]domain.SpaceMember, 0, len(r.members[spaceID]))
	for _, m := range r.members[spaceID] {
		m.User = r.users[m.UserID]
		out = append(out, m)
	}
	return out, nil
}

func (r *fakeSpaces) IsMember(_ context.Context, spaceID, userID uuid.UUID) (bool, error) {
	for _, m := range r.members[spaceID] {
		if m.UserID == userID {
			return true, nil
		}
	}
	return false, nil
}

// --- categories ------------------------------------------------------------

type fakeCats fakeStore

func (r *fakeCats) List(_ context.Context, spaceID uuid.UUID) ([]domain.Category, error) {
	var out []domain.Category
	for _, c := range r.cats {
		if c.SpaceID == spaceID {
			out = append(out, c)
		}
	}
	return out, nil
}

func (r *fakeCats) Create(_ context.Context, spaceID uuid.UUID, in domain.CategoryInput) (domain.Category, error) {
	for _, c := range r.cats {
		if c.SpaceID == spaceID && c.Name == in.Name {
			return domain.Category{}, domain.ErrConflict
		}
	}
	c := domain.Category{ID: uuid.New(), SpaceID: spaceID, Name: in.Name, Color: in.Color, Icon: in.Icon, CreatedAt: time.Now()}
	r.cats[c.ID] = c
	return c, nil
}

func (r *fakeCats) Get(_ context.Context, id, spaceID uuid.UUID) (domain.Category, error) {
	c, ok := r.cats[id]
	if !ok || c.SpaceID != spaceID {
		return domain.Category{}, domain.ErrNotFound
	}
	return c, nil
}

// --- expenses ------------------------------------------------------------------

type fakeExpenses fakeStore

func (r *fakeExpenses) List(_ context.Context, spaceID uuid.UUID, f domain.ExpenseFilter) ([]domain.Expense, error) {
	var out []domain.Expense
	for _, e := range r.expenses {
		if e.SpaceID != spaceID {
			continue
		}
		if e.SpentAt.Before(f.From) || e.SpentAt.After(f.To) {
			continue
		}
		out = append(out, e)
	}
	if int32(len(out)) > f.Limit {
		out = out[:f.Limit]
	}
	return out, nil
}

func (r *fakeExpenses) Create(_ context.Context, spaceID uuid.UUID, in domain.ExpenseInput, createdBy uuid.UUID) (domain.Expense, error) {
	now := time.Now()
	e := domain.Expense{
		ID: uuid.New(), SpaceID: spaceID, PayerID: in.PayerID, CategoryID: in.CategoryID,
		AmountCents: in.AmountCents, Currency: in.Currency, Description: in.Description,
		SpentAt: in.SpentAt, CreatedBy: createdBy, CreatedAt: now, UpdatedAt: now,
	}
	r.expenses[e.ID] = e
	return e, nil
}

func (r *fakeExpenses) Get(_ context.Context, id, spaceID uuid.UUID) (domain.Expense, error) {
	e, ok := r.expenses[id]
	if !ok || e.SpaceID != spaceID {
		return domain.Expense{}, domain.ErrNotFound
	}
	return e, nil
}

func (r *fakeExpenses) Update(_ context.Context, id, spaceID uuid.UUID, in domain.ExpenseInput) (domain.Expense, error) {
	e, ok := r.expenses[id]
	if !ok || e.SpaceID != spaceID {
		return domain.Expense{}, domain.ErrNotFound
	}
	e.PayerID = in.PayerID
	e.CategoryID = in.CategoryID
	e.AmountCents = in.AmountCents
	e.Currency = in.Currency
	e.Description = in.Description
	e.SpentAt = in.SpentAt
	e.UpdatedAt = time.Now()
	r.expenses[id] = e
	return e, nil
}

func (r *fakeExpenses) SoftDelete(_ context.Context, id, spaceID uuid.UUID) error {
	e, ok := r.expenses[id]
	if !ok || e.SpaceID != spaceID {
		return nil
	}
	delete(r.expenses, id)
	return nil
}

func (r *fakeExpenses) Balances(_ context.Context, spaceID uuid.UUID) ([]domain.Balance, error) {
	members := r.members[spaceID]
	var total int64
	paid := map[uuid.UUID]int64{}
	for _, e := range r.expenses {
		if e.SpaceID != spaceID {
			continue
		}
		total += e.AmountCents
		paid[e.PayerID] += e.AmountCents
	}
	var share int64
	if len(members) > 0 {
		share = total / int64(len(members))
	}
	out := make([]domain.Balance, 0, len(members))
	for _, m := range members {
		out = append(out, domain.Balance{
			UserID:     m.UserID,
			PaidCents:  paid[m.UserID],
			ShareCents: share,
			NetCents:   paid[m.UserID] - share,
		})
	}
	return out, nil
}

// --- refresh tokens ----------------------------------------------------------

type fakeTokens fakeStore

func (r *fakeTokens) Create(_ context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	r.tokens[tokenHash] = &domain.RefreshToken{UserID: userID, ExpiresAt: expiresAt}
	return nil
}

func (r *fakeTokens) Get(_ context.Context, tokenHash string) (domain.RefreshToken, error) {
	t, ok := r.tokens[tokenHash]
	if !ok {
		return domain.RefreshToken{}, domain.ErrNotFound
	}
	return *t, nil
}

func (r *fakeTokens) Revoke(_ context.Context, tokenHash string) error {
	if t, ok := r.tokens[tokenHash]; ok && t.RevokedAt == nil {
		now := time.Now()
		t.RevokedAt = &now
	}
	return nil
}

func (r *fakeTokens) RevokeAllForUser(_ context.Context, userID uuid.UUID) error {
	now := time.Now()
	for _, t := range r.tokens {
		if t.UserID == userID && t.RevokedAt == nil {
			t.RevokedAt = &now
		}
	}
	return nil
}

var _ domain.Store = (*fakeStore)(nil)
