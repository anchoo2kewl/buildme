package provider

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/anchoo2kewl/buildme/internal/models"
)

type GitHubProvider struct{}

func (g *GitHubProvider) Type() models.ProviderType {
	return models.ProviderGitHub
}

func (g *GitHubProvider) FetchBuilds(ctx context.Context, cp *models.CIProvider) ([]models.Build, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/runs?per_page=10", cp.RepoOwner, cp.RepoName)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+cp.APIToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("github API %d: %s", resp.StatusCode, body)
	}

	var result struct {
		WorkflowRuns []ghWorkflowRun `json:"workflow_runs"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	builds := make([]models.Build, 0, len(result.WorkflowRuns))
	for _, run := range result.WorkflowRuns {
		b := models.Build{
			ProjectID:    cp.ProjectID,
			ProviderID:   cp.ID,
			ExternalID:   strconv.FormatInt(run.ID, 10),
			Status:       NormalizeGitHubStatus(run.Status, run.Conclusion),
			Branch:       run.HeadBranch,
			CommitSHA:    run.HeadSHA,
			CommitMessage: run.DisplayTitle,
			CommitAuthor: run.Actor.Login,
			Trigger:      run.Event,
			WorkflowName: run.Name,
			ProviderURL:  run.HTMLURL,
		}

		if !run.CreatedAt.IsZero() {
			t := run.CreatedAt
			b.StartedAt = &t
		}
		if !run.UpdatedAt.IsZero() && b.Status.IsTerminal() {
			t := run.UpdatedAt
			b.FinishedAt = &t
		}
		if b.StartedAt != nil && b.FinishedAt != nil {
			d := b.FinishedAt.Sub(*b.StartedAt).Milliseconds()
			b.DurationMS = &d
		}

		builds = append(builds, b)
	}
	return builds, nil
}

func (g *GitHubProvider) FetchJobs(ctx context.Context, cp *models.CIProvider, runID string) ([]models.BuildJob, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/runs/%s/jobs", cp.RepoOwner, cp.RepoName, runID)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+cp.APIToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("github jobs API %d: %s", resp.StatusCode, body)
	}

	var result struct {
		Jobs []struct {
			ID          int64     `json:"id"`
			Name        string    `json:"name"`
			Status      string    `json:"status"`
			Conclusion  string    `json:"conclusion"`
			StartedAt   time.Time `json:"started_at"`
			CompletedAt time.Time `json:"completed_at"`
		} `json:"jobs"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	jobs := make([]models.BuildJob, 0, len(result.Jobs))
	for _, j := range result.Jobs {
		job := models.BuildJob{
			ExternalID: strconv.FormatInt(j.ID, 10),
			Name:       j.Name,
			Status:     NormalizeGitHubStatus(j.Status, j.Conclusion),
		}
		if !j.StartedAt.IsZero() {
			t := j.StartedAt
			job.StartedAt = &t
		}
		if !j.CompletedAt.IsZero() {
			t := j.CompletedAt
			job.FinishedAt = &t
		}
		if job.StartedAt != nil && job.FinishedAt != nil {
			d := job.FinishedAt.Sub(*job.StartedAt).Milliseconds()
			job.DurationMS = &d
		}
		jobs = append(jobs, job)
	}
	return jobs, nil
}

func (g *GitHubProvider) ParseWebhook(r *http.Request, secret string) (*models.Build, []models.BuildJob, error) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, nil, err
	}

	event := r.Header.Get("X-GitHub-Event")
	if event != "workflow_run" && event != "workflow_job" {
		return nil, nil, fmt.Errorf("unsupported event: %s", event)
	}

	if event == "workflow_run" {
		var payload struct {
			WorkflowRun ghWorkflowRun `json:"workflow_run"`
		}
		if err := json.Unmarshal(body, &payload); err != nil {
			return nil, nil, err
		}
		run := payload.WorkflowRun
		b := &models.Build{
			ExternalID:    strconv.FormatInt(run.ID, 10),
			Status:        NormalizeGitHubStatus(run.Status, run.Conclusion),
			Branch:        run.HeadBranch,
			CommitSHA:     run.HeadSHA,
			CommitMessage: run.DisplayTitle,
			CommitAuthor:  run.Actor.Login,
			Trigger:       run.Event,
			WorkflowName:  run.Name,
			ProviderURL:   run.HTMLURL,
		}
		if !run.CreatedAt.IsZero() {
			t := run.CreatedAt
			b.StartedAt = &t
		}
		if !run.UpdatedAt.IsZero() && b.Status.IsTerminal() {
			t := run.UpdatedAt
			b.FinishedAt = &t
		}
		if b.StartedAt != nil && b.FinishedAt != nil {
			d := b.FinishedAt.Sub(*b.StartedAt).Milliseconds()
			b.DurationMS = &d
		}
		return b, nil, nil
	}

	// workflow_job
	var payload struct {
		WorkflowJob struct {
			ID          int64     `json:"id"`
			RunID       int64     `json:"run_id"`
			Name        string    `json:"name"`
			Status      string    `json:"status"`
			Conclusion  string    `json:"conclusion"`
			StartedAt   time.Time `json:"started_at"`
			CompletedAt time.Time `json:"completed_at"`
		} `json:"workflow_job"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, nil, err
	}
	job := payload.WorkflowJob
	j := models.BuildJob{
		ExternalID: strconv.FormatInt(job.ID, 10),
		Name:       job.Name,
		Status:     NormalizeGitHubStatus(job.Status, job.Conclusion),
	}
	if !job.StartedAt.IsZero() {
		t := job.StartedAt
		j.StartedAt = &t
	}
	if !job.CompletedAt.IsZero() {
		t := job.CompletedAt
		j.FinishedAt = &t
	}
	if j.StartedAt != nil && j.FinishedAt != nil {
		d := j.FinishedAt.Sub(*j.StartedAt).Milliseconds()
		j.DurationMS = &d
	}
	// Return a minimal build to find the parent
	b := &models.Build{ExternalID: strconv.FormatInt(job.RunID, 10)}
	return b, []models.BuildJob{j}, nil
}

func (g *GitHubProvider) VerifyWebhook(r *http.Request, secret string) bool {
	if secret == "" {
		return true
	}
	sig := r.Header.Get("X-Hub-Signature-256")
	if sig == "" {
		return false
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(sig), []byte(expected))
}

type ghWorkflowRun struct {
	ID           int64     `json:"id"`
	Name         string    `json:"name"`
	HeadBranch   string    `json:"head_branch"`
	HeadSHA      string    `json:"head_sha"`
	Status       string    `json:"status"`
	Conclusion   string    `json:"conclusion"`
	Event        string    `json:"event"`
	HTMLURL      string    `json:"html_url"`
	DisplayTitle string    `json:"display_title"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	Actor        struct {
		Login string `json:"login"`
	} `json:"actor"`
}
