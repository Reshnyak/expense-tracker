-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive email
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE users (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email       citext NOT NULL UNIQUE,
    name        text NOT NULL,
    avatar_url  text,
    google_sub  text UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE spaces (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    owner_id    uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    currency    char(3) NOT NULL DEFAULT 'USD',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE space_members (
    space_id    uuid NOT NULL REFERENCES spaces (id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role        text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (space_id, user_id)
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE INDEX space_members_user_id_idx ON space_members (user_id);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE categories (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id    uuid NOT NULL REFERENCES spaces (id) ON DELETE CASCADE,
    name        text NOT NULL,
    color       text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (space_id, name)
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE expenses (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id     uuid NOT NULL REFERENCES spaces (id) ON DELETE CASCADE,
    payer_id     uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    category_id  uuid REFERENCES categories (id) ON DELETE SET NULL,
    amount_cents bigint NOT NULL CHECK (amount_cents > 0),
    currency     char(3) NOT NULL DEFAULT 'USD',
    description  text,
    spent_at     date NOT NULL,
    created_by   uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    deleted_at   timestamptz
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE INDEX expenses_space_spent_at_idx
    ON expenses (space_id, spent_at DESC)
    WHERE deleted_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS space_members;
DROP TABLE IF EXISTS spaces;
DROP TABLE IF EXISTS users;
-- +goose StatementEnd
