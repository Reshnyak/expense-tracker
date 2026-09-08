// Package service holds the business logic: authorization rules, input
// normalisation and orchestration of domain.Store calls. It speaks domain types
// inward and dto types outward (dto has no framework deps). Handlers call into
// it; it never imports gin or sqlc.
package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/reshnyakdg/expence-tracker/backend/internal/auth"
	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/dto"
)

// Service is the single entry point for handlers.
type Service struct {
	store   domain.Store
	issuer  *auth.TokenIssuer
	google  *auth.GoogleAuthenticator
	state   *auth.StateCodec
	devAuth bool
	log     *slog.Logger
	now     func() time.Time
}

// Deps are the constructor arguments for New.
type Deps struct {
	Store   domain.Store
	Issuer  *auth.TokenIssuer
	Google  *auth.GoogleAuthenticator
	State   *auth.StateCodec
	DevAuth bool
	Log     *slog.Logger
}

func New(d Deps) *Service {
	log := d.Log
	if log == nil {
		log = slog.Default()
	}
	return &Service{
		store:   d.Store,
		issuer:  d.Issuer,
		google:  d.Google,
		state:   d.State,
		devAuth: d.DevAuth,
		log:     log,
		now:     time.Now,
	}
}

// issuePair mints an access token and a fresh stored refresh token for userID.
// The store is passed explicitly so callers can run it inside a transaction.
func (s *Service) issuePair(ctx context.Context, st domain.Store, userID uuid.UUID) (dto.TokenPair, error) {
	access, err := s.issuer.IssueAccess(userID)
	if err != nil {
		return dto.TokenPair{}, err
	}
	raw, hash, err := auth.NewRefreshToken()
	if err != nil {
		return dto.TokenPair{}, err
	}
	if err := st.RefreshTokens().Create(ctx, userID, hash, s.now().Add(s.issuer.RefreshTTL())); err != nil {
		return dto.TokenPair{}, err
	}
	return dto.TokenPair{
		AccessToken:  access,
		RefreshToken: raw,
		ExpiresIn:    int(s.issuer.AccessTTL().Seconds()),
	}, nil
}

// assertMember returns domain.ErrNotFound when userID is not a member of
// spaceID: non-members must not be able to tell the space apart from a
// non-existent one.
func (s *Service) assertMember(ctx context.Context, spaceID, userID uuid.UUID) error {
	ok, err := s.store.Spaces().IsMember(ctx, spaceID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return domain.ErrNotFound
	}
	return nil
}

// memberRole returns the caller's role in the space, or ("", false) if absent.
func (s *Service) memberRole(ctx context.Context, spaceID, userID uuid.UUID) (string, bool, error) {
	members, err := s.store.Spaces().ListMembers(ctx, spaceID)
	if err != nil {
		return "", false, err
	}
	for _, m := range members {
		if m.UserID == userID {
			return m.Role, true, nil
		}
	}
	return "", false, nil
}
