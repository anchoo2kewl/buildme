package poller

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/anchoo2kewl/buildme/internal/config"
	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/anchoo2kewl/buildme/internal/ws"
)

const (
	defaultVersionPollMin = 60 // minutes — overridable per project via metadata.version_poll_interval_m
	activeInterval        = 5 * time.Minute
	tickInterval          = 5 * time.Minute // how often the loop wakes to check
	snapshotPruneAge      = 7 * 24 * time.Hour
	metricPruneAge        = 24 * time.Hour
	incidentPruneAge      = 7 * 24 * time.Hour
)

type VersionPoller struct {
	store    store.Store
	cfg      *config.Config
	hub      *ws.Hub
	client   *http.Client
	stop     chan struct{}
	lastPoll map[string]time.Time // key: "projectID:env"
}

func NewVersionPoller(s store.Store, cfg *config.Config, hub *ws.Hub) *VersionPoller {
	return &VersionPoller{
		store:    s,
		cfg:      cfg,
		hub:      hub,
		client:   &http.Client{Timeout: 10 * time.Second},
		stop:     make(chan struct{}),
		lastPoll: make(map[string]time.Time),
	}
}

func (vp *VersionPoller) Run() {
	// Initial tick after a short delay
	timer := time.NewTimer(10 * time.Second)
	defer timer.Stop()

	lastPrune := time.Time{}

	for {
		select {
		case <-timer.C:
			vp.tick()

			// Pruning: snapshots daily, metrics every tick (24h), incidents daily (7d)
			ctx := context.Background()
			if time.Since(lastPrune) > 24*time.Hour {
				cutoff := time.Now().Add(-snapshotPruneAge)
				if err := vp.store.PruneVersionSnapshots(ctx, cutoff); err != nil {
					slog.Error("version-poller: prune snapshots failed", "error", err)
				}
				incidentCutoff := time.Now().Add(-incidentPruneAge)
				if err := vp.store.PruneResourceIncidents(ctx, incidentCutoff); err != nil {
					slog.Error("version-poller: prune incidents failed", "error", err)
				}
				lastPrune = time.Now()
			}
			// Metric points: prune every tick (cheap indexed delete, 24h retention)
			metricCutoff := time.Now().Add(-metricPruneAge)
			if err := vp.store.PruneMetricPoints(ctx, metricCutoff); err != nil {
				slog.Error("version-poller: prune metrics failed", "error", err)
			}

			timer.Reset(tickInterval)

		case <-vp.stop:
			return
		}
	}
}

func (vp *VersionPoller) Stop() {
	close(vp.stop)
}

// projectPollInterval returns the configured version poll interval for a project,
// reading metadata.version_poll_interval_m. Falls back to defaultVersionPollMin.
func projectPollInterval(p models.Project) time.Duration {
	if p.Metadata == "" || p.Metadata == "{}" {
		return time.Duration(defaultVersionPollMin) * time.Minute
	}
	var meta struct {
		VersionPollIntervalM int `json:"version_poll_interval_m"`
	}
	if err := json.Unmarshal([]byte(p.Metadata), &meta); err != nil || meta.VersionPollIntervalM <= 0 {
		return time.Duration(defaultVersionPollMin) * time.Minute
	}
	return time.Duration(meta.VersionPollIntervalM) * time.Minute
}

func (vp *VersionPoller) tick() {
	ctx := context.Background()
	projects, err := vp.store.ListAllProjects(ctx)
	if err != nil {
		slog.Error("version-poller: list projects", "error", err)
		return
	}

	type envCheck struct {
		project models.Project
		env     string
		baseURL string
	}

	now := time.Now()
	var checks []envCheck
	for _, p := range projects {
		interval := projectPollInterval(p)
		envURLs := map[string]string{
			"staging":    p.StagingURL,
			"uat":        p.UATURL,
			"production": p.ProductionURL,
		}
		for env, url := range envURLs {
			if url == "" {
				continue
			}
			key := fmt.Sprintf("%d:%s", p.ID, env)
			if last, ok := vp.lastPoll[key]; ok && now.Sub(last) < interval {
				continue // skip, not yet due
			}
			checks = append(checks, envCheck{project: p, env: env, baseURL: url})
		}
	}

	if len(checks) == 0 {
		return
	}

	sem := make(chan struct{}, 10)
	var wg sync.WaitGroup

	for _, chk := range checks {
		wg.Add(1)
		go func(c envCheck) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			vp.checkEnv(ctx, c.project, c.env, c.baseURL)
			key := fmt.Sprintf("%d:%s", c.project.ID, c.env)
			vp.lastPoll[key] = time.Now()
		}(chk)
	}
	wg.Wait()
}

