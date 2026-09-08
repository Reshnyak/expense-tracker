// Package auth issues and verifies JWT access tokens and drives the Google
// OAuth login flow. Business rules (user upsert, refresh-token storage) belong
// in internal/service.
package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var ErrInvalidToken = errors.New("invalid token")

// TokenIssuer signs and parses access tokens.
type TokenIssuer struct {
	secret     []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func NewTokenIssuer(secret string, accessTTL, refreshTTL time.Duration) *TokenIssuer {
	return &TokenIssuer{secret: []byte(secret), accessTTL: accessTTL, refreshTTL: refreshTTL}
}

type Claims struct {
	jwt.RegisteredClaims
}

func (ti *TokenIssuer) AccessTTL() time.Duration  { return ti.accessTTL }
func (ti *TokenIssuer) RefreshTTL() time.Duration { return ti.refreshTTL }

// IssueAccess returns a signed access token for the given user.
func (ti *TokenIssuer) IssueAccess(userID uuid.UUID) (string, error) {
	now := time.Now()
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ti.accessTTL)),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString(ti.secret)
	if err != nil {
		return "", fmt.Errorf("sign access token: %w", err)
	}
	return signed, nil
}

// ParseAccess validates a token string and returns the user id from its subject.
func (ti *TokenIssuer) ParseAccess(tokenStr string) (uuid.UUID, error) {
	var claims Claims
	_, err := jwt.ParseWithClaims(tokenStr, &claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return ti.secret, nil
	})
	if err != nil {
		return uuid.Nil, errors.Join(ErrInvalidToken, err)
	}
	uid, err := uuid.Parse(claims.Subject)
	if err != nil {
		return uuid.Nil, ErrInvalidToken
	}
	return uid, nil
}
