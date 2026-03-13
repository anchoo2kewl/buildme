package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/anchoo2kewl/buildme/internal/auth"
	"github.com/anchoo2kewl/buildme/internal/config"
	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/store"
)

type AuthHandler struct {
	store store.Store
	cfg   *config.Config
}

func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email       string `json:"email"`
		Password    string `json:"password"`
		DisplayName string `json:"display_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		jsonError(w, "email and password required", http.StatusBadRequest)
		return
	}

	if err := auth.ValidateStrength(req.Password); err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	existing, _ := h.store.GetUserByEmail(r.Context(), req.Email)
	if existing != nil {
		jsonError(w, "email already registered", http.StatusConflict)
		return
	}

	hash, err := auth.Hash(req.Password)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	displayName := req.DisplayName
	if displayName == "" {
		displayName = req.Email
	}

	user := &models.User{
		Email:        req.Email,
		PasswordHash: hash,
		DisplayName:  displayName,
	}
	if err := h.store.CreateUser(r.Context(), user); err != nil {
		jsonError(w, "failed to create user", http.StatusInternalServerError)
		return
	}

	token, err := auth.GenerateToken(user.ID, h.cfg.JWTSecret, 7*24*time.Hour)
	if err != nil {
		jsonError(w, "failed to generate token", http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusCreated, map[string]any{
		"token": token,
		"user":  user,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	user, _ := h.store.GetUserByEmail(r.Context(), req.Email)
	if user == nil || !auth.Verify(req.Password, user.PasswordHash) {
		jsonError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	token, err := auth.GenerateToken(user.ID, h.cfg.JWTSecret, 7*24*time.Hour)
	if err != nil {
		jsonError(w, "failed to generate token", http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusOK, map[string]any{
		"token": token,
		"user":  user,
	})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	jsonResp(w, http.StatusOK, user)
}

func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	user := UserFromCtx(r.Context())
	if !auth.Verify(req.CurrentPassword, user.PasswordHash) {
		jsonError(w, "current password is incorrect", http.StatusUnauthorized)
		return
	}

	if err := auth.ValidateStrength(req.NewPassword); err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	hash, err := auth.Hash(req.NewPassword)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	user.PasswordHash = hash
	if err := h.store.UpdateUser(r.Context(), user); err != nil {
		jsonError(w, "failed to update password", http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusOK, map[string]string{"message": "password changed"})
}

func (h *AuthHandler) GitHubRedirect(w http.ResponseWriter, r *http.Request) {
	if h.cfg.GitHubClientID == "" {
		jsonError(w, "GitHub OAuth not configured", http.StatusNotImplemented)
		return
	}
	url := "https://github.com/login/oauth/authorize?client_id=" + h.cfg.GitHubClientID + "&scope=user:email&redirect_uri=" + h.cfg.BaseURL + "/api/auth/github/callback"
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func (h *AuthHandler) GitHubCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		jsonError(w, "missing code", http.StatusBadRequest)
		return
	}

	accessToken, err := auth.ExchangeGitHubCode(r.Context(), h.cfg.GitHubClientID, h.cfg.GitHubSecret, code)
	if err != nil {
		jsonError(w, "github oauth failed", http.StatusBadRequest)
		return
	}

	ghUser, err := auth.FetchGitHubUser(r.Context(), accessToken)
	if err != nil {
		jsonError(w, "failed to fetch github user", http.StatusInternalServerError)
		return
	}

	// Try to find existing user by GitHub ID
	user, _ := h.store.GetUserByGitHubID(r.Context(), ghUser.ID)
	if user == nil {
		// Try by email
		user, _ = h.store.GetUserByEmail(r.Context(), ghUser.Email)
		if user != nil {
			// Link GitHub account
			user.GitHubID = &ghUser.ID
			user.GitHubLogin = ghUser.Login
			if user.AvatarURL == "" {
				user.AvatarURL = ghUser.AvatarURL
			}
			h.store.UpdateUser(r.Context(), user)
		} else {
			// Create new user
			displayName := ghUser.Name
			if displayName == "" {
				displayName = ghUser.Login
			}
			user = &models.User{
				Email:       ghUser.Email,
				GitHubID:    &ghUser.ID,
				GitHubLogin: ghUser.Login,
				DisplayName: displayName,
				AvatarURL:   ghUser.AvatarURL,
			}
			if err := h.store.CreateUser(r.Context(), user); err != nil {
				jsonError(w, "failed to create user", http.StatusInternalServerError)
				return
			}
		}
	}

	token, err := auth.GenerateToken(user.ID, h.cfg.JWTSecret, 7*24*time.Hour)
	if err != nil {
		jsonError(w, "failed to generate token", http.StatusInternalServerError)
		return
	}

	// Redirect to frontend with token
	http.Redirect(w, r, h.cfg.BaseURL+"/auth/github-callback?token="+token, http.StatusTemporaryRedirect)
}
