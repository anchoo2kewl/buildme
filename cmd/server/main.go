package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/anchoo2kewl/buildme/internal/api"
	"github.com/anchoo2kewl/buildme/internal/auth"
	"github.com/anchoo2kewl/buildme/internal/config"
	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/notify"
	"github.com/anchoo2kewl/buildme/internal/poller"
	"github.com/anchoo2kewl/buildme/internal/provider"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/anchoo2kewl/buildme/internal/version"
	"github.com/anchoo2kewl/buildme/internal/ws"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	info := version.Get()
	slog.Info("starting buildme", "version", info.Version, "commit", info.GitCommit)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	db, err := store.NewSQLite(cfg.DatabasePath)
	if err != nil {
		slog.Error("failed to open database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	// Seed admin user if not exists
	seedAdmin(db, cfg)

	hub := ws.NewHub()
	go hub.Run()

	registry := provider.NewRegistry()
	dispatcher := notify.NewDispatcher(db, cfg)
	go dispatcher.Run()

	poll := poller.New(db, registry, hub, dispatcher, cfg)
	go poll.Run()

	versionPoll := poller.NewVersionPoller(db, cfg, hub)
	go versionPoll.Run()

	router := api.NewRouter(db, cfg, hub, registry, dispatcher)
	addr := ":" + strconv.Itoa(cfg.Port)

	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("listening", "addr", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	versionPoll.Stop()
	poll.Stop()
	dispatcher.Stop()
	hub.Stop()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("server shutdown error", "error", err)
	}
	slog.Info("stopped")
}

func seedAdmin(db store.Store, cfg *config.Config) {
	ctx := context.Background()
	existing, _ := db.GetUserByEmail(ctx, cfg.AdminEmail)
	if existing != nil {
		return
	}

	password := cfg.AdminPassword
	if password == "" {
		password = "BuildMe2026!"
	}
	hash, err := auth.Hash(password)
	if err != nil {
		slog.Error("failed to hash admin password", "error", err)
		return
	}

	admin := &models.User{
		Email:            cfg.AdminEmail,
		PasswordHash:     hash,
		DisplayName:      cfg.AdminName,
		IsSuperAdmin:     true,
		InvitesRemaining: -1, // unlimited
	}
	if err := db.CreateUser(ctx, admin); err != nil {
		slog.Error("failed to seed admin user", "error", err)
		return
	}
	slog.Info("admin user seeded", "email", cfg.AdminEmail)
}
