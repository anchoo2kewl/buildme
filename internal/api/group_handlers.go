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
	user := UserFromCtx(r.Context())
	userID := user.ID
	if user.IsSuperAdmin {
		userID = 0
	}
	groups, err := h.store.ListProjectGroups(r.Context(), userID)
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
	// Auto-add creator as owner so they can see and manage their group
	user := UserFromCtx(r.Context())
	h.store.AddGroupMember(r.Context(), &models.GroupMember{
		GroupID: g.ID, UserID: user.ID, Role: models.RoleOwner,
	})
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
	user := UserFromCtx(r.Context())
	if !user.IsSuperAdmin {
		if m, _ := h.store.GetGroupMember(r.Context(), id, user.ID); m == nil {
			jsonError(w, "group not found", http.StatusNotFound)
			return
		}
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
	user := UserFromCtx(r.Context())
	if !user.IsSuperAdmin {
		if m, _ := h.store.GetGroupMember(r.Context(), g.ID, user.ID); m == nil {
			jsonError(w, "group not found", http.StatusNotFound)
			return
		}
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
	user := UserFromCtx(r.Context())
	if !user.IsSuperAdmin {
		role, _ := h.store.GetUserGroupRole(r.Context(), user.ID, id)
		if role != models.RoleAdmin && role != models.RoleOwner {
			jsonError(w, "group not found", http.StatusNotFound)
			return
		}
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
	user := UserFromCtx(r.Context())
	if !user.IsSuperAdmin {
		role, _ := h.store.GetUserGroupRole(r.Context(), user.ID, id)
		if role != models.RoleOwner {
			jsonError(w, "group not found", http.StatusNotFound)
			return
		}
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

// --- Group Members ---

func (h *GroupHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "groupId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid group id", http.StatusBadRequest)
		return
	}
	members, err := h.store.ListGroupMembers(r.Context(), id)
	if err != nil {
		jsonError(w, "failed to list members", http.StatusInternalServerError)
		return
	}
	if members == nil {
		members = []models.GroupMember{}
	}
	jsonResp(w, http.StatusOK, members)
}

func (h *GroupHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "groupId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid group id", http.StatusBadRequest)
		return
	}
	var req struct {
		UserID int64  `json:"user_id"`
		Email  string `json:"email"`
		Role   string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	// Allow adding by email
	userID := req.UserID
	if userID == 0 && req.Email != "" {
		user, err := h.store.GetUserByEmail(r.Context(), strings.TrimSpace(req.Email))
		if err != nil || user == nil {
			jsonError(w, "user not found", http.StatusNotFound)
			return
		}
		userID = user.ID
	}
	if userID == 0 {
		jsonError(w, "user_id or email is required", http.StatusBadRequest)
		return
	}
	role := models.ProjectRole(req.Role)
	if role == "" {
		role = models.RoleViewer
	}
	m := &models.GroupMember{GroupID: groupID, UserID: userID, Role: role}
	if err := h.store.AddGroupMember(r.Context(), m); err != nil {
		if strings.Contains(err.Error(), "UNIQUE") || strings.Contains(err.Error(), "constraint") {
			jsonError(w, "user is already a member of this group", http.StatusConflict)
			return
		}
		jsonError(w, "failed to add member", http.StatusInternalServerError)
		return
	}
	jsonResp(w, http.StatusCreated, m)
}

func (h *GroupHandler) UpdateMemberRole(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "groupId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid group id", http.StatusBadRequest)
		return
	}
	memberID, err := strconv.ParseInt(chi.URLParam(r, "memberId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid member id", http.StatusBadRequest)
		return
	}
	var req struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if err := h.store.UpdateGroupMemberRole(r.Context(), groupID, memberID, models.ProjectRole(req.Role)); err != nil {
		jsonError(w, "failed to update role", http.StatusInternalServerError)
		return
	}
	jsonResp(w, http.StatusOK, map[string]string{"message": "role updated"})
}

func (h *GroupHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "groupId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid group id", http.StatusBadRequest)
		return
	}
	memberID, err := strconv.ParseInt(chi.URLParam(r, "memberId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid member id", http.StatusBadRequest)
		return
	}
	if err := h.store.RemoveGroupMember(r.Context(), groupID, memberID); err != nil {
		jsonError(w, "failed to remove member", http.StatusInternalServerError)
		return
	}
	jsonResp(w, http.StatusOK, map[string]string{"message": "member removed"})
}
