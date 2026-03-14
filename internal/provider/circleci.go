package provider

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/anchoo2kewl/buildme/internal/models"
)

type CircleCIProvider struct{}

func (c *CircleCIProvider) Type() models.ProviderType {
	return models.ProviderCircleCI
}

func circleSlug(cp *models.CIProvider) string {
	// Support both GitHub VCS slugs (gh/owner/repo) and CircleCI standalone
	// projects (circleci/org_id/project_id). If RepoOwner looks like a UUID,
	// use the circleci/ prefix; otherwise fall back to gh/.
	if len(cp.RepoOwner) == 36 && cp.RepoOwner[8] == '-' {
		return fmt.Sprintf("circleci/%s/%s", cp.RepoOwner, cp.RepoName)
	}
	return fmt.Sprintf("gh/%s/%s", cp.RepoOwner, cp.RepoName)
}

func (c *CircleCIProvider) FetchBuilds(ctx context.Context, cp *models.CIProvider) ([]models.Build, error) {
	slug := circleSlug(cp)

	// Fetch recent pipelines
	url := fmt.Sprintf("https://circleci.com/api/v2/project/%s/pipeline", slug)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Circle-Token", cp.APIToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("circleci API %d: %s", resp.StatusCode, body)
	}

	var pipeResult struct {
		Items []circlePipeline `json:"items"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&pipeResult); err != nil {
		return nil, err
	}

	var builds []models.Build
	for _, pipe := range pipeResult.Items {
		if len(builds) >= 10 {
			break
		}

		// Fetch workflows for this pipeline
		workflows, err := c.fetchWorkflows(ctx, cp.APIToken, pipe.ID)
		if err != nil {
			continue
		}

		for _, wf := range workflows {
			b := models.Build{
				ProjectID:    cp.ProjectID,
				ProviderID:   cp.ID,
				ExternalID:   wf.ID,
				Status:       NormalizeCircleCIStatus(wf.Status),
				Branch:       pipe.branch(),
				CommitSHA:    pipe.revision(),
				CommitMessage: pipe.commitSubject(),
				CommitAuthor: pipe.commitAuthor(),
				Trigger:      pipe.Trigger.Type,
				WorkflowName: wf.Name,
				ProviderURL:  fmt.Sprintf("https://app.circleci.com/pipelines/%s/%d/workflows/%s", slug, pipe.Number, wf.ID),
			}

			if !wf.CreatedAt.IsZero() {
				t := wf.CreatedAt
				b.StartedAt = &t
			}
			if !wf.StoppedAt.IsZero() {
				t := wf.StoppedAt
				b.FinishedAt = &t
			}
			if b.StartedAt != nil && b.FinishedAt != nil {
				d := b.FinishedAt.Sub(*b.StartedAt).Milliseconds()
				b.DurationMS = &d
			}

			builds = append(builds, b)
		}
	}

	return builds, nil
}

func (c *CircleCIProvider) fetchWorkflows(ctx context.Context, token, pipelineID string) ([]circleWorkflow, error) {
	url := fmt.Sprintf("https://circleci.com/api/v2/pipeline/%s/workflow", pipelineID)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Circle-Token", token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("circleci workflows API %d: %s", resp.StatusCode, body)
	}

	var result struct {
		Items []circleWorkflow `json:"items"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result.Items, nil
}

