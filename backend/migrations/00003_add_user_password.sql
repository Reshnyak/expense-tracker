-- +goose Up
-- +goose StatementBegin
ALTER TABLE users ADD COLUMN password_hash text;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
-- +goose StatementEnd
