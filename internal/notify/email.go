package notify

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/smtp"
	"strconv"
	"strings"
	"time"

	"github.com/anchoo2kewl/buildme/internal/config"
	"github.com/anchoo2kewl/buildme/internal/models"
)

type emailConfig struct {
	To []string `json:"to"`
}

// SMTPConfig holds email sending config. Supports Brevo REST API (preferred) or SMTP relay.
type SMTPConfig struct {
	Host      string // SMTP host or "brevo" for Brevo REST API
	Port      int
	User      string
	Pass      string // SMTP password or Brevo API key
	FromEmail string
	FromName  string
	APIKey    string // Brevo API key (if set, uses REST API instead of SMTP)
}

// SMTPFromSettings builds an SMTPConfig from DB settings map.
func SMTPFromSettings(settings map[string]string) *SMTPConfig {
	port := 587
	if p, err := strconv.Atoi(settings["smtp.port"]); err == nil && p > 0 {
		port = p
	}
	return &SMTPConfig{
		Host:      settings["smtp.host"],
		Port:      port,
		User:      settings["smtp.user"],
		Pass:      settings["smtp.pass"],
		FromEmail: settings["smtp.from_email"],
		FromName:  settings["smtp.from_name"],
		APIKey:    settings["smtp.api_key"],
	}
}

// SMTPFromConfig builds an SMTPConfig from env-based Config (fallback).
func SMTPFromConfig(cfg *config.Config) *SMTPConfig {
	return &SMTPConfig{
		Host:      cfg.SMTPHost,
		Port:      cfg.SMTPPort,
		User:      cfg.SMTPUser,
		Pass:      cfg.SMTPPass,
		FromEmail: cfg.SMTPFrom,
		FromName:  "BuildMe",
	}
}

func (s *SMTPConfig) IsConfigured() bool {
	return s.APIKey != "" || s.Host != ""
}

func (s *SMTPConfig) useBrevoAPI() bool {
	return s.APIKey != ""
}

func (s *SMTPConfig) From() string {
	if s.FromName != "" {
		return fmt.Sprintf("%s <%s>", s.FromName, s.FromEmail)
	}
	return s.FromEmail
}

func sendEmail(cfg *config.Config, configJSON string, build *models.Build, eventType string) error {
	smtpCfg := SMTPFromConfig(cfg)
	if !smtpCfg.IsConfigured() {
		return fmt.Errorf("email not configured")
	}

	var ec emailConfig
	if err := json.Unmarshal([]byte(configJSON), &ec); err != nil {
		return err
	}

	subject := fmt.Sprintf("[BuildMe] %s — %s on %s", eventType, build.CommitMessage, build.Branch)
	body := buildAlertEmailHTML(build, eventType)

	return emailSend(smtpCfg, ec.To, subject, body)
}

// SendEmailWithSettings sends using DB-backed settings.
func SendEmailWithSettings(cfg *SMTPConfig, configJSON string, build *models.Build, eventType string) error {
	if !cfg.IsConfigured() {
		return fmt.Errorf("email not configured")
	}

	var ec emailConfig
	if err := json.Unmarshal([]byte(configJSON), &ec); err != nil {
		return err
	}

	subject := fmt.Sprintf("[BuildMe] %s — %s on %s", eventType, build.CommitMessage, build.Branch)
	body := buildAlertEmailHTML(build, eventType)

	return emailSend(cfg, ec.To, subject, body)
}

// SendInviteEmail sends an invite code email.
func SendInviteEmail(cfg *SMTPConfig, toEmail, inviteCode, baseURL string) error {
	if !cfg.IsConfigured() {
		return fmt.Errorf("email not configured")
	}

	registerURL := baseURL + "/register?code=" + inviteCode
	subject := "You've been invited to BuildMe"
	body := fmt.Sprintf(`<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;background:#0f0f1a;color:#e2e2f0;padding:40px">
<div style="max-width:500px;margin:0 auto;background:#1a1a2e;border:1px solid #3a3a5c;border-radius:12px;padding:40px">
<h1 style="color:#6366f1;margin:0 0 16px">BuildMe</h1>
<p>You've been invited to join BuildMe — a CI/CD build monitoring dashboard.</p>
<p>Use this invite code to create your account:</p>
<div style="background:#0f0f1a;border:1px solid #3a3a5c;border-radius:8px;padding:12px 20px;font-family:monospace;font-size:18px;margin:20px 0;text-align:center">%s</div>
<p><a href="%s" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Create Account</a></p>
<p style="color:#8888a8;font-size:14px;margin-top:24px">This invite expires in 7 days.</p>
</div></body></html>`, inviteCode, registerURL)

	return emailSend(cfg, []string{toEmail}, subject, body)
}

