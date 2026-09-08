-- name: CreateExpense :one
INSERT INTO expenses (
    space_id, payer_id, category_id, amount_cents, currency, description, spent_at, created_by
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetExpense :one
SELECT * FROM expenses
WHERE id = $1 AND space_id = $2 AND deleted_at IS NULL;

-- name: ListExpenses :many
SELECT * FROM expenses
WHERE space_id = $1
  AND deleted_at IS NULL
  AND spent_at >= sqlc.arg(from_date)
  AND spent_at <= sqlc.arg(to_date)
ORDER BY spent_at DESC, created_at DESC
LIMIT sqlc.arg(row_limit);

-- name: UpdateExpense :one
UPDATE expenses
SET payer_id = $3,
    category_id = $4,
    amount_cents = $5,
    currency = $6,
    description = $7,
    spent_at = $8,
    updated_at = now()
WHERE id = $1 AND space_id = $2 AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteExpense :exec
UPDATE expenses
SET deleted_at = now()
WHERE id = $1 AND space_id = $2 AND deleted_at IS NULL;
