package api

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/store"
)

type ProjectHandler struct {
	store store.Store
}

var slugRegex = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(name string) string {
	slug := strings.ToLower(strings.TrimSpace(name))
	slug = slugRegex.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = "project"
	}
	return slug
}

func (h *ProjectHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := UserIDFromCtx(r.Context())
	projects, err := h.store.ListProjectsForUser(r.Context(), userID)
	if err != nil {
		jsonError(w, "failed to list projects", http.StatusInternalServerError)
		return
	}
	if projects == nil {
		projects = []models.Project{}
	}
	jsonResp(w, http.StatusOK, projects)
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		jsonError(w, "name is required", http.StatusBadRequest)
		return
	}

	slug := slugify(req.Name)
	// Ensure unique slug
	for i := 0; ; i++ {
		candidate := slug
		if i > 0 {
			candidate = slug + "-" + strings.Repeat("x", i) // simple dedup
		}
		existing, _ := h.store.GetProjectBySlug(r.Context(), candidate)
		if existing == nil {
			slug = candidate
			break
		}
		if i > 10 {
			jsonError(w, "could not generate unique slug", http.StatusConflict)
			return
		}
	}

	project := &models.Project{
		Name:        req.Name,
		Slug:        slug,
		Description: req.Description,
	}
	if err := h.store.CreateProject(r.Context(), project); err != nil {
		jsonError(w, "failed to create project", http.StatusInternalServerError)
		return
	}

	// Add creator as owner
	member := &models.ProjectMember{
		ProjectID: project.ID,
		UserID:    UserIDFromCtx(r.Context()),
		Role:      models.RoleOwner,
	}
	h.store.AddProjectMember(r.Context(), member)

	jsonResp(w, http.StatusCreated, project)
}

func (h *ProjectHandler) Get(w http.ResponseWriter, r *http.Request) {
	projectID := ProjectIDFromCtx(r.Context())
	project, err := h.store.GetProjectByID(r.Context(), projectID)
	if err != nil || project == nil {
		jsonError(w, "project not found", http.StatusNotFound)
		return
	}
	jsonResp(w, http.StatusOK, project)
}

func (h *ProjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	projectID := ProjectIDFromCtx(r.Context())
	project, err := h.store.GetProjectByID(r.Context(), projectID)
	if err != nil || project == nil {
		jsonError(w, "project not found", http.StatusNotFound)
		return
	}

	var req struct {
		Name          *string `json:"name"`
		Description   *string `json:"description"`
		StagingURL    *string `json:"staging_url"`
		UATURL        *string `json:"uat_url"`
		ProductionURL *string `json:"production_url"`
		VersionPath   *string `json:"version_path"`
		VersionField  *string `json:"version_field"`
		HealthPath    *string `json:"health_path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name != nil {
		project.Name = *req.Name
		project.Slug = slugify(*req.Name)
	}
	if req.Description != nil {
		project.Description = *req.Description
	}
	if req.StagingURL != nil {
		project.StagingURL = *req.StagingURL
	}
	if req.UATURL != nil {
		project.UATURL = *req.UATURL
	}
	if req.ProductionURL != nil {
		project.ProductionURL = *req.ProductionURL
	}
	if req.VersionPath != nil {
		project.VersionPath = *req.VersionPath
	}
	if req.VersionField != nil {
		project.VersionField = *req.VersionField
	}
	if req.HealthPath != nil {
		project.HealthPath = *req.HealthPath
	}

	if err := h.store.UpdateProject(r.Context(), project); err != nil {
		jsonError(w, "failed to update project", http.StatusInternalServerError)
		return
	}
	jsonResp(w, http.StatusOK, project)
}

func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	projectID := ProjectIDFromCtx(r.Context())
	if err := h.store.DeleteProject(r.Context(), projectID); err != nil {
		jsonError(w, "failed to delete project", http.StatusInternalServerError)
		return
	}
	jsonResp(w, http.StatusOK, map[string]string{"message": "project deleted"})
}