// SendMemberInviteEmail notifies a user they've been added to a project.
func SendMemberInviteEmail(cfg *SMTPConfig, toEmail, projectName, role, baseURL string) error {
	if !cfg.IsConfigured() {
		return nil
	}

	subject := fmt.Sprintf("You've been added to %s on BuildMe", projectName)
	body := fmt.Sprintf(`<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;background:#0f0f1a;color:#e2e2f0;padding:40px">
<div style="max-width:500px;margin:0 auto;background:#1a1a2e;border:1px solid #3a3a5c;border-radius:12px;padding:40px">
<h1 style="color:#6366f1;margin:0 0 16px">BuildMe</h1>
<p>You've been added to the project <strong>%s</strong> with the <strong>%s</strong> role.</p>
<p><a href="%s/dashboard" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Open Dashboard</a></p>
</div></body></html>`, projectName, role, baseURL)

	return emailSend(cfg, []string{toEmail}, subject, body)
}

func buildAlertEmailHTML(build *models.Build, eventType string) string {
	sha := build.CommitSHA
	if len(sha) > 7 {
		sha = sha[:7]
	}

	statusColor := "#34d399"
	if build.Status == models.BuildStatusFailure || build.Status == models.BuildStatusError {
		statusColor = "#f87171"
	} else if build.Status == models.BuildStatusCancelled {
		statusColor = "#8888a8"
	}

	eventLabel := strings.ReplaceAll(eventType, "build.", "Build ")
	eventLabel = strings.Title(eventLabel)

	return fmt.Sprintf(`<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;background:#0f0f1a;color:#e2e2f0;padding:40px">
<div style="max-width:500px;margin:0 auto;background:#1a1a2e;border:1px solid #3a3a5c;border-radius:12px;padding:40px">
<h1 style="color:#6366f1;margin:0 0 16px">BuildMe</h1>
<h2 style="color:%s;margin:0 0 16px">%s</h2>
<table style="width:100%%;font-size:14px;color:#e2e2f0">
<tr><td style="color:#8888a8;padding:6px 0">Status</td><td style="padding:6px 0"><strong style="color:%s">%s</strong></td></tr>
<tr><td style="color:#8888a8;padding:6px 0">Branch</td><td style="padding:6px 0">%s</td></tr>
<tr><td style="color:#8888a8;padding:6px 0">Commit</td><td style="padding:6px 0"><code>%s</code></td></tr>
<tr><td style="color:#8888a8;padding:6px 0">Message</td><td style="padding:6px 0">%s</td></tr>
<tr><td style="color:#8888a8;padding:6px 0">Author</td><td style="padding:6px 0">%s</td></tr>
</table>
%s
</div></body></html>`,
		statusColor, eventLabel,
		statusColor, build.Status,
		build.Branch, sha, build.CommitMessage, build.CommitAuthor,
		func() string {
			if build.ProviderURL != "" {
				return fmt.Sprintf(`<p style="margin-top:20px"><a href="%s" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">View Build</a></p>`, build.ProviderURL)
			}
			return ""
		}())
}

// emailSend dispatches via Brevo REST API or SMTP depending on config.
func emailSend(cfg *SMTPConfig, to []string, subject, htmlBody string) error {
	if cfg.useBrevoAPI() {
		return brevoSend(cfg, to, subject, htmlBody)
	}
	return smtpSend(cfg, to, subject, htmlBody)
}

// brevoSend sends email via Brevo REST API.
func brevoSend(cfg *SMTPConfig, to []string, subject, htmlBody string) error {
	type sender struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	type recipient struct {
		Email string `json:"email"`
	}
	type payload struct {
		Sender      sender      `json:"sender"`
		To          []recipient `json:"to"`
		Subject     string      `json:"subject"`
		HTMLContent string      `json:"htmlContent"`
	}

	recipients := make([]recipient, len(to))
	for i, addr := range to {
		recipients[i] = recipient{Email: addr}
	}

	p := payload{
		Sender:      sender{Name: cfg.FromName, Email: cfg.FromEmail},
		To:          recipients,
		Subject:     subject,
		HTMLContent: htmlBody,
	}

	body, err := json.Marshal(p)
	if err != nil {
		return fmt.Errorf("marshal brevo payload: %w", err)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	req, _ := http.NewRequest("POST", "https://api.brevo.com/v3/smtp/email", bytes.NewReader(body))
	req.Header.Set("api-key", cfg.APIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("brevo api: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		io.Copy(io.Discard, resp.Body)
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("brevo API HTTP %d: %s", resp.StatusCode, string(respBody))
}

// SendTestEmail is exported for use by admin handler.
func SendTestEmail(cfg *SMTPConfig, to, subject, htmlBody string) error {
	return emailSend(cfg, []string{to}, subject, htmlBody)
}

func smtpSend(cfg *SMTPConfig, to []string, subject, htmlBody string) error {
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n%s",
		cfg.From(), strings.Join(to, ", "), subject, htmlBody)

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	auth := smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)
	return smtp.SendMail(addr, auth, cfg.FromEmail, to, []byte(msg))
}
