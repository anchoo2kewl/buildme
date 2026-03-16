package provider

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/anchoo2kewl/buildme/internal/models"
)

type TravisProvider struct{}

func (t *TravisProvider) Type() models.ProviderType {
	return models.ProviderTravis
}

func (t *TravisProvider) FetchBuilds(ctx context.Context, cp *models.CIProvider) ([]models.Build, error) {
	slug := fmt.Sprintf("%s%%2F%s", cp.RepoOwner, cp.RepoName)
	url := fmt.Sprintf("https://api.travis-ci.com/repo/%s/builds?limit=10&sort_by=id:desc", slug)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "token "+cp.APIToken)
	req.Header.Set("Travis-API-Version", "3")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("travis API %d: %s", resp.StatusCode, body)
	}

	var result struct {
		Builds []travisBuild `json:"builds"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	builds := make([]models.Build, 0, len(result.Builds))
	for _, tb := range result.Builds {
		b := models.Build{
			ProjectID:     cp.ProjectID,
			ProviderID:    cp.ID,
			ExternalID:    strconv.Itoa(tb.ID),
			Status:        NormalizeTravisStatus(tb.State),
			Branch:        tb.Branch.Name,
			CommitSHA:     tb.Commit.SHA,
			CommitMessage: tb.Commit.Message,
			CommitAuthor:  tb.Commit.Author.Name,
			Trigger:       tb.EventType,
			ProviderURL:   fmt.Sprintf("https://app.travis-ci.com/%s/%s/builds/%d", cp.RepoOwner, cp.RepoName, tb.ID),
		}

		if tb.StartedAt != nil {
			b.StartedAt = tb.StartedAt
		}
		if tb.FinishedAt != nil {
			b.FinishedAt = tb.FinishedAt
		}
		if tb.Duration > 0 {
			d := int64(tb.Duration) * 1000
			b.DurationMS = &d
		}

		// Attach jobs from the Travis builds API response
		for _, tj := range tb.Jobs {
			j := models.BuildJob{
				ExternalID: strconv.Itoa(tj.ID),
				Name:       tj.Number,
				Status:     NormalizeTravisStatus(tj.State),
			}
			if tj.StartedAt != nil {
				j.StartedAt = tj.StartedAt
			}
			if tj.FinishedAt != nil {
				j.FinishedAt = tj.FinishedAt
			}
			if j.StartedAt != nil && j.FinishedAt != nil {
				d := j.FinishedAt.Sub(*j.StartedAt).Milliseconds()
				j.DurationMS = &d
			}
			b.Jobs = append(b.Jobs, j)
		}

		builds = append(builds, b)
	}
	return builds, nil
}

func (t *TravisProvider) ParseWebhook(r *http.Request, secret string) (*models.Build, []models.BuildJob, error) {
	payload := r.FormValue("payload")
	if payload == "" {
		return nil, nil, fmt.Errorf("missing payload")
	}

	var tb travisBuild
	if err := json.Unmarshal([]byte(payload), &tb); err != nil {
		return nil, nil, err
	}

	b := &models.Build{
		ExternalID:    strconv.Itoa(tb.ID),
		Status:        NormalizeTravisStatus(tb.State),
		Branch:        tb.Branch.Name,
		CommitSHA:     tb.Commit.SHA,
		CommitMessage: tb.Commit.Message,
		CommitAuthor:  tb.Commit.Author.Name,
		Trigger:       tb.EventType,
	}
	if tb.StartedAt != nil {
		b.StartedAt = tb.StartedAt
	}
	if tb.FinishedAt != nil {
		b.FinishedAt = tb.FinishedAt
	}
	if tb.Duration > 0 {
		d := int64(tb.Duration) * 1000
		b.DurationMS = &d
	}

	var jobs []models.BuildJob
	for _, tj := range tb.Jobs {
		j := models.BuildJob{
			ExternalID: strconv.Itoa(tj.ID),
			Name:       tj.Number,
			Status:     NormalizeTravisStatus(tj.State),
		}
		if tj.StartedAt != nil {
			j.StartedAt = tj.StartedAt
		}
		if tj.FinishedAt != nil {
			j.FinishedAt = tj.FinishedAt
		}
		if j.StartedAt != nil && j.FinishedAt != nil {
			d := j.FinishedAt.Sub(*j.StartedAt).Milliseconds()
			j.DurationMS = &d
		}
		jobs = append(jobs, j)
	}

	return b, jobs, nil
}

func (t *TravisProvider) VerifyWebhook(r *http.Request, secret string) bool {
	// Travis uses a signature header verified via their public key
	// For simplicity, we trust the webhook_secret as a shared token check
	if secret == "" {
		return true
	}
	return r.Header.Get("Authorization") == secret
}

type travisBuild struct {
	ID        int        `json:"id"`
	State     string     `json:"state"`
	Duration  int        `json:"duration"`
	EventType string     `json:"event_type"`
	StartedAt *time.Time `json:"started_at"`
	FinishedAt *time.Time `json:"finished_at"`
	Branch    struct {
		Name string `json:"name"`
	} `json:"branch"`
	Commit struct {
		SHA     string `json:"sha"`
		Message string `json:"message"`
		Author  struct {
			Name string `json:"name"`
		} `json:"author"`
	} `json:"commit"`
	Jobs []struct {
		ID         int        `json:"id"`
		Number     string     `json:"number"`
		State      string     `json:"state"`
		StartedAt  *time.Time `json:"started_at"`
		FinishedAt *time.Time `json:"finished_at"`
	} `json:"jobs"`
}
