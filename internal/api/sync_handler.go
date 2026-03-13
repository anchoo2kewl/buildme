package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/anchoo2kewl/buildme/internal/config"
	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/notify"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/go-chi/chi/v5"
)

type SyncHandler struct {
	store      store.Store
	cfg        *config.Config
	client     *http.Client
	dispatcher *notify.Dispatcher
}

// Branch-to-environment mapping
var branchEnvMap = map[string]string{
	"main":       "staging",
	"uat":        "uat",
	"production": "production",
}

// SyncAll fetches latest builds for all projects across all branches.
func (h *SyncHandler) SyncAll(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	projects, err := h.store.ListProjectsForUser(r.Context(), user.ID)
	if err != nil {
		jsonError(w, "failed to list projects", http.StatusInternalServerError)
		return
	}

	type projectResult struct {
		Project  models.Project           `json:"project"`
		Branches map[string]*BranchStatus `json:"branches"`
	}

	results := make([]projectResult, 0, len(projects))
	for _, p := range projects {
		providers, err := h.store.ListCIProviders(r.Context(), p.ID)
		if err != nil || len(providers) == 0 {
			continue
		}
		prov := providers[0]
		branches := h.syncProjectBranches(r.Context(), p, prov)
		results = append(results, projectResult{Project: p, Branches: branches})
	}

	jsonResp(w, http.StatusOK, results)
}

// SyncProject fetches latest builds for one project.
func (h *SyncHandler) SyncProject(w http.ResponseWriter, r *http.Request) {
	projectID, _ := strconv.ParseInt(chi.URLParam(r, "projectId"), 10, 64)
	project, err := h.store.GetProjectByID(r.Context(), projectID)
	if err != nil || project == nil {
		jsonError(w, "project not found", http.StatusNotFound)
		return
	}
	providers, err := h.store.ListCIProviders(r.Context(), projectID)
	if err != nil || len(providers) == 0 {
		jsonError(w, "no providers configured", http.StatusBadRequest)
		return
	}

	prov := providers[0]
	branches := h.syncProjectBranches(r.Context(), *project, prov)
	jsonResp(w, http.StatusOK, branches)
}

// Dashboard returns the latest build per project per branch from the DB (no sync).
func (h *SyncHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	projects, err := h.store.ListProjectsForUser(r.Context(), user.ID)
	if err != nil {
		jsonError(w, "failed to list projects", http.StatusInternalServerError)
		return
	}

	type dashEntry struct {
		Project models.Project `json:"project"`
		Builds  []models.Build `json:"builds"`
	}

	branches := []string{"main", "uat", "production"}
	results := make([]dashEntry, 0, len(projects))
	for _, p := range projects {
		var allBuilds []models.Build
		for _, branch := range branches {
			builds, _, _ := h.store.ListBuilds(r.Context(), p.ID, models.BuildFilter{
				Branch:     branch,
				Pagination: models.Pagination{Page: 1, PerPage: 1},
			})
			if len(builds) > 0 {
				jobs, _ := h.store.ListBuildJobs(r.Context(), builds[0].ID)
				if jobs == nil {
					jobs = []models.BuildJob{}
				}
				builds[0].Jobs = jobs
				allBuilds = append(allBuilds, builds[0])
			}
		}
		if allBuilds == nil {
			allBuilds = []models.Build{}
		}
		results = append(results, dashEntry{Project: p, Builds: allBuilds})
	}
	jsonResp(w, http.StatusOK, results)
}

