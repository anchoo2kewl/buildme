package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/provider"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/go-chi/chi/v5"
)

type ProviderHandler struct {
	store    store.Store
	registry *provider.Registry
}

func (h *ProviderHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	var userID int64
	if user != nil && !user.IsSuperAdmin {
		userID = user.ID
	}
	providers, err := h.store.ListAllCIProviders(r.Context(), userID)
	if err != nil {
		jsonError(w, "failed to list runners", http.StatusInternalServerError)
		return
	}
	if providers == nil {
		providers = []models.CIProviderWithProject{}
	}
	jsonResp(w, http.StatusOK, providers)
}

func (h *ProviderHandler) List(w http.ResponseWriter, r *http.Request) {
	projectID := ProjectIDFromCtx(r.Context())
	providers, err := h.store.ListCIProviders(r.Context(), projectID)
	if err != nil {
		jsonError(w, "failed to list providers", http.StatusInternalServerError)
		return
	}
	if providers == nil {
		providers = []models.CIProvider{}
	}
	jsonResp(w, http.StatusOK, providers)
}

func (h *ProviderHandler) Create(w http.ResponseWriter, r *http.Request) {
	projectID := ProjectIDFromCtx(r.Context())
	var req struct {
		ProviderType  string `json:"provider_type"`
		DisplayName   string `json:"display_name"`
		RepoOwner     string `json:"repo_owner"`
		RepoName      string `json:"repo_name"`
		APIToken      string `json:"api_token"`
		WebhookSecret string `json:"webhook_secret"`
		PollIntervalS int    `json:"poll_interval_s"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.PollIntervalS < 30 {
		req.PollIntervalS = 60
	}

	p := &models.CIProvider{
		ProjectID:     projectID,
		ProviderType:  models.ProviderType(req.ProviderType),
		DisplayName:   req.DisplayName,
		RepoOwner:     req.RepoOwner,
		RepoName:      req.RepoName,
		APIToken:      req.APIToken,
		WebhookSecret: req.WebhookSecret,
		PollIntervalS: req.PollIntervalS,
		Enabled:       true,
	}

	if err := h.store.CreateCIProvider(r.Context(), p); err != nil {
		jsonError(w, "failed to create provider", http.StatusInternalServerError)
		return
	}
	jsonResp(w, http.StatusCreated, p)
}

func (h *ProviderHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "providerId"), 10, 64)
	p, err := h.store.GetCIProviderByID(r.Context(), id)
	if err != nil || p == nil {
		jsonError(w, "provider not found", http.StatusNotFound)
		return
	}

	var req struct {
		DisplayName   *string `json:"display_name"`
		RepoOwner     *string `json:"repo_owner"`
		RepoName      *string `json:"repo_name"`
		APIToken      *string `json:"api_token"`
		WebhookSecret *string `json:"webhook_secret"`
		PollIntervalS *int    `json:"poll_interval_s"`
		Enabled       *bool   `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.DisplayName != nil {
		p.DisplayName = *req.DisplayName
	}
	if req.RepoOwner != nil {
		p.RepoOwner = *req.RepoOwner
	}
	if req.RepoName != nil {
		p.RepoName = *req.RepoName
	}
	if req.APIToken != nil {
		p.APIToken = *req.APIToken
	}
	if req.WebhookSecret != nil {
		p.WebhookSecret = *req.WebhookSecret
	}
	if req.PollIntervalS != nil {
		p.PollIntervalS = *req.PollIntervalS
	}
	if req.Enabled != nil {
		p.Enabled = *req.Enabled
	}

	if err := h.store.UpdateCIProvider(r.Context(), p); err != nil {
		jsonError(w, "failed to update provider", http.StatusInternalServerError)
		return
	}
	jsonResp(w, http.StatusOK, p)
}

func (h *ProviderHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "providerId"), 10, 64)
	if err := h.store.DeleteCIProvider(r.Context(), id); err != nil {
		jsonError(w, "failed to delete provider", http.StatusInternalServerError)
		return
	}
	jsonResp(w, http.StatusOK, map[string]string{"message": "provider deleted"})
}

func (h *ProviderHandler) Test(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "providerId"), 10, 64)
	cp, err := h.store.GetCIProviderByID(r.Context(), id)
	if err != nil || cp == nil {
		jsonError(w, "provider not found", http.StatusNotFound)
		return
	}

	prov := h.registry.ForType(cp.ProviderType)
	if prov == nil {
		jsonError(w, "unsupported provider type", http.StatusBadRequest)
		return
	}

	builds, err := prov.FetchBuilds(r.Context(), cp)
	if err != nil {
		jsonError(w, "connection test failed: "+err.Error(), http.StatusBadGateway)
		return
	}

	jsonResp(w, http.StatusOK, map[string]any{
		"status":      "ok",
		"build_count": len(builds),
	})
}

func (h *ProviderHandler) Sync(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "providerId"), 10, 64)
	cp, err := h.store.GetCIProviderByID(r.Context(), id)
	if err != nil || cp == nil {
		jsonError(w, "provider not found", http.StatusNotFound)
		return
	}

	prov := h.registry.ForType(cp.ProviderType)
	if prov == nil {
		jsonError(w, "unsupported provider type", http.StatusBadRequest)
		return
	}

	builds, err := prov.FetchBuilds(r.Context(), cp)
	if err != nil {
		jsonError(w, "sync failed: "+err.Error(), http.StatusBadGateway)
		return
	}

	var created, updated int
	for i := range builds {
		isNew, err := h.store.UpsertBuild(r.Context(), &builds[i])
		if err != nil {
			continue
		}
		if isNew {
			created++
		} else {
			updated++
		}
	}

	jsonResp(w, http.StatusOK, map[string]any{
		"created": created,
		"updated": updated,
		"total":   len(builds),
	})
}
