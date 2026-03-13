package notify

import (
	"encoding/json"
	"fmt"
	"net/smtp"

	"github.com/anchoo2kewl/buildme/internal/config"
	"github.com/anchoo2kewl/buildme/internal/models"
)

type emailConfig struct {
	To []string `json:"to"`
}

func sendEmail(cfg *config.Config, configJSON string, build *models.Build, eventType string) error {
	if cfg.SMTPHost == "" {
		return fmt.Errorf("SMTP not configured")
	}

	var ec emailConfig
	if err := json.Unmarshal([]byte(configJSON), &ec); err != nil {
		return err
	}

	subject := fmt.Sprintf("[BuildMe] %s — %s on %s", eventType, build.WorkflowName, build.Branch)
	body := fmt.Sprintf("Build %s\nBranch: %s\nCommit: %s\nStatus: %s\nURL: %s",
		build.ExternalID, build.Branch, build.CommitSHA[:min(7, len(build.CommitSHA))], build.Status, build.ProviderURL)

	msg := fmt.Sprintf("From: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s",
		cfg.SMTPFrom, subject, body)

	addr := fmt.Sprintf("%s:%d", cfg.SMTPHost, cfg.SMTPPort)
	auth := smtp.PlainAuth("", cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPHost)
	return smtp.SendMail(addr, auth, cfg.SMTPFrom, ec.To, []byte(msg))
}
