-- name: CreateSpace :one
INSERT INTO spaces (name, owner_id, currency)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetSpace :one
SELECT * FROM spaces WHERE id = $1;

-- name: ListSpacesForUser :many
SELECT s.*
FROM spaces s
JOIN space_members m ON m.space_id = s.id
WHERE m.user_id = $1
ORDER BY s.created_at DESC;

-- name: AddSpaceMember :one
INSERT INTO space_members (space_id, user_id, role)
VALUES ($1, $2, $3)
ON CONFLICT (space_id, user_id) DO UPDATE SET role = EXCLUDED.role
RETURNING *;

-- name: ListSpaceMembers :many
SELECT
    m.space_id,
    m.user_id,
    m.role,
    m.joined_at,
    sqlc.embed(u)
FROM space_members m
JOIN users u ON u.id = m.user_id
WHERE m.space_id = $1
ORDER BY m.joined_at;

-- name: IsSpaceMember :one
SELECT EXISTS (
    SELECT 1 FROM space_members WHERE space_id = $1 AND user_id = $2
) AS is_member;
