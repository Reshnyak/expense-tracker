package domain

import "errors"

// Sentinel errors returned by the repository and service layers. The HTTP layer
// maps them to status codes (see httpapi/handlers.respondError). Wrap them with
// fmt.Errorf("...: %w", err) to add context; callers use errors.Is.
var (
	// ErrNotFound: the requested row does not exist (or is not visible to the caller).
	ErrNotFound = errors.New("not found")
	// ErrForbidden: the caller is authenticated but not allowed to touch this resource.
	ErrForbidden = errors.New("forbidden")
	// ErrConflict: the write violates a uniqueness / state constraint.
	ErrConflict = errors.New("conflict")
	// ErrValidation: the input is well-formed JSON but semantically invalid.
	ErrValidation = errors.New("validation failed")
	// ErrUnauthorized: credentials are missing, expired or revoked.
	ErrUnauthorized = errors.New("unauthorized")
)