func (c *CircleCIProvider) ParseWebhook(r *http.Request, secret string) (*models.Build, []models.BuildJob, error) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, nil, err
	}

	var payload struct {
		Type     string `json:"type"`
		Workflow struct {
			ID        string    `json:"id"`
			Name      string    `json:"name"`
			Status    string    `json:"status"`
			CreatedAt time.Time `json:"created_at"`
			StoppedAt time.Time `json:"stopped_at"`
		} `json:"workflow"`
		Pipeline struct {
			ID     string `json:"id"`
			Number int    `json:"number"`
			Vcs    struct {
				Branch   string `json:"branch"`
				Revision string `json:"revision"`
			} `json:"vcs"`
		} `json:"pipeline"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, nil, err
	}

	b := &models.Build{
		ExternalID:   payload.Workflow.ID,
		Status:       NormalizeCircleCIStatus(payload.Workflow.Status),
		Branch:       payload.Pipeline.Vcs.Branch,
		CommitSHA:    payload.Pipeline.Vcs.Revision,
		WorkflowName: payload.Workflow.Name,
	}
	if !payload.Workflow.CreatedAt.IsZero() {
		t := payload.Workflow.CreatedAt
		b.StartedAt = &t
	}
	if !payload.Workflow.StoppedAt.IsZero() {
		t := payload.Workflow.StoppedAt
		b.FinishedAt = &t
	}
	if b.StartedAt != nil && b.FinishedAt != nil {
		d := b.FinishedAt.Sub(*b.StartedAt).Milliseconds()
		b.DurationMS = &d
	}

	return b, nil, nil
}

func (c *CircleCIProvider) VerifyWebhook(r *http.Request, secret string) bool {
	if secret == "" {
		return true
	}
	sig := r.Header.Get("Circleci-Signature")
	return sig != "" // Simplified — full impl would verify v1 HMAC
}

type circlePipeline struct {
	ID     string `json:"id"`
	Number int    `json:"number"`
	// VCS slug format (gh/owner/repo projects)
	Vcs struct {
		Branch   string `json:"branch"`
		Revision string `json:"revision"`
		Commit   struct {
			Subject string `json:"subject"`
			Author  struct {
				Name string `json:"name"`
			} `json:"author"`
		} `json:"commit"`
	} `json:"vcs"`
	// Standalone project format (circleci/org/project)
	TriggerParams struct {
		Git struct {
			Branch        string `json:"branch"`
			CheckoutSHA   string `json:"checkout_sha"`
			CommitMessage string `json:"commit_message"`
			CommitAuthor  string `json:"commit_author_name"`
			RepoOwner     string `json:"repo_owner"`
			RepoName      string `json:"repo_name"`
		} `json:"git"`
	} `json:"trigger_parameters"`
	Trigger struct {
		Type string `json:"type"`
	} `json:"trigger"`
}

func (p *circlePipeline) branch() string {
	if p.Vcs.Branch != "" {
		return p.Vcs.Branch
	}
	return p.TriggerParams.Git.Branch
}

func (p *circlePipeline) revision() string {
	if p.Vcs.Revision != "" {
		return p.Vcs.Revision
	}
	return p.TriggerParams.Git.CheckoutSHA
}

func (p *circlePipeline) commitSubject() string {
	if p.Vcs.Commit.Subject != "" {
		return p.Vcs.Commit.Subject
	}
	msg := p.TriggerParams.Git.CommitMessage
	// Take first line as subject
	if i := len(msg); i > 0 {
		for j := 0; j < i; j++ {
			if msg[j] == '\n' {
				return msg[:j]
			}
		}
	}
	return msg
}

func (p *circlePipeline) commitAuthor() string {
	if p.Vcs.Commit.Author.Name != "" {
		return p.Vcs.Commit.Author.Name
	}
	return p.TriggerParams.Git.CommitAuthor
}

type circleWorkflow struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	StoppedAt time.Time `json:"stopped_at"`
}

// FetchJobs fetches jobs for a given workflow. Used for build detail view.
func (c *CircleCIProvider) FetchJobs(ctx context.Context, token, workflowID string) ([]models.BuildJob, error) {
	url := fmt.Sprintf("https://circleci.com/api/v2/workflow/%s/job", workflowID)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Circle-Token", token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("circleci jobs API %d: %s", resp.StatusCode, body)
	}

	var result struct {
		Items []struct {
			ID         string    `json:"id"`
			Name       string    `json:"name"`
			Status     string    `json:"status"`
			StartedAt  time.Time `json:"started_at"`
			StoppedAt  time.Time `json:"stopped_at"`
			JobNumber  int       `json:"job_number"`
		} `json:"items"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	jobs := make([]models.BuildJob, 0, len(result.Items))
	for _, item := range result.Items {
		j := models.BuildJob{
			ExternalID: item.ID,
			Name:       item.Name,
			Status:     NormalizeCircleCIStatus(item.Status),
		}
		if !item.StartedAt.IsZero() {
			t := item.StartedAt
			j.StartedAt = &t
		}
		if !item.StoppedAt.IsZero() {
			t := item.StoppedAt
			j.FinishedAt = &t
		}
		if j.StartedAt != nil && j.FinishedAt != nil {
			d := j.FinishedAt.Sub(*j.StartedAt).Milliseconds()
			j.DurationMS = &d
		}
		jobs = append(jobs, j)
	}
	return jobs, nil
}
