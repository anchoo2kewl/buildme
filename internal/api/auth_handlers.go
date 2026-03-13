package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"log/slog"

	"github.com/anchoo2kewl/buildme/internal/auth"
	"github.com/anchoo2kewl/buildme/internal/config"
	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/notify"
	"github.com/anchoo2kewl/buildme/internal/store"
)

type AuthHandler struct {
	store store.Store
	cfg   *config.Config
}

// Signup requires an invite code. No open registration.
func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email       string `json:"email"`
		Password    string `json:"password"`
		DisplayName string `json:"display_name"`
		InviteCode  string `json:"invite_code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" || req.InviteCode == "" {
		jsonError(w, "email, password, and invite_code required", http.StatusBadRequest)
		return
	}

	// Validate invite code
	invite, _ := h.store.GetInviteByCode(r.Context(), req.InviteCode)
	if invite == nil {
		jsonError(w, "invalid invite code", http.StatusForbidden)
		return
	}
	if invite.UsedBy != nil {
		jsonError(w, "invite code already used", http.StatusForbidden)
		return
	}
	if time.Now().After(invite.ExpiresAt) {
		jsonError(w, "invite code expired", http.StatusForbidden)
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
		Email:            req.Email,
		PasswordHash:     hash,
		DisplayName:      displayName,
		InvitesRemaining: 1, // New users get 1 invite
	}
	if err := h.store.CreateUser(r.Context(), user); err != nil {
		jsonError(w, "failed to create user", http.StatusInternalServerError)
		return
	}

	// Redeem the invite
	h.store.RedeemInvite(r.Context(), req.InviteCode, user.ID)

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

// CreateInvite generates an invite code for the authenticated user.
func (h *AuthHandler) CreateInvite(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())

	// -1 means unlimited invites (admin)
	if user.InvitesRemaining == 0 {
		jsonError(w, "no invites remaining", http.StatusForbidden)
		return
	}

	var req struct {
		Email string `json:"email"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	code := generateInviteCode()
	invite := &models.Invite{
		Code:      code,
		CreatedBy: user.ID,
		Email:     req.Email,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour), // 7 days
	}

	if err := h.store.CreateInvite(r.Context(), invite); err != nil {
		jsonError(w, "failed to create invite", http.StatusInternalServerError)
		return
	}

	// Decrement invites (skip if unlimited = -1)
	if user.InvitesRemaining > 0 {
		user.InvitesRemaining--
		h.store.UpdateUser(r.Context(), user)
	}

	// Send invite email if recipient email provided and SMTP is configured
	if req.Email != "" {
		settings, _ := h.store.GetSettings(r.Context(), "smtp.")
		var smtp *notify.SMTPConfig
		if settings["smtp.host"] != "" {
			smtp = notify.SMTPFromSettings(settings)
		} else {
			smtp = notify.SMTPFromConfig(h.cfg)
		}
		if smtp.IsConfigured() {
			if err := notify.SendInviteEmail(smtp, req.Email, code, h.cfg.BaseURL); err != nil {
				slog.Warn("failed to send invite email", "to", req.Email, "error", err)
			}
		}
	}

	jsonResp(w, http.StatusCreated, invite)
}

// ListInvites returns invites created by the authenticated user.
func (h *AuthHandler) ListInvites(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	invites, err := h.store.ListInvitesByUser(r.Context(), user.ID)
	if err != nil {
		jsonError(w, "failed to list invites", http.StatusInternalServerError)
		return
	}
	if invites == nil {
		invites = []models.Invite{}
	}
	jsonResp(w, http.StatusOK, invites)
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
			// GitHub OAuth for new users is not allowed without invite
			jsonError(w, "invite required for new accounts", http.StatusForbidden)
			return
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

func generateInviteCode() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
