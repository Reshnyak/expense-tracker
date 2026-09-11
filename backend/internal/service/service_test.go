package service

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/reshnyakdg/expence-tracker/backend/internal/auth"
	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/dto"
)

func newTestService(t *testing.T, devAuth bool) (*Service, *fakeStore) {
	t.Helper()
	fs := newFakeStore()
	svc := New(Deps{
		Store:   fs,
		Issuer:  auth.NewTokenIssuer("test-secret", 15*time.Minute, 720*time.Hour),
		State:   auth.NewStateCodec("test-secret", 10*time.Minute),
		DevAuth: devAuth,
		Log:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	})
	return svc, fs
}

// seedUser inserts a user directly into the fake store.
func seedUser(fs *fakeStore, email string) domain.User {
	u := domain.User{ID: uuid.New(), Email: email, Name: email, CreatedAt: time.Now()}
	fs.users[u.ID] = u
	return u
}

func TestCreateSpace_AddsOwnerMembership(t *testing.T) {
	ctx := context.Background()
	svc, fs := newTestService(t, false)
	owner := seedUser(fs, "owner@example.com")

	space, err := svc.CreateSpace(ctx, owner.ID, dto.SpaceInput{Name: "Trip", Currency: "eur"})
	require.NoError(t, err)
	assert.Equal(t, "EUR", space.Currency)
	assert.Equal(t, owner.ID.String(), space.OwnerID)

	members, err := svc.ListMembers(ctx, owner.ID, uuid.MustParse(space.ID))
	require.NoError(t, err)
	require.Len(t, members, 1)
	assert.Equal(t, domain.RoleOwner, members[0].Role)
}

func TestGetSpace_NonMemberIsNotFound(t *testing.T) {
	ctx := context.Background()
	svc, fs := newTestService(t, false)
	owner := seedUser(fs, "owner@example.com")
	outsider := seedUser(fs, "outsider@example.com")

	space, err := svc.CreateSpace(ctx, owner.ID, dto.SpaceInput{Name: "Trip"})
	require.NoError(t, err)

	_, err = svc.GetSpace(ctx, outsider.ID, uuid.MustParse(space.ID))
	assert.ErrorIs(t, err, domain.ErrNotFound)
}

func TestAddMember_RoleRules(t *testing.T) {
	ctx := context.Background()
	svc, fs := newTestService(t, false)
	owner := seedUser(fs, "owner@example.com")
	member := seedUser(fs, "member@example.com")
	newcomer := seedUser(fs, "newcomer@example.com")

	space, err := svc.CreateSpace(ctx, owner.ID, dto.SpaceInput{Name: "Trip"})
	require.NoError(t, err)
	spaceID := uuid.MustParse(space.ID)

	// owner adds a plain member
	_, err = svc.AddMember(ctx, owner.ID, spaceID, dto.AddMemberInput{Email: "member@example.com"})
	require.NoError(t, err)

	// non-owner member may not grant the owner role
	_, err = svc.AddMember(ctx, member.ID, spaceID, dto.AddMemberInput{Email: "newcomer@example.com", Role: "owner"})
	assert.ErrorIs(t, err, domain.ErrForbidden)

	// unknown email -> validation error
	_, err = svc.AddMember(ctx, owner.ID, spaceID, dto.AddMemberInput{Email: "ghost@example.com"})
	assert.ErrorIs(t, err, domain.ErrValidation)

	// owner may grant owner
	m, err := svc.AddMember(ctx, owner.ID, spaceID, dto.AddMemberInput{Email: "newcomer@example.com", Role: "owner"})
	require.NoError(t, err)
	assert.Equal(t, domain.RoleOwner, m.Role)
	assert.Equal(t, newcomer.ID.String(), m.UserID)
}

func TestCreateExpense_PayerMustBeMember_AndCurrencyDefaults(t *testing.T) {
	ctx := context.Background()
	svc, fs := newTestService(t, false)
	owner := seedUser(fs, "owner@example.com")
	stranger := seedUser(fs, "stranger@example.com")

	space, err := svc.CreateSpace(ctx, owner.ID, dto.SpaceInput{Name: "Trip", Currency: "GBP"})
	require.NoError(t, err)
	spaceID := uuid.MustParse(space.ID)

	// payer not in the space
	_, err = svc.CreateExpense(ctx, owner.ID, spaceID, dto.ExpenseInput{
		PayerID: stranger.ID.String(), AmountCents: 1000, SpentAt: "2026-01-02",
	})
	assert.ErrorIs(t, err, domain.ErrValidation)

	// happy path: currency omitted -> inherits the space currency
	exp, err := svc.CreateExpense(ctx, owner.ID, spaceID, dto.ExpenseInput{
		PayerID: owner.ID.String(), AmountCents: 1000, SpentAt: "2026-01-02",
	})
	require.NoError(t, err)
	assert.Equal(t, "GBP", exp.Currency)
	assert.Equal(t, "2026-01-02", exp.SpentAt)
}

