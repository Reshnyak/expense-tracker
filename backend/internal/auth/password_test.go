package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHashPasswordRoundTrip(t *testing.T) {
	hash, err := HashPassword("correct horse battery staple")
	require.NoError(t, err)
	assert.NotEqual(t, "correct horse battery staple", hash)
	assert.True(t, CheckPassword(hash, "correct horse battery staple"))
}

func TestCheckPasswordRejectsWrongPassword(t *testing.T) {
	hash, err := HashPassword("s3cret-password")
	require.NoError(t, err)
	assert.False(t, CheckPassword(hash, "s3cret-Password"))
	assert.False(t, CheckPassword(hash, ""))
	assert.False(t, CheckPassword("not-a-hash", "s3cret-password"))
}

func TestHashPasswordIsSalted(t *testing.T) {
	a, err := HashPassword("same-input")
	require.NoError(t, err)
	b, err := HashPassword("same-input")
	require.NoError(t, err)
	assert.NotEqual(t, a, b)
}
