package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAccessTokenRoundTrip(t *testing.T) {
	issuer := NewTokenIssuer("test-secret", time.Minute, time.Hour)
	userID := uuid.New()

	tok, err := issuer.IssueAccess(userID)
	require.NoError(t, err)
	require.NotEmpty(t, tok)

	got, err := issuer.ParseAccess(tok)
	require.NoError(t, err)
	assert.Equal(t, userID, got)
}

func TestParseAccessRejectsGarbage(t *testing.T) {
	issuer := NewTokenIssuer("test-secret", time.Minute, time.Hour)

	_, err := issuer.ParseAccess("not-a-jwt")
	assert.ErrorIs(t, err, ErrInvalidToken)
}

func TestParseAccessRejectsWrongSecret(t *testing.T) {
	a := NewTokenIssuer("secret-a", time.Minute, time.Hour)
	b := NewTokenIssuer("secret-b", time.Minute, time.Hour)

	tok, err := a.IssueAccess(uuid.New())
	require.NoError(t, err)

	_, err = b.ParseAccess(tok)
	assert.ErrorIs(t, err, ErrInvalidToken)
}
