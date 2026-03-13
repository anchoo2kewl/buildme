package notify

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/anchoo2kewl/buildme/internal/config"
	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/store"
)

const maxRetries = 5

type Dispatcher struct {
	store store.Store
	cfg   *config.Config
	stop  chan struct{}
}

func NewDispatcher(s store.Store, cfg *config.Config) *Dispatcher {
	return &Dispatcher{
		store: s,
		cfg:   cfg,
		stop:  make(chan struct{}),
	}
}

func (d *Dispatcher) Run() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			d.processRetries()
		case <-d.stop:
			return
		}
	}
}

func (d *Dispatcher) Stop() {
	close(d.stop)
}

func (d *Dispatcher) Dispatch(ctx context.Context, build *models.Build, oldStatus models.BuildStatus) {
	eventType := d.detectEventType(build, oldStatus)
	if eventType == "" {
		return
	}

	channels, err := d.store.ListNotificationChannels(ctx, build.ProjectID)
	if err != nil {
		slog.Error("dispatcher: list channels", "error", err)
		return
	}

	for _, ch := range channels {
		if !ch.Enabled {
			continue
		}
		if !d.matchesFilter(ch.EventFilter, eventType) {
			continue
		}

		log := &models.NotificationLog{
			ChannelID: ch.ID,
			BuildID:   build.ID,
			EventType: eventType,
			Status:    models.NotifSending,
			Attempts:  1,
		}
		if err := d.store.CreateNotificationLog(ctx, log); err != nil {
			slog.Error("dispatcher: create log", "error", err)
			continue
		}

		if err := d.send(ctx, &ch, build, eventType); err != nil {
			slog.Error("dispatcher: send", "channel_id", ch.ID, "error", err)
			log.Status = models.NotifRetry
			next := time.Now().Add(30 * time.Second)
			log.NextRetryAt = &next
			d.store.UpdateNotificationLog(ctx, log)
		} else {
			log.Status = models.NotifSent
			d.store.UpdateNotificationLog(ctx, log)
		}
	}
}

func (d *Dispatcher) detectEventType(build *models.Build, oldStatus models.BuildStatus) string {
	switch build.Status {
	case models.BuildStatusFailure:
		return "build.failed"
	case models.BuildStatusError:
		return "build.errored"
	case models.BuildStatusCancelled:
		return "build.cancelled"
	case models.BuildStatusSuccess:
		if oldStatus == models.BuildStatusFailure || oldStatus == models.BuildStatusError {
			return "build.fixed"
		}
	}
	return ""
}

func (d *Dispatcher) matchesFilter(filterJSON, eventType string) bool {
	if filterJSON == "" || filterJSON == "[]" {
		return true // Empty filter matches all
	}
	var events []string
	if err := json.Unmarshal([]byte(filterJSON), &events); err != nil {
		return true
	}
	if len(events) == 0 {
		return true
	}
	for _, e := range events {
		if e == eventType {
			return true
		}
	}
	return false
}

func (d *Dispatcher) send(ctx context.Context, ch *models.NotificationChannel, build *models.Build, eventType string) error {
	switch ch.ChannelType {
	case models.ChannelEmail:
		return sendEmail(d.cfg, ch.Config, build, eventType)
	case models.ChannelWebhook:
		return sendWebhook(ch.Config, build, eventType)
	case models.ChannelWebPush:
		return d.sendWebPush(ctx, ch, build, eventType)
	}
	return nil
}

func (d *Dispatcher) processRetries() {
	ctx := context.Background()
	logs, err := d.store.GetPendingRetries(ctx, time.Now())
	if err != nil {
		slog.Error("dispatcher: get retries", "error", err)
		return
	}

	for _, log := range logs {
		ch, err := d.store.GetNotificationChannelByID(ctx, log.ChannelID)
		if err != nil || ch == nil {
			continue
		}
		build, err := d.store.GetBuildByID(ctx, log.BuildID)
		if err != nil || build == nil {
			continue
		}

		log.Attempts++
		if err := d.send(ctx, ch, build, log.EventType); err != nil {
			if log.Attempts >= maxRetries {
				log.Status = models.NotifDeadLetter
			} else {
				backoff := time.Duration(log.Attempts*log.Attempts*30) * time.Second
				next := time.Now().Add(backoff)
				log.NextRetryAt = &next
			}
		} else {
			log.Status = models.NotifSent
		}
		d.store.UpdateNotificationLog(ctx, &log)
	}
}

func (d *Dispatcher) sendWebPush(ctx context.Context, ch *models.NotificationChannel, build *models.Build, eventType string) error {
	members, err := d.store.ListProjectMembers(ctx, build.ProjectID)
	if err != nil {
		return err
	}
	var userIDs []int64
	for _, m := range members {
		userIDs = append(userIDs, m.UserID)
	}
	subs, err := d.store.ListPushSubscriptions(ctx, userIDs)
	if err != nil {
		return err
	}
	for _, sub := range subs {
		if err := sendPush(d.cfg, &sub, build, eventType); err != nil {
			slog.Warn("web push failed", "endpoint", sub.Endpoint, "error", err)
		}
	}
	return nil
}
