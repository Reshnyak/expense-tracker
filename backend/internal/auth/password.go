package auth

import (
	"fmt"
	"sync"

	"golang.org/x/crypto/bcrypt"
)

// MaxPasswordBytes is bcrypt's hard input limit. Callers must reject longer
// passwords before hashing (bcrypt would silently truncate otherwise).
const MaxPasswordBytes = 72

// HashPassword returns a bcrypt hash of plain at the default cost. plain must be
// at most MaxPasswordBytes bytes.
func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(b), nil
}

// CheckPassword reports whether plain matches the stored bcrypt hash.
func CheckPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

// dummyHash is a real bcrypt hash of a throwaway value, computed once.
var dummyHash = sync.OnceValue(func() string {
	h, err := bcrypt.GenerateFromPassword([]byte("timing-equaliser"), bcrypt.DefaultCost)
	if err != nil {
		panic("auth: cannot precompute dummy bcrypt hash: " + err.Error())
	}
	return string(h)
})

// CheckDummyPassword performs a bcrypt comparison against a throwaway hash and
// discards the result. Call it on the "user not found" branch of a login so an
// attacker cannot distinguish existing from non-existing accounts by timing.
func CheckDummyPassword(plain string) {
	_ = bcrypt.CompareHashAndPassword([]byte(dummyHash()), []byte(plain))
}
