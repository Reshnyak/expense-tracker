package auth

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStateRoundTrip(t *testing.T) {
	codec := NewStateCodec("state-secret", 10*time.Minute)

	tok, err := codec.Issue("/spaces")
	require.NoError(t, err)
	require.NotEmpty(t, tok)

	rdr, err := codec.Verify(tok)
	require.NoError(t, err)
	assert.Equal(t, "/spaces", rdr)
}

func TestStateRejectsWrongSecret(t *testing.T) {
	a := NewStateCodec("secret-a", 10*time.Minute)
	b := NewStateCodec("secret-b", 10*time.Minute)

	tok, err := a.Issue("/spaces")
	require.NoError(t, err)

	_, err = b.Verify(tok)
	assert.ErrorIs(t, err, ErrInvalidToken)
}

func TestStateRejectsGarbage(t *testing.T) {
	codec := NewStateCodec("state-secret", 10*time.Minute)

	_, err := codec.Verify("not-a-jwt")
	assert.ErrorIs(t, err, ErrInvalidToken)
}

func TestStateRejectsExpired(t *testing.T) {
	codec := NewStateCodec("state-secret", -1*time.Second) // already expired

	tok, err := codec.Issue("/spaces")
	require.NoError(t, err)

	_, err = codec.Verify(tok)
	assert.ErrorIs(t, err, ErrInvalidToken)
}

func TestRefreshTokenHashIsStable(t *testing.T) {
	raw, hash, err := NewRefreshToken()
	require.NoError(t, err)
	assert.NotEqual(t, raw, hash)
	assert.Equal(t, hash, HashRefreshToken(raw))
	assert.Len(t, hash, 64) // sha256 hex
}