func (vp *VersionPoller) checkEnv(ctx context.Context, project models.Project, env, baseURL string) {
	versionPath := project.VersionPath
	if versionPath == "" {
		versionPath = "/api/version"
	}
	versionField := project.VersionField
	if versionField == "" {
		versionField = "git_commit"
	}

	// Fetch version
	versionURL := baseURL + versionPath
	versionData, sha := vp.fetchVersion(ctx, versionURL, versionField, project, baseURL)

	// Fetch health
	healthPath := project.HealthPath
	if healthPath == "" {
		healthPath = "/health"
	}
	healthURL := baseURL + healthPath
	healthStatus, responseMS := vp.checkHealth(ctx, healthURL, project, baseURL)

	// Marshal version data
	versionJSON := "{}"
	if versionData != nil {
		if b, err := json.Marshal(versionData); err == nil {
			versionJSON = string(b)
		}
	}

	// Get previous snapshot to detect SHA changes
	prev, _ := vp.store.GetLatestVersionSnapshot(ctx, project.ID, env)
	prevSHA := ""
	if prev != nil {
		prevSHA = prev.DeployedSHA
	}

	snap := &models.VersionSnapshot{
		ProjectID:      project.ID,
		Env:            env,
		VersionInfo:    versionJSON,
		DeployedSHA:    sha,
		HealthStatus:   healthStatus,
		ResponseTimeMS: responseMS,
	}

	if err := vp.store.CreateVersionSnapshot(ctx, snap); err != nil {
		slog.Error("version-poller: save snapshot", "error", err, "project", project.Name, "env", env)
		return
	}

	// Broadcast version.updated if SHA changed
	if sha != "" && prevSHA != "" && sha != prevSHA {
		vp.hub.BroadcastVersionEvent(models.BuildEvent{
			Type:      "version.updated",
			ProjectID: project.ID,
		})
		slog.Info("version-poller: SHA changed",
			"project", project.Name, "env", env,
			"old_sha", prevSHA[:minLen(len(prevSHA), 7)],
			"new_sha", sha[:minLen(len(sha), 7)])
	}
}

func (vp *VersionPoller) fetchVersion(ctx context.Context, url, field string, project models.Project, baseURL string) (map[string]interface{}, string) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "BuildMe/1.0")
	applyProjectHeaders(req, project, baseURL)
	vp.applyCfHeaders(req, baseURL)

	resp, err := vp.client.Do(req)
	if err != nil {
		return nil, ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, ""
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, ""
	}

	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, ""
	}

	sha := extractNestedField(data, field)
	return data, sha
}

func (vp *VersionPoller) checkHealth(ctx context.Context, url string, project models.Project, baseURL string) (int, int64) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("User-Agent", "BuildMe/1.0")
	applyProjectHeaders(req, project, baseURL)
	vp.applyCfHeaders(req, baseURL)

	start := time.Now()
	resp, err := vp.client.Do(req)
	elapsed := time.Since(start).Milliseconds()
	if err != nil {
		return 0, elapsed
	}
	resp.Body.Close()
	return resp.StatusCode, elapsed
}

// applyProjectHeaders reads custom_headers from project metadata and sets them.
func applyProjectHeaders(req *http.Request, project models.Project, baseURL string) {
	if project.Metadata == "" || project.Metadata == "{}" {
		return
	}

	var meta struct {
		CustomHeaders map[string]map[string]string `json:"custom_headers"`
	}
	if err := json.Unmarshal([]byte(project.Metadata), &meta); err != nil || meta.CustomHeaders == nil {
		return
	}

	env := ""
	envURLs := map[string]string{
		"staging":    project.StagingURL,
		"uat":        project.UATURL,
		"production": project.ProductionURL,
	}
	for e, u := range envURLs {
		if u != "" && strings.HasPrefix(baseURL, u) {
			env = e
			break
		}
	}
	if env == "" {
		return
	}

	headers, ok := meta.CustomHeaders[env]
	if !ok {
		return
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
}

func (vp *VersionPoller) applyCfHeaders(req *http.Request, baseURL string) {
	if vp.cfg.CfAccessClientID == "" || vp.cfg.CfAccessClientSecret == "" {
		return
	}
	if strings.Contains(baseURL, "staging.") || strings.Contains(baseURL, "uat.") {
		req.Header.Set("CF-Access-Client-Id", vp.cfg.CfAccessClientID)
		req.Header.Set("CF-Access-Client-Secret", vp.cfg.CfAccessClientSecret)
	}
}

func extractNestedField(data map[string]interface{}, path string) string {
	parts := strings.Split(path, ".")
	current := interface{}(data)
	for _, part := range parts {
		m, ok := current.(map[string]interface{})
		if !ok {
			return ""
		}
		current = m[part]
	}
	s, ok := current.(string)
	if !ok {
		return ""
	}
	return s
}

func minLen(a, b int) int {
	if a < b {
		return a
	}
	return b
}
