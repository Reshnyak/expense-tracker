-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByGoogleSub :one
SELECT * FROM users WHERE google_sub = $1;

-- name: UpsertUserByEmail :one
INSERT INTO users (email, name)
VALUES ($1, $2)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    updated_at = now()
RETURNING *;

-- name: UpsertUserFromGoogle :one
INSERT INTO users (email, name, avatar_url, google_sub)
VALUES ($1, $2, $3, $4)
ON CONFLICT (google_sub) DO UPDATE
SET name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now()
RETURNING *;

-- name: CreateLocalUser :one
INSERT INTO users (email, name, password_hash)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetLocalCredentialsByEmail :one
SELECT * FROM users WHERE email = $1 AND password_hash IS NOT NULL;
