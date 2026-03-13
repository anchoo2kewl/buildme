package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/anchoo2kewl/buildme/internal/config"
	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/notify"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/go-chi/chi/v5"
)

type MemberHandler struct {
	store store.Store
	cfg   *config.Config
}

func (h *MemberHandler) List(w http.ResponseWriter, r *http.Request) {
	projectID := ProjectIDFromCtx(r.Context())
	members, err := h.store.ListProjectMembers(r.Context(), projectID)
	if err != nil {
		jsonError(w, "failed to list members", http.StatusInternalServerError)
		return
	}
	if members == nil {
		members = []models.ProjectMember{}
	}
	jsonResp(w, http.StatusOK, members)
}

func (h *MemberHandler) Invite(w http.ResponseWriter, r *http.Request) {
	projectID := ProjectIDFromCtx(r.Context())
	var req struct {
		Email string          `json:"email"`
		Role  models.ProjectRole `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Role == "" {
		req.Role = models.RoleViewer
	}

	user, _ := h.store.GetUserByEmail(r.Context(), req.Email)
	if user == nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}

	existing, _ := h.store.GetProjectMember(r.Context(), projectID, user.ID)
	if existing != nil {
		jsonError(w, "user is already a member", http.StatusConflict)
		return
	}

	member := &models.ProjectMember{
		ProjectID: projectID,
		UserID:    user.ID,
		Role:      req.Role,
	}
	if err := h.store.AddProjectMember(r.Context(), member); err != nil {
		jsonError(w, "failed to add member", http.StatusInternalServerError)
		return
	}

	// Send email notification
	if h.cfg != nil {
		project, _ := h.store.GetProjectByID(r.Context(), projectID)
		projName := "a project"
		if project != nil {
			projName = project.Name
		}
		settings, _ := h.store.GetSettings(r.Context(), "smtp.")
		var smtp *notify.SMTPConfig
		if settings["smtp.host"] != "" {
			smtp = notify.SMTPFromSettings(settings)
		} else {
			smtp = notify.SMTPFromConfig(h.cfg)
		}
		if smtp.IsConfigured() {
			if err := notify.SendMemberInviteEmail(smtp, user.Email, projName, string(req.Role), h.cfg.BaseURL); err != nil {
				slog.Warn("failed to send member invite email", "to", user.Email, "error", err)
			}
		}
	}

	jsonResp(w, http.StatusCreated, member)
}

func (h *MemberHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	projectID := ProjectIDFromCtx(r.Context())
	memberID, _ := strconv.ParseInt(chi.URLParam(r, "memberId"), 10, 64)

	var req struct {
		Role models.ProjectRole `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.store.UpdateProjectMemberRole(r.Context(), projectID, memberID, req.Role); err != nil {
		jsonError(w, "failed to update role", http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusOK, map[string]string{"message": "role updated"})
}

func (h *MemberHandler) Remove(w http.ResponseWriter, r *http.Request) {
	projectID := ProjectIDFromCtx(r.Context())
	memberID, _ := strconv.ParseInt(chi.URLParam(r, "memberId"), 10, 64)

	if err := h.store.RemoveProjectMember(r.Context(), projectID, memberID); err != nil {
		jsonError(w, "failed to remove member", http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusOK, map[string]string{"message": "member removed"})
}
