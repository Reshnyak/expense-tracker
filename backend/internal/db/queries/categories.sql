-- name: CreateCategory :one
INSERT INTO categories (space_id, name, color, icon)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListCategories :many
SELECT * FROM categories
WHERE space_id = $1
ORDER BY name;

-- name: GetCategory :one
SELECT * FROM categories WHERE id = $1 AND space_id = $2;

-- name: UpdateCategory :one
UPDATE categories
SET name = $3, color = $4, icon = $5
WHERE id = $1 AND space_id = $2
RETURNING *;

-- name: DeleteCategory :exec
DELETE FROM categories WHERE id = $1 AND space_id = $2;
