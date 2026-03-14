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

	settings, err := h.store.GetSettings(r.Context(), "smtp.")
	if err != nil {
		jsonError(w, "failed to get settings", http.StatusInternalServerError)
		return
	}

	// Never expose secrets in full
	if p, ok := settings["smtp.pass"]; ok && len(p) > 4 {
		settings["smtp.pass"] = p[:4] + "****"
	}
	if k, ok := settings["smtp.api_key"]; ok && len(k) > 8 {
		settings["smtp.api_key"] = k[:8] + "****"
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
		"smtp.host":       true,
		"smtp.port":       true,
		"smtp.user":       true,
		"smtp.pass":       true,
		"smtp.from_email": true,
		"smtp.from_name":  true,
		"smtp.api_key":    true,
	}

	for key, value := range req {
		if !allowedKeys[key] {
			continue
		}
		// Skip masked secrets
		if (key == "smtp.pass" || key == "smtp.api_key") && len(value) > 4 && value[len(value)-4:] == "****" {
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
		To string `json:"to"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.To == "" {
		jsonError(w, "provide 'to' email address", http.StatusBadRequest)
		return
	}

	settings, err := h.store.GetSettings(r.Context(), "smtp.")
	if err != nil {
		jsonError(w, "failed to get settings", http.StatusInternalServerError)
		return
	}

	cfg := notify.SMTPFromSettings(settings)
	if !cfg.IsConfigured() {
		jsonError(w, "email not configured — set either Brevo API key or SMTP host", http.StatusBadRequest)
		return
	}

	subject := "BuildMe Test Email"
	body := `<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;background:#0f0f1a;color:#e2e2f0;padding:40px">
<div style="max-width:500px;margin:0 auto;background:#1a1a2e;border:1px solid #3a3a5c;border-radius:12px;padding:40px">
<h1 style="color:#6366f1;margin:0 0 16px">BuildMe</h1>
<p>This is a test email from BuildMe. Your email configuration is working correctly.</p>
</div></body></html>`

	if err := notify.SendTestEmail(cfg, req.To, subject, body); err != nil {
		jsonError(w, "send failed: "+err.Error(), http.StatusInternalServerError)
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
