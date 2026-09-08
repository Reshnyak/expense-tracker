package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/reshnyakdg/expence-tracker/backend/internal/auth"
	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/dto"
)

const defaultPostLoginPath = "/spaces"

// GoogleLoginURL builds the Google consent URL, embedding a signed state that
// carries the (sanitised) post-login path and a CSRF nonce.
func (s *Service) GoogleLoginURL(redirectPath string) (string, error) {
	state, err := s.state.Issue(sanitizeRedirect(redirectPath))
	if err != nil {
		return "", err
	}
	return s.google.AuthCodeURL(state), nil
}

// CompleteGoogleLogin verifies the OAuth state, exchanges the code for a Google
// profile, upserts the user and returns a fresh token pair.
func (s *Service) CompleteGoogleLogin(ctx context.Context, code, state string) (dto.TokenPair, error) {
	if code == "" {
		return dto.TokenPair{}, fmt.Errorf("%w: missing code", domain.ErrUnauthorized)
	}
	if _, err := s.state.Verify(state); err != nil {
		return dto.TokenPair{}, fmt.Errorf("%w: invalid oauth state", domain.ErrUnauthorized)
	}
	profile, err := s.google.Exchange(ctx, code)
	if err != nil {
		s.log.Warn("google exchange failed", "err", err)
		return dto.TokenPair{}, fmt.Errorf("%w: google exchange failed", domain.ErrUnauthorized)
	}
	if profile.Sub == "" || profile.Email == "" {
		return dto.TokenPair{}, fmt.Errorf("%w: google profile incomplete", domain.ErrUnauthorized)
	}

	name := strings.TrimSpace(profile.Name)
	if name == "" {
		name = profile.Email
	}
	user, err := s.store.Users().UpsertFromGoogle(ctx, domain.GoogleUpsert{
		Email:     profile.Email,
		Name:      name,
		AvatarURL: emptyToNil(profile.Picture),
		GoogleSub: profile.Sub,
	})
	if err != nil {
		return dto.TokenPair{}, err
	}
	return s.issuePair(ctx, s.store, user.ID)
}

// DevLogin issues tokens for an email without Google. Only available when the
// server runs with app_env=local; otherwise it behaves as if the route does not
// exist.
func (s *Service) DevLogin(ctx context.Context, email, name string) (dto.TokenPair, error) {
	if !s.devAuth {
		return dto.TokenPair{}, domain.ErrNotFound
	}
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		return dto.TokenPair{}, fmt.Errorf("%w: email is required", domain.ErrValidation)
	}
	name = strings.TrimSpace(name)
	if name == "" {
		name = email
	}
	user, err := s.store.Users().UpsertByEmail(ctx, email, name)
	if err != nil {
		return dto.TokenPair{}, err
	}
	return s.issuePair(ctx, s.store, user.ID)
}

// Refresh rotates a refresh token: the presented token is revoked and a new pair
// is issued, all in one transaction.
func (s *Service) Refresh(ctx context.Context, raw string) (dto.TokenPair, error) {
	if raw == "" {
		return dto.TokenPair{}, fmt.Errorf("%w: missing refresh token", domain.ErrUnauthorized)
	}
	hash := auth.HashRefreshToken(raw)
	rt, err := s.store.RefreshTokens().Get(ctx, hash)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return dto.TokenPair{}, fmt.Errorf("%w: unknown refresh token", domain.ErrUnauthorized)
		}
		return dto.TokenPair{}, err
	}
	if !rt.Active(s.now()) {
		return dto.TokenPair{}, fmt.Errorf("%w: refresh token expired or revoked", domain.ErrUnauthorized)
	}

	var pair dto.TokenPair
	err = s.store.WithTx(ctx, func(st domain.Store) error {
		if err := st.RefreshTokens().Revoke(ctx, hash); err != nil {
			return err
		}
		p, err := s.issuePair(ctx, st, rt.UserID)
		if err != nil {
			return err
		}
		pair = p
		return nil
	})
	if err != nil {
		return dto.TokenPair{}, err
	}
	return pair, nil
}

// Logout revokes every active refresh token for the user (the client sends no
// token body, and signing out everywhere is the safer default). Idempotent.
func (s *Service) Logout(ctx context.Context, userID uuid.UUID) error {
	return s.store.RefreshTokens().RevokeAllForUser(ctx, userID)
}

// Me returns the authenticated user.
func (s *Service) Me(ctx context.Context, userID uuid.UUID) (dto.User, error) {
	u, err := s.store.Users().GetByID(ctx, userID)
	if err != nil {
		return dto.User{}, err
	}
	return userToDTO(u), nil
}

// sanitizeRedirect only allows same-site absolute paths to prevent the state
// token from being used as an open redirect.
func sanitizeRedirect(p string) string {
	if p == "" || !strings.HasPrefix(p, "/") || strings.HasPrefix(p, "//") {
		return defaultPostLoginPath
	}
	return p
}
