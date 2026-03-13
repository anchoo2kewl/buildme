package api

import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"net/http"

	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/poller"
	"github.com/anchoo2kewl/buildme/internal/provider"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/go-chi/chi/v5"
)

type WebhookHandler struct {
	store    store.Store
	registry *provider.Registry
	poller   *poller.Poller
}

func (h *WebhookHandler) Ingest(w http.ResponseWriter, r *http.Request) {
	providerType := models.ProviderType(chi.URLParam(r, "providerType"))

	prov := h.registry.ForType(providerType)
	if prov == nil {
		jsonError(w, "unknown provider type", http.StatusBadRequest)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		jsonError(w, "failed to read body", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	providers, err := h.findProvidersByType(ctx, providerType)
	if err != nil || len(providers) == 0 {
		slog.Warn("webhook: no matching providers", "type", providerType)
		w.WriteHeader(http.StatusOK)
		return
	}

	for _, cp := range providers {
		r.Body = io.NopCloser(bytes.NewReader(body))

		if !prov.VerifyWebhook(r, cp.WebhookSecret) {
			continue
		}

		r.Body = io.NopCloser(bytes.NewReader(body))
		build, jobs, err := prov.ParseWebhook(r, cp.WebhookSecret)
		if err != nil {
			slog.Warn("webhook: parse error", "error", err)
			continue
		}

		build.ProjectID = cp.ProjectID
		build.ProviderID = cp.ID

		h.poller.ProcessBuild(ctx, build)

		if len(jobs) > 0 {
			existingBuild, _ := h.store.GetBuildByExternalID(ctx, cp.ID, build.ExternalID)
			if existingBuild != nil {
				for i := range jobs {
					jobs[i].BuildID = existingBuild.ID
					h.store.UpsertBuildJob(ctx, &jobs[i])
				}
			}
		}

		w.WriteHeader(http.StatusOK)
		return
	}

	slog.Warn("webhook: no provider matched signature")
	w.WriteHeader(http.StatusOK)
}

func (h *WebhookHandler) findProvidersByType(ctx context.Context, providerType models.ProviderType) ([]models.CIProvider, error) {
	// Use ListAllProvidersByType to find all providers of the given type.
	return h.store.ListAllProvidersByType(ctx, providerType)
}
