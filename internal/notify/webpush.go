package notify

import (
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/anchoo2kewl/buildme/internal/config"
	"github.com/anchoo2kewl/buildme/internal/models"
)

func sendPush(cfg *config.Config, sub *models.PushSubscription, build *models.Build, eventType string) error {
	if cfg.VAPIDPublicKey == "" || cfg.VAPIDPrivateKey == "" {
		return fmt.Errorf("VAPID keys not configured")
	}

	payload, err := json.Marshal(map[string]any{
		"title": fmt.Sprintf("Build %s", eventType),
		"body":  fmt.Sprintf("%s on %s — %s", build.WorkflowName, build.Branch, build.Status),
		"url":   build.ProviderURL,
	})
	if err != nil {
		return err
	}

	// Web Push sending would use a VAPID library here.
	// For now, log the intent.
	slog.Info("web push (stub)", "endpoint", sub.Endpoint, "payload_size", len(payload))
	return nil
}
