package notify

import (
	"encoding/json"
	"fmt"
	"net/smtp"
	"strconv"
	"strings"

	"github.com/anchoo2kewl/buildme/internal/config"
	"github.com/anchoo2kewl/buildme/internal/models"
)

type emailConfig struct {
	To []string `json:"to"`
}

// SMTPConfig holds SMTP connection details, can come from DB or env vars.
type SMTPConfig struct {
	Host      string
	Port      int
	User      string
	Pass      string
	FromEmail string
	FromName  string
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
	return s.Host != ""
}

func (s *SMTPConfig) From() string {
	if s.FromName != "" {
		return fmt.Sprintf("%s <%s>", s.FromName, s.FromEmail)
	}
	return s.FromEmail
}

func sendEmail(cfg *config.Config, configJSON string, build *models.Build, eventType string) error {
	smtp := SMTPFromConfig(cfg)
	if !smtp.IsConfigured() {
		return fmt.Errorf("SMTP not configured")
	}

	var ec emailConfig
	if err := json.Unmarshal([]byte(configJSON), &ec); err != nil {
		return err
	}

	subject := fmt.Sprintf("[BuildMe] %s — %s on %s", eventType, build.CommitMessage, build.Branch)
	body := buildAlertEmailHTML(build, eventType)

	return smtpSend(smtp, ec.To, subject, body)
}

// SendEmailWithSettings sends using DB-backed SMTP settings.
func SendEmailWithSettings(smtp *SMTPConfig, configJSON string, build *models.Build, eventType string) error {
	if !smtp.IsConfigured() {
		return fmt.Errorf("SMTP not configured")
	}

	var ec emailConfig
	if err := json.Unmarshal([]byte(configJSON), &ec); err != nil {
		return err
	}

	subject := fmt.Sprintf("[BuildMe] %s — %s on %s", eventType, build.CommitMessage, build.Branch)
	body := buildAlertEmailHTML(build, eventType)

	return smtpSend(smtp, ec.To, subject, body)
}

// SendInviteEmail sends an invite code email.
func SendInviteEmail(smtp *SMTPConfig, toEmail, inviteCode, baseURL string) error {
	if !smtp.IsConfigured() {
		return fmt.Errorf("SMTP not configured")
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

	return smtpSend(smtp, []string{toEmail}, subject, body)
}

// SendMemberInviteEmail notifies a user they've been added to a project.
func SendMemberInviteEmail(smtp *SMTPConfig, toEmail, projectName, role, baseURL string) error {
	if !smtp.IsConfigured() {
		return nil // silently skip if SMTP not configured
	}

	subject := fmt.Sprintf("You've been added to %s on BuildMe", projectName)
	body := fmt.Sprintf(`<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;background:#0f0f1a;color:#e2e2f0;padding:40px">
<div style="max-width:500px;margin:0 auto;background:#1a1a2e;border:1px solid #3a3a5c;border-radius:12px;padding:40px">
<h1 style="color:#6366f1;margin:0 0 16px">BuildMe</h1>
<p>You've been added to the project <strong>%s</strong> with the <strong>%s</strong> role.</p>
<p><a href="%s/dashboard" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Open Dashboard</a></p>
</div></body></html>`, projectName, role, baseURL)

	return smtpSend(smtp, []string{toEmail}, subject, body)
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

func smtpSend(cfg *SMTPConfig, to []string, subject, htmlBody string) error {
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n%s",
		cfg.From(), strings.Join(to, ", "), subject, htmlBody)

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	auth := smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)
	return smtp.SendMail(addr, auth, cfg.FromEmail, to, []byte(msg))
}
