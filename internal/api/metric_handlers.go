package api

import (
	"encoding/json"
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

	hours := 720 // default 30 days
	if h := r.URL.Query().Get("hours"); h != "" {
		if n, err := strconv.Atoi(h); err == nil && n > 0 && n <= 720 {
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

// ListIncidents returns recent incidents scoped to the authenticated user's accessible projects.
// Super admins see all incidents. GET /api/incidents?limit=50&all=true
func (h *MetricHandler) ListIncidents(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}

	showAll := r.URL.Query().Get("all") == "true"

	// Scope to the authenticated user's projects; super admins pass userID=0 to bypass.
	user := UserFromCtx(r.Context())
	var userID int64
	if user != nil && !user.IsSuperAdmin {
		userID = user.ID
	}

	incidents, err := h.store.ListResourceIncidents(r.Context(), 0, userID, limit, showAll)
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

	incidents, err := h.store.ListResourceIncidents(r.Context(), projectID, 0, limit, true)
	if err != nil {
		jsonError(w, "failed to list incidents", http.StatusInternalServerError)
		return
	}

	if incidents == nil {
		incidents = []models.ResourceIncident{}
	}
	jsonResp(w, http.StatusOK, incidents)
}

// IgnoreIncident marks an incident as ignored or unignored.
// PATCH /api/incidents/{incidentId}/ignore
func (h *MetricHandler) IgnoreIncident(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "incidentId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid incident id", http.StatusBadRequest)
		return
	}
	var req struct {
		Ignored bool `json:"ignored"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Verify the user has access to the incident's project (super admins bypass).
	user := UserFromCtx(r.Context())
	if user != nil && !user.IsSuperAdmin {
		inc, err := h.store.GetResourceIncident(r.Context(), id)
		if err != nil {
			jsonError(w, "incident not found", http.StatusNotFound)
			return
		}
		allowed := false
		// Direct project membership
		if m, _ := h.store.GetProjectMember(r.Context(), inc.ProjectID, user.ID); m != nil {
			allowed = true
		}
		// Group membership
		if !allowed {
			if proj, err := h.store.GetProjectByID(r.Context(), inc.ProjectID); err == nil && proj != nil && proj.GroupID != nil {
				if role, err := h.store.GetUserGroupRole(r.Context(), user.ID, *proj.GroupID); err == nil && role != "" {
					allowed = true
				}
			}
		}
		if !allowed {
			jsonError(w, "forbidden", http.StatusForbidden)
			return
		}
	}

	if err := h.store.IgnoreResourceIncident(r.Context(), id, req.Ignored); err != nil {
		jsonError(w, "failed to update incident", http.StatusInternalServerError)
		return
	}
	jsonResp(w, http.StatusOK, map[string]string{"message": "incident updated"})
}