func TestListExpenses_RejectsBadDate(t *testing.T) {
	ctx := context.Background()
	svc, fs := newTestService(t, false)
	owner := seedUser(fs, "owner@example.com")
	space, err := svc.CreateSpace(ctx, owner.ID, dto.SpaceInput{Name: "Trip"})
	require.NoError(t, err)

	_, err = svc.ListExpenses(ctx, owner.ID, uuid.MustParse(space.ID), ExpenseListQuery{From: "not-a-date"})
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestBalances_EqualSplitSumsToZero(t *testing.T) {
	ctx := context.Background()
	svc, fs := newTestService(t, false)
	a := seedUser(fs, "a@example.com")
	b := seedUser(fs, "b@example.com")

	space, err := svc.CreateSpace(ctx, a.ID, dto.SpaceInput{Name: "Trip", Currency: "USD"})
	require.NoError(t, err)
	spaceID := uuid.MustParse(space.ID)
	_, err = svc.AddMember(ctx, a.ID, spaceID, dto.AddMemberInput{Email: "b@example.com"})
	require.NoError(t, err)

	// a pays 3000, b pays 1000 -> total 4000, share 2000 each
	_, err = svc.CreateExpense(ctx, a.ID, spaceID, dto.ExpenseInput{PayerID: a.ID.String(), AmountCents: 3000, SpentAt: "2026-01-02"})
	require.NoError(t, err)
	_, err = svc.CreateExpense(ctx, b.ID, spaceID, dto.ExpenseInput{PayerID: b.ID.String(), AmountCents: 1000, SpentAt: "2026-01-03"})
	require.NoError(t, err)

	balances, err := svc.Balances(ctx, a.ID, spaceID)
	require.NoError(t, err)
	require.Len(t, balances, 2)

	var sum int64
	byUser := map[string]dto.Balance{}
	for _, bal := range balances {
		sum += bal.NetCents
		byUser[bal.UserID] = bal
	}
	assert.Zero(t, sum)
	assert.Equal(t, int64(1000), byUser[a.ID.String()].NetCents)  // paid 3000 - share 2000
	assert.Equal(t, int64(-1000), byUser[b.ID.String()].NetCents) // paid 1000 - share 2000
}

func TestDevLogin_DisabledOutsideLocal(t *testing.T) {
	ctx := context.Background()
	svc, _ := newTestService(t, false)

	_, err := svc.DevLogin(ctx, "x@example.com", "")
	assert.ErrorIs(t, err, domain.ErrNotFound)
}

func TestRefresh_RotatesAndInvalidatesOldToken(t *testing.T) {
	ctx := context.Background()
	svc, _ := newTestService(t, true)

	pair, err := svc.DevLogin(ctx, "dev@example.com", "Dev")
	require.NoError(t, err)

	rotated, err := svc.Refresh(ctx, pair.RefreshToken)
	require.NoError(t, err)
	assert.NotEqual(t, pair.RefreshToken, rotated.RefreshToken)
	assert.NotEmpty(t, rotated.AccessToken)

	// the original refresh token is now revoked
	_, err = svc.Refresh(ctx, pair.RefreshToken)
	assert.ErrorIs(t, err, domain.ErrUnauthorized)

	// the rotated one still works
	_, err = svc.Refresh(ctx, rotated.RefreshToken)
	require.NoError(t, err)
}

func TestDevLogin_SplitsNameAndPreservesEditsOnRelogin(t *testing.T) {
	ctx := context.Background()
	svc, fs := newTestService(t, true)

	_, err := svc.DevLogin(ctx, "dev2@example.com", "Anna Karenina")
	require.NoError(t, err)

	u, err := fs.Users().GetByEmail(ctx, "dev2@example.com")
	require.NoError(t, err)
	require.NotNil(t, u.FirstName)
	assert.Equal(t, "Anna", *u.FirstName)
	require.NotNil(t, u.LastName)
	assert.Equal(t, "Karenina", *u.LastName)

	// A returning user who has since edited their own profile keeps that
	// edit across a repeat dev-login, even if a different name is passed.
	_, err = svc.UpdateMe(ctx, u.ID, dto.UpdateMeInput{FirstName: "Custom", LastName: "Name"})
	require.NoError(t, err)

	_, err = svc.DevLogin(ctx, "dev2@example.com", "Someone Else")
	require.NoError(t, err)

	after, err := fs.Users().GetByEmail(ctx, "dev2@example.com")
	require.NoError(t, err)
	assert.Equal(t, "Custom Name", after.Name)
}

func TestRegister_IssuesTokensAndLoginWorks(t *testing.T) {
	ctx := context.Background()
	svc, _ := newTestService(t, false)

	pair, err := svc.Register(ctx, "Alice@Example.com", "s3cret-password", "Alice")
	require.NoError(t, err)
	assert.NotEmpty(t, pair.AccessToken)
	assert.NotEmpty(t, pair.RefreshToken)

	// email is normalised, so login with a differently-cased address still works
	loginPair, err := svc.Login(ctx, "alice@example.com", "s3cret-password")
	require.NoError(t, err)
	assert.NotEmpty(t, loginPair.AccessToken)
}

func TestRegister_SplitsNameIntoFirstLast(t *testing.T) {
	ctx := context.Background()
	svc, fs := newTestService(t, false)

	_, err := svc.Register(ctx, "split@example.com", "s3cret-password", "Ivan Petrov")
	require.NoError(t, err)

	u, err := fs.Users().GetByEmail(ctx, "split@example.com")
	require.NoError(t, err)
	require.NotNil(t, u.FirstName)
	assert.Equal(t, "Ivan", *u.FirstName)
	require.NotNil(t, u.LastName)
	assert.Equal(t, "Petrov", *u.LastName)
}

func TestRegister_DuplicateEmailConflicts(t *testing.T) {
	ctx := context.Background()
	svc, _ := newTestService(t, false)

	_, err := svc.Register(ctx, "dup@example.com", "s3cret-password", "")
	require.NoError(t, err)

	_, err = svc.Register(ctx, "dup@example.com", "another-password", "")
	assert.ErrorIs(t, err, domain.ErrConflict)
}

func TestRegister_RejectsShortPassword(t *testing.T) {
	ctx := context.Background()
	svc, _ := newTestService(t, false)

	_, err := svc.Register(ctx, "weak@example.com", "short", "")
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestLogin_WrongPasswordIsUnauthorized(t *testing.T) {
	ctx := context.Background()
	svc, _ := newTestService(t, false)

	_, err := svc.Register(ctx, "bob@example.com", "correct-password", "")
	require.NoError(t, err)

	_, err = svc.Login(ctx, "bob@example.com", "wrong-password")
	assert.ErrorIs(t, err, domain.ErrUnauthorized)
}

func TestLogin_UnknownEmailIsUnauthorized(t *testing.T) {
	ctx := context.Background()
	svc, _ := newTestService(t, false)

	_, err := svc.Login(ctx, "nobody@example.com", "any-password")
	assert.ErrorIs(t, err, domain.ErrUnauthorized)
}

func TestLogin_GoogleOnlyAccountIsUnauthorized(t *testing.T) {
	ctx := context.Background()
	svc, fs := newTestService(t, false)
	// a user with no password (created via Google / dev-login)
	seedUser(fs, "google@example.com")

	_, err := svc.Login(ctx, "google@example.com", "guessed-password")
	assert.ErrorIs(t, err, domain.ErrUnauthorized)
}

func TestCreateCategory_DuplicateNameConflicts(t *testing.T) {
	ctx := context.Background()
	svc, fs := newTestService(t, false)
	owner := seedUser(fs, "owner@example.com")
	space, err := svc.CreateSpace(ctx, owner.ID, dto.SpaceInput{Name: "Trip"})
	require.NoError(t, err)
	spaceID := uuid.MustParse(space.ID)

	_, err = svc.CreateCategory(ctx, owner.ID, spaceID, dto.CategoryInput{Name: "Food"})
	require.NoError(t, err)
	_, err = svc.CreateCategory(ctx, owner.ID, spaceID, dto.CategoryInput{Name: "Food"})
	assert.ErrorIs(t, err, domain.ErrConflict)
}

func TestUpdateCategory_RenamesAndRejectsNonMember(t *testing.T) {
	ctx := context.Background()
	svc, fs := newTestService(t, false)
	owner := seedUser(fs, "owner@example.com")
	outsider := seedUser(fs, "outsider@example.com")
	space, err := svc.CreateSpace(ctx, owner.ID, dto.SpaceInput{Name: "Trip"})
	require.NoError(t, err)
	spaceID := uuid.MustParse(space.ID)

	cat, err := svc.CreateCategory(ctx, owner.ID, spaceID, dto.CategoryInput{Name: "Food"})
	require.NoError(t, err)
	catID := uuid.MustParse(cat.ID)

	updated, err := svc.UpdateCategory(ctx, owner.ID, spaceID, catID, dto.CategoryInput{Name: "Groceries", Color: "#00ff00"})
	require.NoError(t, err)
	assert.Equal(t, "Groceries", updated.Name)
	require.NotNil(t, updated.Color)
	assert.Equal(t, "#00ff00", *updated.Color)

	_, err = svc.UpdateCategory(ctx, outsider.ID, spaceID, catID, dto.CategoryInput{Name: "Nope"})
	assert.ErrorIs(t, err, domain.ErrNotFound)
}

func TestUpdateCategory_DuplicateNameConflicts(t *testing.T) {
	ctx := context.Background()
	svc, fs := newTestService(t, false)
	owner := seedUser(fs, "owner@example.com")
	space, err := svc.CreateSpace(ctx, owner.ID, dto.SpaceInput{Name: "Trip"})
	require.NoError(t, err)
	spaceID := uuid.MustParse(space.ID)

	_, err = svc.CreateCategory(ctx, owner.ID, spaceID, dto.CategoryInput{Name: "Food"})
	require.NoError(t, err)
	travel, err := svc.CreateCategory(ctx, owner.ID, spaceID, dto.CategoryInput{Name: "Travel"})
	require.NoError(t, err)

	_, err = svc.UpdateCategory(ctx, owner.ID, spaceID, uuid.MustParse(travel.ID), dto.CategoryInput{Name: "Food"})
	assert.ErrorIs(t, err, domain.ErrConflict)
}

func TestUpdateMe_SetsPartsAndRecomputesName(t *testing.T) {
	ctx := context.Background()
	svc, fs := newTestService(t, false)
	u := seedUser(fs, "u@example.com")
	fs.users[u.ID] = domain.User{ID: u.ID, Email: u.Email, Name: "Old Name", CreatedAt: u.CreatedAt}

	got, err := svc.UpdateMe(ctx, u.ID, dto.UpdateMeInput{
		FirstName: "  Анна ", LastName: "Каренина", Phone: " +7 900 111 22 33 ",
	})
	require.NoError(t, err)
	assert.Equal(t, "Анна Каренина", got.Name)
	require.NotNil(t, got.FirstName)
	assert.Equal(t, "Анна", *got.FirstName)
	require.NotNil(t, got.Phone)
	assert.Equal(t, "+7 900 111 22 33", *got.Phone)
	assert.Equal(t, "u@example.com", got.Email)
}

func TestUpdateMe_EmptyPartsKeepPreviousName(t *testing.T) {
	ctx := context.Background()
	svc, fs := newTestService(t, false)
	u := seedUser(fs, "u@example.com")
	fs.users[u.ID] = domain.User{ID: u.ID, Email: u.Email, Name: "Keep Me", CreatedAt: u.CreatedAt}

	got, err := svc.UpdateMe(ctx, u.ID, dto.UpdateMeInput{Phone: "12345"})
	require.NoError(t, err)
	assert.Equal(t, "Keep Me", got.Name)
	assert.Nil(t, got.FirstName)
	assert.Nil(t, got.LastName)
}

func TestDeleteCategory_RemovesAndIsIdempotentlyNotFound(t *testing.T) {
	ctx := context.Background()
	svc, fs := newTestService(t, false)
	owner := seedUser(fs, "owner@example.com")
	space, err := svc.CreateSpace(ctx, owner.ID, dto.SpaceInput{Name: "Trip"})
	require.NoError(t, err)
	spaceID := uuid.MustParse(space.ID)

	cat, err := svc.CreateCategory(ctx, owner.ID, spaceID, dto.CategoryInput{Name: "Food"})
	require.NoError(t, err)
	catID := uuid.MustParse(cat.ID)

	require.NoError(t, svc.DeleteCategory(ctx, owner.ID, spaceID, catID))

	cats, err := svc.ListCategories(ctx, owner.ID, spaceID)
	require.NoError(t, err)
	assert.Empty(t, cats)

	assert.ErrorIs(t, svc.DeleteCategory(ctx, owner.ID, spaceID, catID), domain.ErrNotFound)
}
