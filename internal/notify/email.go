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
	Host            string // SMTP host or "brevo" for Brevo REST API
	Port            int
	User            string
	Pass            string // SMTP password or Brevo API key
	FromEmail       string
	FromName        string
	APIKey          string // Brevo API key (if set, uses REST API instead of SMTP)
	MailerSendKey   string // MailerSend (MailerLite) API key
	DefaultProvider string // "brevo" or "mailerlite"
}

// SMTPFromSettings builds an SMTPConfig from DB settings map.
func SMTPFromSettings(settings map[string]string) *SMTPConfig {
	port := 587
	if p, err := strconv.Atoi(settings["smtp.port"]); err == nil && p > 0 {
		port = p
	}
	provider := settings["email.default_provider"]
	if provider == "" {
		provider = "brevo"
	}
	return &SMTPConfig{
		Host:            settings["smtp.host"],
		Port:            port,
		User:            settings["smtp.user"],
		Pass:            settings["smtp.pass"],
		FromEmail:       settings["smtp.from_email"],
		FromName:        settings["smtp.from_name"],
		APIKey:          settings["smtp.api_key"],
		MailerSendKey:   settings["email.mailerlite_api_key"],
		DefaultProvider: provider,
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
	return s.APIKey != "" || s.MailerSendKey != "" || s.Host != ""
}

func (s *SMTPConfig) useBrevoAPI() bool {
	if s.DefaultProvider == "mailerlite" && s.MailerSendKey != "" {
		return false
	}
	return s.APIKey != ""
}

func (s *SMTPConfig) useMailerSend() bool {
	if s.DefaultProvider == "mailerlite" && s.MailerSendKey != "" {
		return true
	}
	if s.DefaultProvider == "brevo" || s.APIKey != "" {
		return false
	}
	return s.MailerSendKey != ""
}

func (s *SMTPConfig) From() string {
	if s.FromName != "" {
		return fmt.Sprintf("%s <%s>", s.FromName, s.FromEmail)
	}
	return s.FromEmail
}

// TestProvider sends a test email using a specific provider ("brevo" or "mailerlite").
func TestProvider(cfg *SMTPConfig, provider, to, subject, htmlBody string) error {
	switch provider {
	case "brevo":
		if cfg.APIKey == "" {
			return fmt.Errorf("Brevo API key not configured")
		}
		return brevoSend(cfg, []string{to}, subject, htmlBody)
	case "mailerlite":
		if cfg.MailerSendKey == "" {
			return fmt.Errorf("MailerSend API key not configured")
		}
		return mailerSendSend(cfg, []string{to}, subject, htmlBody)
	default:
		return fmt.Errorf("unknown provider: %s", provider)
	}
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

	signupURL := baseURL + "/auth/signup?code=" + inviteCode
	subject := "You've been invited to BuildMe"
	body := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>You've been invited to BuildMe</title></head>
<body style="margin:0;padding:0;background-color:#0a0c12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#0a0c12;padding:40px 16px">
    <tr><td align="center">
      <table width="100%%" cellpadding="0" cellspacing="0" style="max-width:520px">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1a1c2e 0%%,#141624 100%%);border-radius:12px 12px 0 0;border:1px solid #2a2d45;border-bottom:none;padding:32px 40px 28px">
          <table width="100%%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="display:inline-flex;align-items:center;gap:10px">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16m-7 6h7M4 18h4"/>
                  </svg>
                  <span style="font-size:22px;font-weight:700;color:#6366f1;letter-spacing:-0.5px">BuildMe</span>
                </div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#10121e;border:1px solid #2a2d45;border-top:none;border-bottom:none;padding:36px 40px">

          <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#e8e9f5;line-height:1.3">You've been invited!</p>
          <p style="margin:0 0 28px;font-size:15px;color:#8082a0;line-height:1.6">
            Someone has invited you to join <strong style="color:#c4c6e0">BuildMe</strong> — a CI/CD build monitoring dashboard. Use the invite code below to create your account.
          </p>

          <!-- Invite code box -->
          <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr><td style="background:#0a0c12;border:1px solid #2a2d45;border-radius:10px;padding:20px 24px;text-align:center">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#5c5e7a">Your Invite Code</p>
              <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;letter-spacing:0.12em;color:#6366f1">%s</p>
            </td></tr>
          </table>

          <!-- CTA button -->
          <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr><td align="center">
              <a href="%s" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#818cf8);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:9px;letter-spacing:0.01em;box-shadow:0 4px 20px rgba(99,102,241,0.35)">
                Create Your Account →
              </a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:13px;color:#5c5e7a;line-height:1.6;text-align:center">
            The invite code is pre-filled when you click the button above.<br>
            This invite <strong style="color:#7577a0">expires in 7 days</strong>.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0d0f1a;border:1px solid #2a2d45;border-top:none;border-radius:0 0 12px 12px;padding:20px 40px">
          <p style="margin:0;font-size:12px;color:#3d3f58;text-align:center;line-height:1.6">
            If you weren't expecting this invite, you can safely ignore this email.<br>
            &copy; BuildMe · <a href="%s" style="color:#5557a0;text-decoration:none">build.biswas.me</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`, inviteCode, signupURL, baseURL)

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

// emailSend dispatches via Brevo REST API, MailerSend, or SMTP depending on config.
func emailSend(cfg *SMTPConfig, to []string, subject, htmlBody string) error {
	if cfg.useMailerSend() {
		return mailerSendSend(cfg, to, subject, htmlBody)
	}
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

// mailerSendSend sends email via MailerSend (MailerLite) REST API.
func mailerSendSend(cfg *SMTPConfig, to []string, subject, htmlBody string) error {
	type person struct {
		Email string `json:"email"`
		Name  string `json:"name,omitempty"`
	}
	type payload struct {
		From    person   `json:"from"`
		To      []person `json:"to"`
		Subject string   `json:"subject"`
		HTML    string   `json:"html"`
	}

	recipients := make([]person, len(to))
	for i, addr := range to {
		recipients[i] = person{Email: addr}
	}

	p := payload{
		From:    person{Email: cfg.FromEmail, Name: cfg.FromName},
		To:      recipients,
		Subject: subject,
		HTML:    htmlBody,
	}

	body, err := json.Marshal(p)
	if err != nil {
		return fmt.Errorf("marshal mailersend payload: %w", err)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	req, _ := http.NewRequest("POST", "https://api.mailersend.com/v1/email", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+cfg.MailerSendKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("mailersend api: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		io.Copy(io.Discard, resp.Body)
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("MailerSend API HTTP %d: %s", resp.StatusCode, string(respBody))
}

func smtpSend(cfg *SMTPConfig, to []string, subject, htmlBody string) error {
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n%s",
		cfg.From(), strings.Join(to, ", "), subject, htmlBody)

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	auth := smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)
	return smtp.SendMail(addr, auth, cfg.FromEmail, to, []byte(msg))
}
