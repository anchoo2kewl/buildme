package provider

import (
	"context"
	"net/http"

	"github.com/anchoo2kewl/buildme/internal/models"
)

// Provider defines the interface for a CI/CD provider.
type Provider interface {
	Type() models.ProviderType
	FetchBuilds(ctx context.Context, cp *models.CIProvider) ([]models.Build, error)
	ParseWebhook(r *http.Request, secret string) (*models.Build, []models.BuildJob, error)
	VerifyWebhook(r *http.Request, secret string) bool
}

// JobFetcher is an optional interface for providers that can fetch jobs for a build.
type JobFetcher interface {
	FetchJobs(ctx context.Context, cp *models.CIProvider, externalID string) ([]models.BuildJob, error)
}

// Registry holds all registered providers.
type Registry struct {
	providers map[models.ProviderType]Provider
}

func NewRegistry() *Registry {
	r := &Registry{
		providers: make(map[models.ProviderType]Provider),
	}
	r.Register(&GitHubProvider{})
	r.Register(&TravisProvider{})
	r.Register(&CircleCIProvider{})
	// github_hosted reuses GitHubProvider (same API, visual distinction only)
	r.providers[models.ProviderGitHubHosted] = &GitHubProvider{}
	return r
}

func (r *Registry) Register(p Provider) {
	r.providers[p.Type()] = p
}

func (r *Registry) ForType(t models.ProviderType) Provider {
	return r.providers[t]
}
