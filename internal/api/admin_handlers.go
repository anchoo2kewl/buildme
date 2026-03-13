package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/smtp"
	"strconv"
	"strings"

	"github.com/anchoo2kewl/buildme/internal/store"
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

	// Never expose password in full
	if p, ok := settings["smtp.pass"]; ok && len(p) > 4 {
		settings["smtp.pass"] = p[:4] + "****"
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
	}

	for key, value := range req {
		if !allowedKeys[key] {
			continue
		}
		// Skip password if it's the masked version
		if key == "smtp.pass" && len(value) > 4 && value[4:] == "****" {
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

	if settings["smtp.host"] == "" {
		jsonError(w, "SMTP not configured", http.StatusBadRequest)
		return
	}

	if err := sendTestEmail(settings, req.To); err != nil {
		jsonError(w, "send failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusOK, map[string]string{"message": "test email sent"})
}

func sendTestEmail(settings map[string]string, to string) error {
	host := settings["smtp.host"]
	if host == "" {
		return fmt.Errorf("SMTP host not configured")
	}
	port := 587
	if p, err := strconv.Atoi(settings["smtp.port"]); err == nil && p > 0 {
		port = p
	}
	user := settings["smtp.user"]
	pass := settings["smtp.pass"]
	fromEmail := settings["smtp.from_email"]
	fromName := settings["smtp.from_name"]
	if fromName == "" {
		fromName = "BuildMe"
	}

	from := fmt.Sprintf("%s <%s>", fromName, fromEmail)
	subject := "BuildMe Test Email"
	body := `<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;background:#0f0f1a;color:#e2e2f0;padding:40px">
<div style="max-width:500px;margin:0 auto;background:#1a1a2e;border:1px solid #3a3a5c;border-radius:12px;padding:40px">
<h1 style="color:#6366f1;margin:0 0 16px">BuildMe</h1>
<p>This is a test email from BuildMe. Your email configuration is working correctly.</p>
</div></body></html>`

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n%s",
		from, to, subject, body)

	addr := fmt.Sprintf("%s:%d", host, port)
	auth := smtp.PlainAuth("", user, pass, host)
	return smtp.SendMail(addr, auth, fromEmail, strings.Split(to, ","), []byte(msg))
}