// RetriggerBuild re-runs a build on the CI provider.
func (h *SyncHandler) RetriggerBuild(w http.ResponseWriter, r *http.Request) {
	buildID, _ := strconv.ParseInt(chi.URLParam(r, "buildId"), 10, 64)
	build, err := h.store.GetBuildByID(r.Context(), buildID)
	if err != nil || build == nil {
		jsonError(w, "build not found", http.StatusNotFound)
		return
	}

	prov, err := h.store.GetCIProviderByID(r.Context(), build.ProviderID)
	if err != nil || prov == nil {
		jsonError(w, "provider not found", http.StatusNotFound)
		return
	}

	switch prov.ProviderType {
	case models.ProviderGitHub, models.ProviderTravis:
		err = h.retriggerCheckSuites(r.Context(), prov, build)
	case models.ProviderCircleCI:
		err = h.retriggerCircleCI(r.Context(), prov, build)
	default:
		jsonError(w, "unsupported provider", http.StatusBadRequest)
		return
	}

	if err != nil {
		slog.Error("retrigger failed", "error", err, "build_id", buildID)
		jsonError(w, "retrigger failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusOK, map[string]string{"message": "retrigger requested"})
}

func (h *SyncHandler) retriggerCheckSuites(ctx context.Context, prov *models.CIProvider, build *models.Build) error {
	// Get check suites for the commit
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/commits/%s/check-suites", prov.RepoOwner, prov.RepoName, build.CommitSHA)
	data, err := h.ghGet(ctx, url)
	if err != nil {
		return fmt.Errorf("fetch check suites: %w", err)
	}

	var resp struct {
		CheckSuites []struct {
			ID int64 `json:"id"`
		} `json:"check_suites"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	// Re-request each check suite
	for _, cs := range resp.CheckSuites {
		rerunURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/check-suites/%d/rerequest", prov.RepoOwner, prov.RepoName, cs.ID)
		if err := h.ghPost(ctx, rerunURL); err != nil {
			slog.Warn("retrigger check suite failed", "suite_id", cs.ID, "error", err)
		}
	}
	return nil
}

func (h *SyncHandler) retriggerCircleCI(ctx context.Context, prov *models.CIProvider, build *models.Build) error {
	url := fmt.Sprintf("https://circleci.com/api/v2/project/gh/%s/%s/pipeline", prov.RepoOwner, prov.RepoName)
	body := fmt.Sprintf(`{"branch":"%s"}`, build.Branch)

	req, _ := http.NewRequestWithContext(ctx, "POST", url, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if prov.APIToken != "" {
		req.Header.Set("Circle-Token", prov.APIToken)
	}
	resp, err := h.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("circleci API: %d", resp.StatusCode)
	}
	return nil
}

func (h *SyncHandler) ghPost(ctx context.Context, url string) error {
	req, _ := http.NewRequestWithContext(ctx, "POST", url, nil)
	req.Header.Set("Accept", "application/vnd.github+json")
	if h.cfg.GitHubAPIToken != "" {
		req.Header.Set("Authorization", "Bearer "+h.cfg.GitHubAPIToken)
	}
	resp, err := h.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("github api: %d", resp.StatusCode)
	}
	return nil
}

// BranchStatus holds the build info for one branch.
type BranchStatus struct {
	Branch    string          `json:"branch"`
	Env       string          `json:"env"`
	CommitSHA string          `json:"commit_sha"`
	Build     *models.Build   `json:"build,omitempty"`
	Jobs      []models.BuildJob `json:"jobs,omitempty"`
	Error     string          `json:"error,omitempty"`
}

func (h *SyncHandler) syncProjectBranches(ctx context.Context, project models.Project, prov models.CIProvider) map[string]*BranchStatus {
	result := make(map[string]*BranchStatus)
	branches := []string{"main", "uat", "production"}

	for _, branch := range branches {
		bs := &BranchStatus{Branch: branch, Env: branchEnvMap[branch]}

		// Get latest commit SHA for this branch
		sha, commitMsg, commitAuthor, err := h.fetchBranchHead(ctx, prov.RepoOwner, prov.RepoName, branch)
		if err != nil {
			bs.Error = fmt.Sprintf("branch not found: %s", branch)
			result[branch] = bs
			continue
		}
		bs.CommitSHA = sha[:minLen(len(sha), 7)]

		// Fetch check-runs (Travis CI, GitHub Actions)
		checkRuns, _ := h.fetchCheckRuns(ctx, prov.RepoOwner, prov.RepoName, sha)

		// Fetch commit statuses (CircleCI)
		statuses, _ := h.fetchStatuses(ctx, prov.RepoOwner, prov.RepoName, sha)

		// Pick the relevant CI data based on provider type
		var build *models.Build
		var jobs []models.BuildJob

		switch prov.ProviderType {
		case models.ProviderGitHub:
			build, jobs = h.mapCheckRunsToBuild(checkRuns, project.ID, prov.ID, sha, branch, commitMsg, commitAuthor)
			// Override overall status with workflow-run conclusion (handles continue-on-error jobs)
			wfRuns, _ := h.fetchWorkflowRuns(ctx, prov.RepoOwner, prov.RepoName, sha)
			if build != nil && len(wfRuns) > 0 {
				// Prefer deploy workflow if multiple workflows exist
				chosen := wfRuns[0]
				for _, wr := range wfRuns {
					if strings.Contains(strings.ToLower(wr.Name), "deploy") {
						chosen = wr
						break
					}
				}
				build.Status = mapCheckRunStatus(chosen.Status, chosen.Conclusion)
				if chosen.HTMLURL != "" {
					build.ProviderURL = chosen.HTMLURL
				}
			}
		case models.ProviderTravis:
			build, jobs = h.mapCheckRunsToBuild(checkRuns, project.ID, prov.ID, sha, branch, commitMsg, commitAuthor)
		case models.ProviderCircleCI:
			build, jobs = h.mapStatusesToBuild(statuses, checkRuns, project.ID, prov.ID, sha, branch, commitMsg, commitAuthor)
		}

		if build != nil {
			// Check old status for notification dispatch
			oldBuild, _ := h.store.GetBuildByExternalID(ctx, build.ProviderID, build.ExternalID)
			oldStatus := models.BuildStatus("")
			if oldBuild != nil {
				oldStatus = oldBuild.Status
			}

			// Upsert the build
			_, err := h.store.UpsertBuild(ctx, build)
			if err != nil {
				slog.Error("failed to upsert build", "error", err, "project", project.ID, "branch", branch)
			}

			// Upsert jobs
			for i := range jobs {
				jobs[i].BuildID = build.ID
				h.store.UpsertBuildJob(ctx, &jobs[i])
			}

			// Dispatch notifications for terminal builds
			if h.dispatcher != nil && build.Status.IsTerminal() && oldStatus != build.Status {
				h.dispatcher.Dispatch(ctx, build, oldStatus)
			}

			// Re-fetch jobs from DB to get IDs
			dbJobs, _ := h.store.ListBuildJobs(ctx, build.ID)
			bs.Build = build
			bs.Jobs = dbJobs
		}

		result[branch] = bs
	}

	return result
}

// GitHub API helpers

func (h *SyncHandler) ghGet(ctx context.Context, url string) ([]byte, error) {
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("Accept", "application/vnd.github+json")
	if h.cfg.GitHubAPIToken != "" {
		req.Header.Set("Authorization", "Bearer "+h.cfg.GitHubAPIToken)
	}
	resp, err := h.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("github api: %d", resp.StatusCode)
	}
	return io.ReadAll(resp.Body)
}

func (h *SyncHandler) fetchBranchHead(ctx context.Context, owner, repo, branch string) (sha, message, author string, err error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/commits/%s", owner, repo, branch)
	data, err := h.ghGet(ctx, url)
	if err != nil {
		return "", "", "", err
	}
	var resp struct {
		SHA    string `json:"sha"`
		Commit struct {
			Message string `json:"message"`
			Author  struct {
				Name string `json:"name"`
			} `json:"author"`
		} `json:"commit"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return "", "", "", err
	}
	msg := resp.Commit.Message
	if idx := strings.Index(msg, "\n"); idx > 0 {
		msg = msg[:idx]
	}
	return resp.SHA, msg, resp.Commit.Author.Name, nil
}

type ghCheckRun struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	Status      string  `json:"status"`
	Conclusion  *string `json:"conclusion"`
	StartedAt   *string `json:"started_at"`
	CompletedAt *string `json:"completed_at"`
	HTMLURL     string  `json:"html_url"`
	App         struct {
		Name string `json:"name"`
	} `json:"app"`
}

func (h *SyncHandler) fetchCheckRuns(ctx context.Context, owner, repo, sha string) ([]ghCheckRun, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/commits/%s/check-runs", owner, repo, sha)
	data, err := h.ghGet(ctx, url)
	if err != nil {
		return nil, err
	}
	var resp struct {
		CheckRuns []ghCheckRun `json:"check_runs"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, err
	}
	return resp.CheckRuns, nil
}

type ghStatus struct {
	State     string `json:"state"`
	Context   string `json:"context"`
	TargetURL string `json:"target_url"`
	UpdatedAt string `json:"updated_at"`
	CreatedAt string `json:"created_at"`
}

type syncWorkflowRun struct {
	ID         int64   `json:"id"`
	Name       string  `json:"name"`
	Status     string  `json:"status"`
	Conclusion *string `json:"conclusion"`
	HTMLURL    string  `json:"html_url"`
}

func (h *SyncHandler) fetchStatuses(ctx context.Context, owner, repo, sha string) ([]ghStatus, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/commits/%s/statuses", owner, repo, sha)
	data, err := h.ghGet(ctx, url)
	if err != nil {
		return nil, err
	}
	var statuses []ghStatus
	if err := json.Unmarshal(data, &statuses); err != nil {
		return nil, err
	}
	return statuses, nil
}

func (h *SyncHandler) fetchWorkflowRuns(ctx context.Context, owner, repo, sha string) ([]syncWorkflowRun, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/runs?head_sha=%s&per_page=5", owner, repo, sha)
	data, err := h.ghGet(ctx, url)
	if err != nil {
		return nil, err
	}
	var resp struct {
		WorkflowRuns []syncWorkflowRun `json:"workflow_runs"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, err
	}
	return resp.WorkflowRuns, nil
}

// Mapping helpers

func (h *SyncHandler) mapCheckRunsToBuild(runs []ghCheckRun, projectID, providerID int64, sha, branch, commitMsg, commitAuthor string) (*models.Build, []models.BuildJob) {
	if len(runs) == 0 {
		return nil, nil
	}

	// Overall build status: use the last (most recent) check run for the aggregate
	// but also look at all runs for the worst status
	overallStatus := models.BuildStatusSuccess
	var earliestStart, latestEnd *time.Time
	var providerURL string

	jobs := make([]models.BuildJob, 0, len(runs))

	for _, cr := range runs {
		jobStatus := mapCheckRunStatus(cr.Status, cr.Conclusion)

		var startedAt, completedAt *time.Time
		if cr.StartedAt != nil {
			t, _ := time.Parse(time.RFC3339, *cr.StartedAt)
			startedAt = &t
		}
		if cr.CompletedAt != nil {
			t, _ := time.Parse(time.RFC3339, *cr.CompletedAt)
			completedAt = &t
		}

		var durationMS *int64
		if startedAt != nil && completedAt != nil {
			d := completedAt.Sub(*startedAt).Milliseconds()
			durationMS = &d
		}

		// Track earliest start and latest end
		if startedAt != nil && (earliestStart == nil || startedAt.Before(*earliestStart)) {
			earliestStart = startedAt
		}
		if completedAt != nil && (latestEnd == nil || completedAt.After(*latestEnd)) {
			latestEnd = completedAt
		}

		// Worst status wins
		if statusPriority(jobStatus) > statusPriority(overallStatus) {
			overallStatus = jobStatus
		}

		if providerURL == "" && cr.HTMLURL != "" {
			providerURL = cr.HTMLURL
		}

		jobs = append(jobs, models.BuildJob{
			ExternalID: fmt.Sprintf("%d", cr.ID),
			Name:       cr.Name,
			Status:     jobStatus,
			DurationMS: durationMS,
			StartedAt:  startedAt,
			FinishedAt: completedAt,
		})
	}

	var totalDuration *int64
	if earliestStart != nil && latestEnd != nil {
		d := latestEnd.Sub(*earliestStart).Milliseconds()
		totalDuration = &d
	}

	build := &models.Build{
		ProjectID:     projectID,
		ProviderID:    providerID,
		ExternalID:    sha[:minLen(len(sha), 12)],
		Status:        overallStatus,
		Branch:        branch,
		CommitSHA:     sha,
		CommitMessage: commitMsg,
		CommitAuthor:  commitAuthor,
		DurationMS:    totalDuration,
		StartedAt:     earliestStart,
		FinishedAt:    latestEnd,
		ProviderURL:   providerURL,
	}

	return build, jobs
}

func (h *SyncHandler) mapStatusesToBuild(statuses []ghStatus, checkRuns []ghCheckRun, projectID, providerID int64, sha, branch, commitMsg, commitAuthor string) (*models.Build, []models.BuildJob) {
	// If there are check-runs, prefer those (CircleCI sometimes also uses check-runs)
	if len(checkRuns) > 0 {
		return h.mapCheckRunsToBuild(checkRuns, projectID, providerID, sha, branch, commitMsg, commitAuthor)
	}

	if len(statuses) == 0 {
		return nil, nil
	}

	// Group statuses by context, take the most recent for each
	latest := make(map[string]ghStatus)
	for _, s := range statuses {
		if existing, ok := latest[s.Context]; !ok || s.UpdatedAt > existing.UpdatedAt {
			latest[s.Context] = s
		}
	}

	overallStatus := models.BuildStatusSuccess
	var earliestStart, latestEnd *time.Time
	var providerURL string

	jobs := make([]models.BuildJob, 0, len(latest))

	for ctx, s := range latest {
		jobStatus := mapGHStateToStatus(s.State)

		t, _ := time.Parse(time.RFC3339, s.CreatedAt)
		startedAt := &t
		t2, _ := time.Parse(time.RFC3339, s.UpdatedAt)
		endedAt := &t2

		var durationMS *int64
		if !t.IsZero() && !t2.IsZero() {
			d := t2.Sub(t).Milliseconds()
			durationMS = &d
		}

		if startedAt != nil && (earliestStart == nil || startedAt.Before(*earliestStart)) {
			earliestStart = startedAt
		}
		if endedAt != nil && (latestEnd == nil || endedAt.After(*latestEnd)) {
			latestEnd = endedAt
		}

		if statusPriority(jobStatus) > statusPriority(overallStatus) {
			overallStatus = jobStatus
		}
		if providerURL == "" {
			providerURL = s.TargetURL
		}

		jobs = append(jobs, models.BuildJob{
			ExternalID: ctx,
			Name:       ctx,
			Status:     jobStatus,
			DurationMS: durationMS,
			StartedAt:  startedAt,
			FinishedAt: endedAt,
		})
	}

	var totalDuration *int64
	if earliestStart != nil && latestEnd != nil {
		d := latestEnd.Sub(*earliestStart).Milliseconds()
		totalDuration = &d
	}

	build := &models.Build{
		ProjectID:     projectID,
		ProviderID:    providerID,
		ExternalID:    sha[:minLen(len(sha), 12)],
		Status:        overallStatus,
		Branch:        branch,
		CommitSHA:     sha,
		CommitMessage: commitMsg,
		CommitAuthor:  commitAuthor,
		DurationMS:    totalDuration,
		StartedAt:     earliestStart,
		FinishedAt:    latestEnd,
		ProviderURL:   providerURL,
	}

	return build, jobs
}

func mapCheckRunStatus(status string, conclusion *string) models.BuildStatus {
	switch status {
	case "queued":
		return models.BuildStatusQueued
	case "in_progress":
		return models.BuildStatusRunning
	case "completed":
		if conclusion == nil {
			return models.BuildStatusError
		}
		switch *conclusion {
		case "success":
			return models.BuildStatusSuccess
		case "failure":
			return models.BuildStatusFailure
		case "cancelled":
			return models.BuildStatusCancelled
		case "timed_out":
			return models.BuildStatusError
		case "skipped":
			return models.BuildStatusSkipped
		default:
			return models.BuildStatusError
		}
	}
	return models.BuildStatusQueued
}

func mapGHStateToStatus(state string) models.BuildStatus {
	switch state {
	case "success":
		return models.BuildStatusSuccess
	case "failure", "error":
		return models.BuildStatusFailure
	case "pending":
		return models.BuildStatusRunning
	default:
		return models.BuildStatusQueued
	}
}

func statusPriority(s models.BuildStatus) int {
	switch s {
	case models.BuildStatusSuccess, models.BuildStatusSkipped:
		return 0
	case models.BuildStatusQueued:
		return 1
	case models.BuildStatusRunning:
		return 2
	case models.BuildStatusCancelled:
		return 3
	case models.BuildStatusError:
		return 4
	case models.BuildStatusFailure:
		return 5
	}
	return 0
}

func minLen(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// DriftCheck fetches deployed versions from each project's version endpoint.
func (h *SyncHandler) DriftCheck(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	projects, err := h.store.ListProjectsForUser(r.Context(), user.ID)
	if err != nil {
		jsonError(w, "failed to list projects", http.StatusInternalServerError)
		return
	}

	type driftResult struct {
		ProjectID   int64  `json:"project_id"`
		Env         string `json:"env"`
		DeployedSHA string `json:"deployed_sha"`
		Health      int    `json:"health"`
	}

	var results []driftResult
	for _, p := range projects {
		envURLs := map[string]string{
			"staging": p.StagingURL, "uat": p.UATURL, "production": p.ProductionURL,
		}
		for env, baseURL := range envURLs {
			if baseURL == "" {
				continue
			}
			dr := driftResult{ProjectID: p.ID, Env: env}

			versionPath := p.VersionPath
			if versionPath == "" {
				versionPath = "/api/version"
			}
			versionField := p.VersionField
			if versionField == "" {
				versionField = "git_commit"
			}
			dr.DeployedSHA = h.fetchDeployedVersion(r.Context(), baseURL+versionPath, versionField)

			healthPath := p.HealthPath
			if healthPath == "" {
				healthPath = "/health"
			}
			dr.Health = h.checkHealth(r.Context(), baseURL+healthPath)

			results = append(results, dr)
		}
	}

	jsonResp(w, http.StatusOK, results)
}

func (h *SyncHandler) fetchDeployedVersion(ctx context.Context, url, field string) string {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "BuildMe/1.0")

	resp, err := h.client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return ""
	}

	var data map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return ""
	}

	return extractField(data, field)
}

func extractField(data map[string]interface{}, path string) string {
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

func (h *SyncHandler) checkHealth(ctx context.Context, url string) int {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("User-Agent", "BuildMe/1.0")

	resp, err := h.client.Do(req)
	if err != nil {
		return 0
	}
	resp.Body.Close()
	return resp.StatusCode
}
