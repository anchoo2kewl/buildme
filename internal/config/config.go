package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port            int
	DatabasePath    string
	JWTSecret       string
	EncryptionKey   string
	GitHubClientID  string
	GitHubSecret    string
	BaseURL         string
	FrontendDist    string
	PollInterval    time.Duration
	PollConcurrency int
	SMTPHost        string
	SMTPPort        int
	SMTPUser        string
	SMTPPass        string
	SMTPFrom        string
	VAPIDPublicKey  string
	VAPIDPrivateKey string
	AdminEmail      string
	AdminPassword   string
	AdminName       string
}

func Load() (*Config, error) {
	c := &Config{
		Port:            envInt("BUILDME_PORT", 8080),
		DatabasePath:    envStr("BUILDME_DB_PATH", "buildme.db"),
		JWTSecret:       envStr("BUILDME_JWT_SECRET", ""),
		EncryptionKey:   envStr("BUILDME_ENCRYPTION_KEY", ""),
		GitHubClientID:  envStr("BUILDME_GITHUB_CLIENT_ID", ""),
		GitHubSecret:    envStr("BUILDME_GITHUB_CLIENT_SECRET", ""),
		BaseURL:         envStr("BUILDME_BASE_URL", "http://localhost:8080"),
		FrontendDist:    envStr("BUILDME_FRONTEND_DIST", "frontend/dist"),
		PollInterval:    time.Duration(envInt("BUILDME_POLL_INTERVAL_S", 10)) * time.Second,
		PollConcurrency: envInt("BUILDME_POLL_CONCURRENCY", 5),
		SMTPHost:        envStr("BUILDME_SMTP_HOST", ""),
		SMTPPort:        envInt("BUILDME_SMTP_PORT", 587),
		SMTPUser:        envStr("BUILDME_SMTP_USER", ""),
		SMTPPass:        envStr("BUILDME_SMTP_PASS", ""),
		SMTPFrom:        envStr("BUILDME_SMTP_FROM", ""),
		VAPIDPublicKey:  envStr("BUILDME_VAPID_PUBLIC_KEY", ""),
		VAPIDPrivateKey: envStr("BUILDME_VAPID_PRIVATE_KEY", ""),
		AdminEmail:      envStr("BUILDME_ADMIN_EMAIL", "admin@buildme.dev"),
		AdminPassword:   envStr("BUILDME_ADMIN_PASSWORD", ""),
		AdminName:       envStr("BUILDME_ADMIN_NAME", "anshuman"),
	}

	if c.JWTSecret == "" {
		return nil, fmt.Errorf("BUILDME_JWT_SECRET is required")
	}
	if c.EncryptionKey == "" {
		return nil, fmt.Errorf("BUILDME_ENCRYPTION_KEY is required")
	}
	if len(c.EncryptionKey) != 32 {
		return nil, fmt.Errorf("BUILDME_ENCRYPTION_KEY must be exactly 32 bytes")
	}

	return c, nil
}

func envStr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
