package poller

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/anchoo2kewl/buildme/internal/config"
	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/notify"
	"github.com/anchoo2kewl/buildme/internal/provider"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/anchoo2kewl/buildme/internal/ws"
)

// fastPollInterval is used when a provider has running builds.
const fastPollInterval = 10 * time.Second

type Poller struct {
	store      store.Store
	registry   *provider.Registry
	hub        *ws.Hub
	dispatcher *notify.Dispatcher
	cfg        *config.Config
	stop       chan struct{}
}

func New(s store.Store, r *provider.Registry, h *ws.Hub, d *notify.Dispatcher, cfg *config.Config) *Poller {
	return &Poller{
		store:      s,
		registry:   r,
		hub:        h,
		dispatcher: d,
		cfg:        cfg,
		stop:       make(chan struct{}),
	}
}

func (p *Poller) Run() {
	ticker := time.NewTicker(p.cfg.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			p.tick()
		case <-p.stop:
			return
		}
	}
}

func (p *Poller) Stop() {
	close(p.stop)
}

func (p *Poller) tick() {
	ctx := context.Background()
	due, err := p.store.GetDueProviders(ctx, time.Now())
	if err != nil {
		slog.Error("poller: get due providers", "error", err)
		return
	}

	if len(due) == 0 {
		return
	}

	sem := make(chan struct{}, p.cfg.PollConcurrency)
	var wg sync.WaitGroup

	for _, cp := range due {
		cp := cp
		wg.Add(1)
		sem <- struct{}{}
		go func() {
			defer wg.Done()
			defer func() { <-sem }()
			p.pollProvider(ctx, &cp)
		}()
	}
	wg.Wait()
}

func (p *Poller) pollProvider(ctx context.Context, cp *models.CIProvider) {
	prov := p.registry.ForType(cp.ProviderType)
	if prov == nil {
		slog.Warn("poller: unknown provider type", "type", cp.ProviderType)
		return
	}

	// Set next poll to the normal interval; we may shorten it below.
	next := time.Now().Add(time.Duration(cp.PollIntervalS) * time.Second)
	if err := p.store.UpdateProviderNextPoll(ctx, cp.ID, next); err != nil {
		slog.Error("poller: update next poll", "error", err)
	}

	// Fall back to global GitHub API token if provider has no token
	if cp.APIToken == "" && p.cfg.GitHubAPIToken != "" {
		cp.APIToken = p.cfg.GitHubAPIToken
	}

	builds, err := prov.FetchBuilds(ctx, cp)
	if err != nil {
		slog.Error("poller: fetch builds", "provider_id", cp.ID, "error", err)
		return
	}

	hasRunning := false
	for i := range builds {
		p.processBuild(ctx, &builds[i])

		// For running builds, fetch and upsert jobs
		if builds[i].Status == models.BuildStatusRunning {
			hasRunning = true
			p.fetchAndUpsertJobs(ctx, prov, cp, &builds[i])
		}
	}

	// Adaptive polling: speed up this provider while it has running builds
	if hasRunning {
		fast := time.Now().Add(fastPollInterval)
		if err := p.store.UpdateProviderNextPoll(ctx, cp.ID, fast); err != nil {
			slog.Error("poller: update fast poll", "error", err)
		}
		slog.Debug("poller: fast poll for running build", "provider_id", cp.ID, "next_in", fastPollInterval)
	}
}

func (p *Poller) processBuild(ctx context.Context, build *models.Build) {
	oldBuild, _ := p.store.GetBuildByExternalID(ctx, build.ProviderID, build.ExternalID)
	oldStatus := models.BuildStatus("")
	if oldBuild != nil {
		oldStatus = oldBuild.Status
	}

	isNew, err := p.store.UpsertBuild(ctx, build)
	if err != nil {
		slog.Error("poller: upsert build", "error", err)
		return
	}

	// Determine event type
	var eventType string
	if isNew {
		eventType = "build.created"
	} else if oldStatus != build.Status {
		eventType = "build.updated"
		if build.Status.IsTerminal() {
			eventType = "build.completed"
		}
	} else {
		return // No change
	}

	// Broadcast via WebSocket
	p.hub.BroadcastBuildEvent(models.BuildEvent{
		Type:      eventType,
		ProjectID: build.ProjectID,
		Build:     build,
	})

	// Dispatch notifications for terminal builds
	if build.Status.IsTerminal() {
		p.dispatcher.Dispatch(ctx, build, oldStatus)
	}
}

func (p *Poller) fetchAndUpsertJobs(ctx context.Context, prov provider.Provider, cp *models.CIProvider, build *models.Build) {
	var jobs []models.BuildJob

	// Travis already includes jobs in the build response
	if len(build.Jobs) > 0 {
		jobs = build.Jobs
	} else if jf, ok := prov.(provider.JobFetcher); ok {
		var err error
		jobs, err = jf.FetchJobs(ctx, cp, build.ExternalID)
		if err != nil {
			slog.Error("poller: fetch jobs", "build_id", build.ID, "error", err)
			return
		}
	} else {
		return
	}

	changed := false
	for i := range jobs {
		jobs[i].BuildID = build.ID
		if err := p.store.UpsertBuildJob(ctx, &jobs[i]); err != nil {
			slog.Error("poller: upsert job", "error", err)
			continue
		}
		changed = true
	}

	if changed {
		build.Jobs = jobs
		p.hub.BroadcastBuildEvent(models.BuildEvent{
			Type:      "build.updated",
			ProjectID: build.ProjectID,
			Build:     build,
		})
	}
}

// ProcessBuild is exported for use by webhook handler.
func (p *Poller) ProcessBuild(ctx context.Context, build *models.Build) {
	p.processBuild(ctx, build)
}
