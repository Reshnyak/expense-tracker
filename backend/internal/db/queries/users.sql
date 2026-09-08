-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByGoogleSub :one
SELECT * FROM users WHERE google_sub = $1;

-- name: UpsertUserFromGoogle :one
INSERT INTO users (email, name, avatar_url, google_sub)
VALUES ($1, $2, $3, $4)
ON CONFLICT (google_sub) DO UPDATE
SET name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now()
RETURNING *;
