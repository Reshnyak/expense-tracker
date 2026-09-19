-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByGoogleSub :one
SELECT * FROM users WHERE google_sub = $1;

-- name: UpsertUserByEmail :one
-- name/first_name/last_name only take effect on the initial insert: a
-- returning user may have since edited their own profile (PATCH /me), and a
-- repeat dev-login must not clobber that.
INSERT INTO users (email, name, first_name, last_name)
VALUES ($1, $2, $3, $4)
ON CONFLICT (email) DO UPDATE
SET updated_at = now()
RETURNING *;

-- name: UpsertUserFromGoogle :one
-- name/first_name/last_name only take effect on the initial insert, for the
-- same reason as UpsertUserByEmail above; avatar_url keeps syncing from
-- Google since it carries no user-edited state.
INSERT INTO users (email, name, first_name, last_name, avatar_url, google_sub)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (google_sub) DO UPDATE
SET avatar_url = EXCLUDED.avatar_url,
    updated_at = now()
RETURNING *;

-- name: CreateLocalUser :one
INSERT INTO users (email, name, first_name, last_name, password_hash)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetLocalCredentialsByEmail :one
SELECT * FROM users WHERE email = $1 AND password_hash IS NOT NULL;

-- name: UpdateUserProfile :one
UPDATE users
SET first_name = $2,
    last_name  = $3,
    phone      = $4,
    name       = $5,
    updated_at = now()
WHERE id = $1
RETURNING *;
