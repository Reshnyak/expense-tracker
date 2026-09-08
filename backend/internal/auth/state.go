package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// StateCodec signs and verifies the OAuth `state` parameter. The token is a
// short-lived HS256 JWT that carries the post-login redirect target and a random
// nonce; verifying the signature + expiry defends against tampering and replay
// of stale state. (Binding it to a browser cookie is a further hardening step.)
type StateCodec struct {
	secret []byte
	ttl    time.Duration
}

func NewStateCodec(secret string, ttl time.Duration) *StateCodec {
	return &StateCodec{secret: []byte(secret), ttl: ttl}
}

type stateClaims struct {
	RedirectURI string `json:"rdr"`
	jwt.RegisteredClaims
}

// Issue returns a signed state token embedding redirectURI.
func (s *StateCodec) Issue(redirectURI string) (string, error) {
	nonce := make([]byte, 16)
	if _, err := rand.Read(nonce); err != nil {
		return "", fmt.Errorf("state nonce: %w", err)
	}
	now := time.Now()
	claims := stateClaims{
		RedirectURI: redirectURI,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        base64.RawURLEncoding.EncodeToString(nonce),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.ttl)),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString(s.secret)
	if err != nil {
		return "", fmt.Errorf("sign state: %w", err)
	}
	return signed, nil
}

// Verify checks the signature and expiry and returns the embedded redirect URI.
// A failure wraps ErrInvalidToken.
func (s *StateCodec) Verify(tokenStr string) (string, error) {
	var claims stateClaims
	_, err := jwt.ParseWithClaims(tokenStr, &claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return s.secret, nil
	})
	if err != nil {
		return "", errors.Join(ErrInvalidToken, err)
	}
	return claims.RedirectURI, nil
}
