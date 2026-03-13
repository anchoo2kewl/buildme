package api

import (
	"net/http"
	"strconv"

	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/go-chi/chi/v5"
)

type BuildHandler struct {
	store store.Store
}

func (h *BuildHandler) List(w http.ResponseWriter, r *http.Request) {
	projectID := ProjectIDFromCtx(r.Context())

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))

	filter := models.BuildFilter{
		Branch: r.URL.Query().Get("branch"),
		Status: models.BuildStatus(r.URL.Query().Get("status")),
		Pagination: models.Pagination{
			Page:    page,
			PerPage: perPage,
		},
	}

	builds, total, err := h.store.ListBuilds(r.Context(), projectID, filter)
	if err != nil {
		jsonError(w, "failed to list builds", http.StatusInternalServerError)
		return
	}

	if builds == nil {
		builds = []models.Build{}
	}

	// Load jobs for each build
	for i := range builds {
		jobs, _ := h.store.ListBuildJobs(r.Context(), builds[i].ID)
		if jobs == nil {
			jobs = []models.BuildJob{}
		}
		builds[i].Jobs = jobs
	}

	jsonResp(w, http.StatusOK, map[string]any{
		"builds": builds,
		"total":  total,
		"page":   filter.Page,
	})
}

func (h *BuildHandler) Get(w http.ResponseWriter, r *http.Request) {
	buildID, _ := strconv.ParseInt(chi.URLParam(r, "buildId"), 10, 64)
	build, err := h.store.GetBuildByID(r.Context(), buildID)
	if err != nil || build == nil {
		jsonError(w, "build not found", http.StatusNotFound)
		return
	}

	// Load jobs
	jobs, _ := h.store.ListBuildJobs(r.Context(), build.ID)
	build.Jobs = jobs

	jsonResp(w, http.StatusOK, build)
}
