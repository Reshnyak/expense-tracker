// Command migrate runs goose migrations without needing the goose CLI on PATH.
//
//	go run ./cmd/migrate -command up
//	go run ./cmd/migrate -command down
//	go run ./cmd/migrate -command status
//	go run ./cmd/migrate -command create add_something sql
//
// DATABASE_URL is read from the environment (or pass -dsn). The "create" command
// does not need a database connection.
package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "migrate:", err)
		os.Exit(1)
	}
}

func run() error {
	var (
		command = flag.String("command", "up", "goose command: up|down|status|redo|version|create")
		dir     = flag.String("dir", "migrations", "migrations directory")
		dsn     = flag.String("dsn", os.Getenv("DATABASE_URL"), "postgres DSN")
	)
	flag.Parse()

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("set dialect: %w", err)
	}

	// "create" only writes a file; no DB needed.
	if *command == "create" {
		if err := goose.RunContext(ctx, "create", nil, *dir, flag.Args()...); err != nil {
			return fmt.Errorf("create: %w", err)
		}
		return nil
	}

	if *dsn == "" {
		return fmt.Errorf("DATABASE_URL is empty (set env or pass -dsn)")
	}
	database, err := sql.Open("pgx", *dsn)
	if err != nil {
		return fmt.Errorf("open db: %w", err)
	}
	defer func() { _ = database.Close() }()

	if err := goose.RunContext(ctx, *command, database, *dir, flag.Args()...); err != nil {
		return fmt.Errorf("%s: %w", *command, err)
	}
	return nil
}
