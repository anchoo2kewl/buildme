package notify

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/anchoo2kewl/buildme/internal/models"
)

type webhookConfig struct {
	URL    string `json:"url"`
	Secret string `json:"secret"`
}

func sendWebhook(configJSON string, build *models.Build, eventType string) error {
	var wc webhookConfig
	if err := json.Unmarshal([]byte(configJSON), &wc); err != nil {
		return err
	}

	payload, err := json.Marshal(map[string]any{
		"event":     eventType,
		"build":     build,
		"timestamp": time.Now().UTC(),
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", wc.URL, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-BuildMe-Event", eventType)

	if wc.Secret != "" {
		mac := hmac.New(sha256.New, []byte(wc.Secret))
		mac.Write(payload)
		sig := hex.EncodeToString(mac.Sum(nil))
		req.Header.Set("X-BuildMe-Signature", sig)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("webhook returned %d", resp.StatusCode)
	}
	return nil
}
