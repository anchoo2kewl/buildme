package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
)

// GenerateAPIKey creates a new API key and returns the raw key, its SHA-256 hash, and an 8-char prefix for display.
func GenerateAPIKey() (rawKey, keyHash, keyPrefix string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", "", fmt.Errorf("generate api key: %w", err)
	}
	rawKey = base64.RawURLEncoding.EncodeToString(b)
	keyHash = HashAPIKey(rawKey)
	keyPrefix = rawKey[:8]
	return rawKey, keyHash, keyPrefix, nil
}

// HashAPIKey returns the SHA-256 hex digest of a raw API key.
func HashAPIKey(key string) string {
	h := sha256.Sum256([]byte(key))
	return fmt.Sprintf("%x", h)
}
