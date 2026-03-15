package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/go-chi/chi/v5"
)

type MetricHandler struct {
	store store.Store
}

// ListMetrics returns metric points for a project+env within a time range.
// GET /api/projects/{projectId}/metrics?env=production&hours=24
func (h *MetricHandler) ListMetrics(w http.ResponseWriter, r *http.Request) {
	projectID, _ := strconv.ParseInt(chi.URLParam(r, "projectId"), 10, 64)
	env := r.URL.Query().Get("env")
	if env == "" {
		env = "production"
	}

	hours := 24
	if h := r.URL.Query().Get("hours"); h != "" {
		if n, err := strconv.Atoi(h); err == nil && n > 0 && n <= 168 {
			hours = n
		}
	}

	since := time.Now().Add(-time.Duration(hours) * time.Hour)
	points, err := h.store.ListMetricPoints(r.Context(), projectID, env, since)
	if err != nil {
		jsonError(w, "failed to list metrics", http.StatusInternalServerError)
		return
	}

	if points == nil {
		points = []models.MetricPoint{}
	}
	jsonResp(w, http.StatusOK, points)
}

// ListIncidents returns recent incidents across all projects.
// GET /api/incidents?limit=50
func (h *MetricHandler) ListIncidents(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}

	incidents, err := h.store.ListResourceIncidents(r.Context(), 0, limit)
	if err != nil {
		jsonError(w, "failed to list incidents", http.StatusInternalServerError)
		return
	}

	if incidents == nil {
		incidents = []models.ResourceIncident{}
	}
	jsonResp(w, http.StatusOK, incidents)
}

// ListProjectIncidents returns recent incidents for a specific project.
// GET /api/projects/{projectId}/incidents?limit=20
func (h *MetricHandler) ListProjectIncidents(w http.ResponseWriter, r *http.Request) {
	projectID, _ := strconv.ParseInt(chi.URLParam(r, "projectId"), 10, 64)

	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}

	incidents, err := h.store.ListResourceIncidents(r.Context(), projectID, limit)
	if err != nil {
		jsonError(w, "failed to list incidents", http.StatusInternalServerError)
		return
	}

	if incidents == nil {
		incidents = []models.ResourceIncident{}
	}
	jsonResp(w, http.StatusOK, incidents)
}
