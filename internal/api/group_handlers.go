package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/go-chi/chi/v5"
)

type GroupHandler struct {
	store store.Store
}

func (h *GroupHandler) List(w http.ResponseWriter, r *http.Request) {
	groups, err := h.store.ListProjectGroups(r.Context())
	if err != nil {
		jsonError(w, "failed to list groups", http.StatusInternalServerError)
		return
	}
	if groups == nil {
		groups = []models.ProjectGroup{}
	}
	jsonResp(w, http.StatusOK, groups)
}

func (h *GroupHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name      string `json:"name"`
		Visible   *bool  `json:"visible"`
		SortOrder int    `json:"sort_order"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		jsonError(w, "name is required", http.StatusBadRequest)
		return
	}
	visible := true
	if req.Visible != nil {
		visible = *req.Visible
	}
	g := &models.ProjectGroup{
		Name: name, Slug: slugify(name), Visible: visible, SortOrder: req.SortOrder,
	}
	if err := h.store.CreateProjectGroup(r.Context(), g); err != nil {
		jsonError(w, "failed to create group", http.StatusInternalServerError)
		return
	}
	jsonResp(w, http.StatusCreated, g)
}

func (h *GroupHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "groupId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid group id", http.StatusBadRequest)
		return
	}
	g, err := h.store.GetProjectGroupByID(r.Context(), id)
	if err != nil {
		jsonError(w, "failed to get group", http.StatusInternalServerError)
		return
	}
	if g == nil {
		jsonError(w, "group not found", http.StatusNotFound)
		return
	}
	jsonResp(w, http.StatusOK, g)
}

func (h *GroupHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	g, err := h.store.GetProjectGroupBySlug(r.Context(), slug)
	if err != nil {
		jsonError(w, "failed to get group", http.StatusInternalServerError)
		return
	}
	if g == nil {
		jsonError(w, "group not found", http.StatusNotFound)
		return
	}
	jsonResp(w, http.StatusOK, g)
}

func (h *GroupHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "groupId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid group id", http.StatusBadRequest)
		return
	}
	g, err := h.store.GetProjectGroupByID(r.Context(), id)
	if err != nil || g == nil {
		jsonError(w, "group not found", http.StatusNotFound)
		return
	}
	var req struct {
		Name      *string `json:"name"`
		Visible   *bool   `json:"visible"`
		SortOrder *int    `json:"sort_order"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			jsonError(w, "name cannot be empty", http.StatusBadRequest)
			return
		}
		g.Name = name
		g.Slug = slugify(name)
	}
	if req.Visible != nil {
		g.Visible = *req.Visible
	}
	if req.SortOrder != nil {
		g.SortOrder = *req.SortOrder
	}
	if err := h.store.UpdateProjectGroup(r.Context(), g); err != nil {
		jsonError(w, "failed to update group", http.StatusInternalServerError)
		return
	}
	jsonResp(w, http.StatusOK, g)
}

func (h *GroupHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "groupId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid group id", http.StatusBadRequest)
		return
	}
	if err := h.store.DeleteProjectGroup(r.Context(), id); err != nil {
		jsonError(w, "failed to delete group", http.StatusInternalServerError)
		return
	}
	jsonResp(w, http.StatusOK, map[string]string{"message": "group deleted"})
}

func (h *GroupHandler) AssignProject(w http.ResponseWriter, r *http.Request) {
	projectID, err := strconv.ParseInt(chi.URLParam(r, "projectId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid project id", http.StatusBadRequest)
		return
	}
	var req struct {
		GroupID *int64 `json:"group_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if err := h.store.SetProjectGroup(r.Context(), projectID, req.GroupID); err != nil {
		jsonError(w, "failed to assign group", http.StatusInternalServerError)
		return
	}
	jsonResp(w, http.StatusOK, map[string]string{"message": "project group updated"})
}
