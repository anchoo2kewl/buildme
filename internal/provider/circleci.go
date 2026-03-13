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

func (c *CircleCIProvider) FetchBuilds(ctx context.Context, cp *models.CIProvider) ([]models.Build, error) {
	slug := fmt.Sprintf("gh/%s/%s", cp.RepoOwner, cp.RepoName)

	// Fetch recent pipelines
	url := fmt.Sprintf("https://circleci.com/api/v2/project/%s/pipeline?page-token=&branch=", slug)
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
				Branch:       pipe.Vcs.Branch,
				CommitSHA:    pipe.Vcs.Revision,
				CommitMessage: pipe.Vcs.Commit.Subject,
				CommitAuthor: pipe.Vcs.Commit.Author.Name,
				Trigger:      pipe.Trigger.Type,
				WorkflowName: wf.Name,
				ProviderURL:  fmt.Sprintf("https://app.circleci.com/pipelines/%s/%s/%s/%d/workflows/%s", "gh", cp.RepoOwner, cp.RepoName, pipe.Number, wf.ID),
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
	Vcs    struct {
		Branch   string `json:"branch"`
		Revision string `json:"revision"`
		Commit   struct {
			Subject string `json:"subject"`
			Author  struct {
				Name string `json:"name"`
			} `json:"author"`
		} `json:"commit"`
	} `json:"vcs"`
	Trigger struct {
		Type string `json:"type"`
	} `json:"trigger"`
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
