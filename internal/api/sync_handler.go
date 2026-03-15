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
	"sync"
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

// CancelBuild cancels a running build on the CI provider.
func (h *SyncHandler) CancelBuild(w http.ResponseWriter, r *http.Request) {
	buildID, _ := strconv.ParseInt(chi.URLParam(r, "buildId"), 10, 64)
	build, err := h.store.GetBuildByID(r.Context(), buildID)
	if err != nil || build == nil {
		jsonError(w, "build not found", http.StatusNotFound)
		return
	}

	if build.Status.IsTerminal() {
		jsonError(w, "build already finished", http.StatusBadRequest)
		return
	}

	prov, err := h.store.GetCIProviderByID(r.Context(), build.ProviderID)
	if err != nil || prov == nil {
		jsonError(w, "provider not found", http.StatusNotFound)
		return
	}

	switch prov.ProviderType {
	case models.ProviderGitHub:
		err = h.cancelGitHub(r.Context(), prov, build)
	case models.ProviderTravis:
		err = h.cancelTravis(r.Context(), prov, build)
	case models.ProviderCircleCI:
		err = h.cancelCircleCI(r.Context(), prov, build)
	default:
		jsonError(w, "unsupported provider", http.StatusBadRequest)
		return
	}

	if err != nil {
		slog.Error("cancel failed", "error", err, "build_id", buildID)
		jsonError(w, "cancel failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusOK, map[string]string{"message": "cancel requested"})
}

func (h *SyncHandler) cancelGitHub(ctx context.Context, prov *models.CIProvider, build *models.Build) error {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/runs/%s/cancel", prov.RepoOwner, prov.RepoName, build.ExternalID)
	return h.ghPost(ctx, url)
}

func (h *SyncHandler) cancelTravis(ctx context.Context, prov *models.CIProvider, build *models.Build) error {
	url := fmt.Sprintf("https://api.travis-ci.com/build/%s/cancel", build.ExternalID)
	req, _ := http.NewRequestWithContext(ctx, "POST", url, nil)
	req.Header.Set("Authorization", "token "+prov.APIToken)
	req.Header.Set("Travis-API-Version", "3")
	resp, err := h.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("travis API: %d", resp.StatusCode)
	}
	return nil
}

func (h *SyncHandler) cancelCircleCI(ctx context.Context, prov *models.CIProvider, build *models.Build) error {
	url := fmt.Sprintf("https://circleci.com/api/v2/workflow/%s/cancel", build.ExternalID)
	req, _ := http.NewRequestWithContext(ctx, "POST", url, nil)
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

// branchHeadResult holds the head commit info including parent and grandparent SHAs
// for merge-aware drift detection (covers main→UAT→production promotion chains).
type branchHeadResult struct {
	SHA             string
	Message         string
	Author          string
	ParentSHAs      []string
	GrandparentSHAs []string
}

func (h *SyncHandler) fetchBranchHead(ctx context.Context, owner, repo, branch string) (sha, message, author string, err error) {
	r, err := h.fetchBranchHeadFull(ctx, owner, repo, branch)
	if err != nil {
		return "", "", "", err
	}
	return r.SHA, r.Message, r.Author, nil
}

func (h *SyncHandler) fetchBranchHeadFull(ctx context.Context, owner, repo, branch string) (*branchHeadResult, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/commits/%s", owner, repo, branch)
	data, err := h.ghGet(ctx, url)
	if err != nil {
		return nil, err
	}
	var resp struct {
		SHA    string `json:"sha"`
		Commit struct {
			Message string `json:"message"`
			Author  struct {
				Name string `json:"name"`
			} `json:"author"`
		} `json:"commit"`
		Parents []struct {
			SHA string `json:"sha"`
		} `json:"parents"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, err
	}
	msg := resp.Commit.Message
	if idx := strings.Index(msg, "\n"); idx > 0 {
		msg = msg[:idx]
	}
	var parents []string
	for _, p := range resp.Parents {
		parents = append(parents, p.SHA)
	}

	// Fetch grandparent SHAs (1 level deeper) for merge-chain drift detection.
	// This handles the main→UAT→production promotion pattern where the deployed
	// SHA is 2 merge commits deep.
	var grandparents []string
	for _, p := range resp.Parents {
		gpURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/commits/%s", owner, repo, p.SHA)
		gpData, gpErr := h.ghGet(ctx, gpURL)
		if gpErr != nil {
			continue
		}
		var gpResp struct {
			Parents []struct {
				SHA string `json:"sha"`
			} `json:"parents"`
		}
		if json.Unmarshal(gpData, &gpResp) == nil {
			for _, gp := range gpResp.Parents {
				grandparents = append(grandparents, gp.SHA)
			}
		}
	}

	return &branchHeadResult{
		SHA:             resp.SHA,
		Message:         msg,
		Author:          resp.Commit.Author.Name,
		ParentSHAs:      parents,
		GrandparentSHAs: grandparents,
	}, nil
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

// shaMatchesHeadOrParent returns true if the deployed SHA matches the branch head
// or any of its parent commits (up to 2 levels deep). This handles image-promotion
// workflows where the deployed binary has the original build commit baked in, but
// the branch head is a merge commit whose parent (or grandparent) is that build commit.
// Depth 2 covers the common main→UAT→production promotion pattern.
func shaMatchesHeadOrParent(deployedShort, headShort string, parentSHAs []string, grandparentSHAs []string) bool {
	if deployedShort == headShort {
		return true
	}
	for _, parent := range parentSHAs {
		parentShort := parent
		if len(parentShort) > 7 {
			parentShort = parentShort[:7]
		}
		if deployedShort == parentShort {
			return true
		}
	}
	// Check grandparents (handles main→uat→production merge chains)
	for _, gp := range grandparentSHAs {
		gpShort := gp
		if len(gpShort) > 7 {
			gpShort = gpShort[:7]
		}
		if deployedShort == gpShort {
			return true
		}
	}
	return false
}

// DriftCheck fetches deployed versions and health from each project's environments.
func (h *SyncHandler) DriftCheck(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	projects, err := h.store.ListProjectsForUser(r.Context(), user.ID)
	if err != nil {
		jsonError(w, "failed to list projects", http.StatusInternalServerError)
		return
	}

	// Collect all environment checks to run concurrently
	type envCheck struct {
		project models.Project
		env     string
		baseURL string
	}
	var checks []envCheck
	for _, p := range projects {
		envURLs := map[string]string{
			"staging": p.StagingURL, "uat": p.UATURL, "production": p.ProductionURL,
		}
		for env, baseURL := range envURLs {
			if baseURL == "" {
				continue
			}
			checks = append(checks, envCheck{project: p, env: env, baseURL: baseURL})
		}
	}

	// Run all environment checks concurrently (bounded to 10 goroutines)
	results := make([]models.EnvironmentStatus, len(checks))
	sem := make(chan struct{}, 10)
	var wg sync.WaitGroup

	// Fetch branch HEADs per project (for drift detection)
	type branchKey struct {
		owner, repo, branch string
	}
	branchHeads := make(map[branchKey]*branchHeadResult)
	var branchMu sync.Mutex

	for i, chk := range checks {
		wg.Add(1)
		go func(idx int, c envCheck) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			es := models.EnvironmentStatus{
				ProjectID:   c.project.ID,
				ProjectName: c.project.Name,
				Env:         c.env,
				BaseURL:     c.baseURL,
				CheckedAt:   time.Now().UTC().Format(time.RFC3339),
			}

			versionPath := c.project.VersionPath
			if versionPath == "" {
				versionPath = "/api/version"
			}
			versionField := c.project.VersionField
			if versionField == "" {
				versionField = "git_commit"
			}

			versionURL := c.baseURL + versionPath
			versionData, sha := h.fetchVersionFull(r.Context(), versionURL, versionField, c.project, c.baseURL)
			es.VersionInfo = versionData
			es.DeployedSHA = sha

			healthPath := c.project.HealthPath
			if healthPath == "" {
				healthPath = "/health"
			}
			healthURL := c.baseURL + healthPath
			status, responseMS := h.checkHealthTimed(r.Context(), healthURL, c.project, c.baseURL)
			es.HealthStatus = status
			es.ResponseTimeMS = responseMS

			// Get branch HEAD for drift detection
			providers, _ := h.store.ListCIProviders(r.Context(), c.project.ID)
			if len(providers) > 0 && sha != "" {
				prov := providers[0]
				branch := "main"
				for b, e := range branchEnvMap {
					if e == c.env {
						branch = b
						break
					}
				}
				key := branchKey{prov.RepoOwner, prov.RepoName, branch}
				branchMu.Lock()
				headResult, exists := branchHeads[key]
				branchMu.Unlock()

				if !exists {
					result, err := h.fetchBranchHeadFull(r.Context(), prov.RepoOwner, prov.RepoName, branch)
					if err == nil {
						branchMu.Lock()
						branchHeads[key] = result
						branchMu.Unlock()
						headResult = result
					}
				}

				if headResult != nil && headResult.SHA != "" {
					es.BranchHeadSHA = headResult.SHA[:minLen(len(headResult.SHA), 7)]
					deployedShort := sha
					if len(deployedShort) > 7 {
						deployedShort = deployedShort[:7]
					}
					headShort := headResult.SHA[:minLen(len(headResult.SHA), 7)]
					// Check if deployed SHA matches head, parent, or grandparent (handles merge/promote flows)
					es.IsDrifted = !shaMatchesHeadOrParent(deployedShort, headShort, headResult.ParentSHAs, headResult.GrandparentSHAs)
				}
			}

			// Check MCP health if configured
			if c.project.Metadata != "" && c.project.Metadata != "{}" {
				var meta struct {
					MCPURLs       map[string]string `json:"mcp_urls"`
					MCPURL        string            `json:"mcp_url"`
					MCPHealthPath string            `json:"mcp_health_path"`
				}
				if json.Unmarshal([]byte(c.project.Metadata), &meta) == nil {
					mcpURL := meta.MCPURLs[c.env]
					if mcpURL == "" && c.env == "production" && meta.MCPURL != "" {
						mcpURL = meta.MCPURL
					}
					if mcpURL != "" {
						mcpHealthPath := meta.MCPHealthPath
						if mcpHealthPath == "" {
							mcpHealthPath = "/health"
						}
						mcpHealthURL := mcpURL + mcpHealthPath
						mcpStatus, mcpMS := h.checkHealthTimed(r.Context(), mcpHealthURL, c.project, c.baseURL)
						es.MCPHealthStatus = mcpStatus
						es.MCPResponseTimeMS = mcpMS
					}
				}
			}

			results[idx] = es
		}(i, chk)
	}
	wg.Wait()

	// Group results by project
	projectMap := make(map[int64]*models.DriftProject)
	projectOrder := make([]int64, 0)
	for _, p := range projects {
		projectMap[p.ID] = &models.DriftProject{Project: p}
		projectOrder = append(projectOrder, p.ID)
	}
	for _, es := range results {
		if dp, ok := projectMap[es.ProjectID]; ok {
			dp.Environments = append(dp.Environments, es)
		}
	}

	dashboard := models.DriftDashboard{}
	for _, pid := range projectOrder {
		dp := projectMap[pid]
		if len(dp.Environments) > 0 {
			dashboard.Projects = append(dashboard.Projects, *dp)
		}
	}

	jsonResp(w, http.StatusOK, dashboard)
}

// fetchVersionFull fetches the full version JSON and extracts the SHA field.
func (h *SyncHandler) fetchVersionFull(ctx context.Context, url, field string, project models.Project, baseURL string) (map[string]interface{}, string) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "BuildMe/1.0")
	addProjectHeaders(req, project, baseURL)
	h.addCfHeaders(req, baseURL)

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, ""
	}

	var data map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, ""
	}

	sha := extractField(data, field)
	return data, sha
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

// checkHealthTimed checks the health endpoint and returns status code + response time in ms.
func (h *SyncHandler) checkHealthTimed(ctx context.Context, url string, project models.Project, baseURL string) (int, int64) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("User-Agent", "BuildMe/1.0")
	addProjectHeaders(req, project, baseURL)
	h.addCfHeaders(req, baseURL)

	start := time.Now()
	resp, err := h.client.Do(req)
	elapsed := time.Since(start).Milliseconds()
	if err != nil {
		return 0, elapsed
	}
	resp.Body.Close()
	return resp.StatusCode, elapsed
}

// addProjectHeaders applies per-project custom headers from project metadata.
// Metadata format: {"custom_headers":{"staging":{"Header-Name":"value",...},...}}
func addProjectHeaders(req *http.Request, project models.Project, baseURL string) {
	if project.Metadata == "" || project.Metadata == "{}" {
		return
	}

	var meta struct {
		CustomHeaders map[string]map[string]string `json:"custom_headers"`
	}
	if err := json.Unmarshal([]byte(project.Metadata), &meta); err != nil || meta.CustomHeaders == nil {
		return
	}

	// Determine environment from URL
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

// addCfHeaders adds Cloudflare Access headers for staging/UAT URLs.
func (h *SyncHandler) addCfHeaders(req *http.Request, baseURL string) {
	if h.cfg.CfAccessClientID == "" || h.cfg.CfAccessClientSecret == "" {
		return
	}
	if strings.Contains(baseURL, "staging.") || strings.Contains(baseURL, "uat.") {
		req.Header.Set("CF-Access-Client-Id", h.cfg.CfAccessClientID)
		req.Header.Set("CF-Access-Client-Secret", h.cfg.CfAccessClientSecret)
	}
}
