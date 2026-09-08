-- name: SpaceBalances :many
-- Equal-split balance per member: what they paid vs. an equal share of the
-- space's total spend. net_cents > 0 means the member is owed money.
SELECT
    sm.user_id,
    COALESCE(paid.total, 0)::bigint AS paid_cents,
    COALESCE(agg.total_cents / NULLIF(agg.member_count, 0), 0)::bigint AS share_cents,
    (
        COALESCE(paid.total, 0)
        - COALESCE(agg.total_cents / NULLIF(agg.member_count, 0), 0)
    )::bigint AS net_cents
FROM space_members sm
CROSS JOIN (
    SELECT
        COALESCE(SUM(e.amount_cents), 0)::bigint AS total_cents,
        (SELECT COUNT(*) FROM space_members m WHERE m.space_id = $1) AS member_count
    FROM expenses e
    WHERE e.space_id = $1 AND e.deleted_at IS NULL
) agg
LEFT JOIN (
    SELECT e.payer_id, SUM(e.amount_cents)::bigint AS total
    FROM expenses e
    WHERE e.space_id = $1 AND e.deleted_at IS NULL
    GROUP BY e.payer_id
) paid ON paid.payer_id = sm.user_id
WHERE sm.space_id = $1
ORDER BY net_cents DESC;
