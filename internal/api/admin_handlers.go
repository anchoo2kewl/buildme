package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/anchoo2kewl/buildme/internal/notify"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/anchoo2kewl/buildme/internal/version"
	"github.com/go-chi/chi/v5"
)

type AdminHandler struct {
	store store.Store
}

func (h *AdminHandler) GetEmailSettings(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	if user == nil || !user.IsSuperAdmin {
		jsonError(w, "admin access required", http.StatusForbidden)
		return
	}

	// Fetch both smtp.* and email.* settings
	smtpSettings, err := h.store.GetSettings(r.Context(), "smtp.")
	if err != nil {
		jsonError(w, "failed to get settings", http.StatusInternalServerError)
		return
	}
	emailSettings, err := h.store.GetSettings(r.Context(), "email.")
	if err != nil {
		jsonError(w, "failed to get settings", http.StatusInternalServerError)
		return
	}

	// Merge into one map
	settings := make(map[string]string)
	for k, v := range smtpSettings {
		settings[k] = v
	}
	for k, v := range emailSettings {
		settings[k] = v
	}

	// Never expose secrets in full
	for _, key := range []string{"smtp.pass", "smtp.api_key", "email.mailerlite_api_key"} {
		if v, ok := settings[key]; ok && len(v) > 8 {
			settings[key] = v[:8] + "****"
		} else if ok && len(v) > 0 {
			settings[key] = "****"
		}
	}

	jsonResp(w, http.StatusOK, settings)
}

func (h *AdminHandler) UpdateEmailSettings(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	if user == nil || !user.IsSuperAdmin {
		jsonError(w, "admin access required", http.StatusForbidden)
		return
	}

	var req map[string]string
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	allowedKeys := map[string]bool{
		"smtp.api_key":              true,
		"smtp.from_email":           true,
		"smtp.from_name":            true,
		"email.mailerlite_api_key":  true,
		"email.default_provider":    true,
	}

	secretKeys := map[string]bool{
		"smtp.api_key":             true,
		"email.mailerlite_api_key": true,
	}

	for key, value := range req {
		if !allowedKeys[key] {
			continue
		}
		// Skip masked secrets
		if secretKeys[key] && len(value) > 4 && value[len(value)-4:] == "****" {
			continue
		}
		if err := h.store.SetSetting(r.Context(), key, value); err != nil {
			jsonError(w, "failed to save setting: "+key, http.StatusInternalServerError)
			return
		}
	}

	jsonResp(w, http.StatusOK, map[string]string{"message": "settings updated"})
}

func (h *AdminHandler) TestEmail(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	if user == nil || !user.IsSuperAdmin {
		jsonError(w, "admin access required", http.StatusForbidden)
		return
	}

	var req struct {
		To       string `json:"to"`
		Provider string `json:"provider"` // "brevo" or "mailerlite"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.To == "" {
		jsonError(w, "provide 'to' email address", http.StatusBadRequest)
		return
	}

	// Fetch all settings
	allSettings := make(map[string]string)
	for _, prefix := range []string{"smtp.", "email."} {
		s, err := h.store.GetSettings(r.Context(), prefix)
		if err != nil {
			jsonError(w, "failed to get settings", http.StatusInternalServerError)
			return
		}
		for k, v := range s {
			allSettings[k] = v
		}
	}

	cfg := notify.SMTPFromSettings(allSettings)

	subject := "BuildMe Test Email"
	body := `<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;background:#0f0f1a;color:#e2e2f0;padding:40px">
<div style="max-width:500px;margin:0 auto;background:#1a1a2e;border:1px solid #3a3a5c;border-radius:12px;padding:40px">
<h1 style="color:#6366f1;margin:0 0 16px">BuildMe</h1>
<p>This is a test email from BuildMe. Your email configuration is working correctly.</p>
</div></body></html>`

	var sendErr error
	if req.Provider != "" {
		sendErr = notify.TestProvider(cfg, req.Provider, req.To, subject, body)
	} else {
		if !cfg.IsConfigured() {
			jsonError(w, "no email provider configured", http.StatusBadRequest)
			return
		}
		sendErr = notify.SendTestEmail(cfg, req.To, subject, body)
	}

	if sendErr != nil {
		jsonError(w, "send failed: "+sendErr.Error(), http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusOK, map[string]string{"message": "test email sent"})
}

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	if user == nil || !user.IsSuperAdmin {
		jsonError(w, "admin access required", http.StatusForbidden)
		return
	}

	users, err := h.store.ListAllUsers(r.Context())
	if err != nil {
		jsonError(w, "failed to list users", http.StatusInternalServerError)
		return
	}

	// Strip password hashes from response
	type userResp struct {
		ID               int64  `json:"id"`
		Email            string `json:"email"`
		GitHubLogin      string `json:"github_login,omitempty"`
		DisplayName      string `json:"display_name"`
		AvatarURL        string `json:"avatar_url,omitempty"`
		IsSuperAdmin     bool   `json:"is_super_admin"`
		InvitesRemaining int    `json:"invites_remaining"`
		CreatedAt        string `json:"created_at"`
	}

	resp := make([]userResp, len(users))
	for i, u := range users {
		resp[i] = userResp{
			ID:               u.ID,
			Email:            u.Email,
			GitHubLogin:      u.GitHubLogin,
			DisplayName:      u.DisplayName,
			AvatarURL:        u.AvatarURL,
			IsSuperAdmin:     u.IsSuperAdmin,
			InvitesRemaining: u.InvitesRemaining,
			CreatedAt:        u.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}
	jsonResp(w, http.StatusOK, resp)
}

func (h *AdminHandler) ToggleSuperAdmin(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	if user == nil || !user.IsSuperAdmin {
		jsonError(w, "admin access required", http.StatusForbidden)
		return
	}

	targetID, err := strconv.ParseInt(chi.URLParam(r, "userId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid user id", http.StatusBadRequest)
		return
	}

	if targetID == user.ID {
		jsonError(w, "cannot change your own super admin status", http.StatusBadRequest)
		return
	}

	target, err := h.store.GetUserByID(r.Context(), targetID)
	if err != nil || target == nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}

	newStatus := !target.IsSuperAdmin
	if err := h.store.SetUserSuperAdmin(r.Context(), targetID, newStatus); err != nil {
		jsonError(w, "failed to update user", http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusOK, map[string]any{
		"id":             targetID,
		"is_super_admin": newStatus,
	})
}

func (h *AdminHandler) GetSystemInfo(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	if user == nil || !user.IsSuperAdmin {
		jsonError(w, "admin access required", http.StatusForbidden)
		return
	}

	v := version.Get()
	users, projects, builds, err := h.store.GetSystemCounts(r.Context())
	if err != nil {
		jsonError(w, "failed to get system info", http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusOK, map[string]any{
		"version":        v.Version,
		"git_commit":     v.GitCommit,
		"build_time":     v.BuildTime,
		"db_type":        "sqlite",
		"user_count":     users,
		"project_count":  projects,
		"build_count":    builds,
	})
}
