package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
)

const refreshTokenBytes = 32

// NewRefreshToken returns a fresh opaque refresh token: raw is handed to the
// client, hash (SHA-256 hex) is what gets stored. The raw value is never
// persisted, so a database leak does not expose usable tokens.
func NewRefreshToken() (raw, hash string, err error) {
	b := make([]byte, refreshTokenBytes)
	if _, err = rand.Read(b); err != nil {
		return "", "", fmt.Errorf("generate refresh token: %w", err)
	}
	raw = base64.RawURLEncoding.EncodeToString(b)
	return raw, HashRefreshToken(raw), nil
}

// HashRefreshToken maps a raw refresh token to its stored representation.
func HashRefreshToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
