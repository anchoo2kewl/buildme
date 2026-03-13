package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/anchoo2kewl/buildme/internal/auth"
	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/go-chi/chi/v5"
)

type APIKeyHandler struct {
	store store.Store
}

func (h *APIKeyHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := UserIDFromCtx(r.Context())

	var body struct {
		Name      string `json:"name"`
		ExpiresIn *int   `json:"expires_in"` // days, 1-365
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if body.Name == "" {
		jsonError(w, "name is required", http.StatusBadRequest)
		return
	}

	rawKey, keyHash, keyPrefix, err := auth.GenerateAPIKey()
	if err != nil {
		jsonError(w, "failed to generate key", http.StatusInternalServerError)
		return
	}

	key := &models.APIKey{
		UserID:    userID,
		Name:      body.Name,
		KeyHash:   keyHash,
		KeyPrefix: keyPrefix,
	}

	if body.ExpiresIn != nil {
		days := *body.ExpiresIn
		if days < 1 || days > 365 {
			jsonError(w, "expires_in must be between 1 and 365 days", http.StatusBadRequest)
			return
		}
		exp := time.Now().Add(time.Duration(days) * 24 * time.Hour)
		key.ExpiresAt = &exp
	}

	if err := h.store.CreateAPIKey(r.Context(), key); err != nil {
		jsonError(w, "failed to create api key", http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusCreated, map[string]any{
		"id":         key.ID,
		"name":       key.Name,
		"key":        rawKey,
		"key_prefix": key.KeyPrefix,
		"created_at": key.CreatedAt,
		"expires_at": key.ExpiresAt,
	})
}

func (h *APIKeyHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := UserIDFromCtx(r.Context())

	keys, err := h.store.ListAPIKeysByUser(r.Context(), userID)
	if err != nil {
		jsonError(w, "failed to list api keys", http.StatusInternalServerError)
		return
	}
	if keys == nil {
		keys = []models.APIKey{}
	}
	jsonResp(w, http.StatusOK, keys)
}

func (h *APIKeyHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := UserIDFromCtx(r.Context())

	keyID, err := strconv.ParseInt(chi.URLParam(r, "keyId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid key id", http.StatusBadRequest)
		return
	}

	if err := h.store.DeleteAPIKey(r.Context(), keyID, userID); err != nil {
		jsonError(w, "failed to delete api key", http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusOK, map[string]string{"status": "deleted"})
}
