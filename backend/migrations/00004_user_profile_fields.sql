-- +goose Up
-- +goose StatementBegin
ALTER TABLE users
    ADD COLUMN first_name text,
    ADD COLUMN last_name  text,
    ADD COLUMN phone      text;
-- +goose StatementEnd

-- +goose StatementBegin
-- Seed first/last from the existing single `name` (everything before the first
-- space is the first name, the remainder is the last name).
UPDATE users SET
    first_name = NULLIF(split_part(name, ' ', 1), ''),
    last_name  = NULLIF(trim(substr(name, length(split_part(name, ' ', 1)) + 1)), '')
WHERE name <> '';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE users
    DROP COLUMN IF EXISTS first_name,
    DROP COLUMN IF EXISTS last_name,
    DROP COLUMN IF EXISTS phone;
-- +goose StatementEnd
