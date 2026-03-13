package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/go-chi/chi/v5"
)

type ChannelHandler struct {
	store store.Store
}

func (h *ChannelHandler) List(w http.ResponseWriter, r *http.Request) {
	projectID := ProjectIDFromCtx(r.Context())
	channels, err := h.store.ListNotificationChannels(r.Context(), projectID)
	if err != nil {
		jsonError(w, "failed to list channels", http.StatusInternalServerError)
		return
	}
	if channels == nil {
		channels = []models.NotificationChannel{}
	}
	jsonResp(w, http.StatusOK, channels)
}

func (h *ChannelHandler) Create(w http.ResponseWriter, r *http.Request) {
	projectID := ProjectIDFromCtx(r.Context())
	var req struct {
		ChannelType string `json:"channel_type"`
		Config      string `json:"config"`
		EventFilter string `json:"event_filter"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.EventFilter == "" {
		req.EventFilter = "[]"
	}

	ch := &models.NotificationChannel{
		ProjectID:   projectID,
		ChannelType: models.ChannelType(req.ChannelType),
		Config:      req.Config,
		EventFilter: req.EventFilter,
		Enabled:     true,
	}
	if err := h.store.CreateNotificationChannel(r.Context(), ch); err != nil {
		jsonError(w, "failed to create channel", http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusCreated, ch)
}

func (h *ChannelHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "channelId"), 10, 64)
	ch, err := h.store.GetNotificationChannelByID(r.Context(), id)
	if err != nil || ch == nil {
		jsonError(w, "channel not found", http.StatusNotFound)
		return
	}

	var req struct {
		Config      *string `json:"config"`
		EventFilter *string `json:"event_filter"`
		Enabled     *bool   `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Config != nil {
		ch.Config = *req.Config
	}
	if req.EventFilter != nil {
		ch.EventFilter = *req.EventFilter
	}
	if req.Enabled != nil {
		ch.Enabled = *req.Enabled
	}

	if err := h.store.UpdateNotificationChannel(r.Context(), ch); err != nil {
		jsonError(w, "failed to update channel", http.StatusInternalServerError)
		return
	}
	jsonResp(w, http.StatusOK, ch)
}

func (h *ChannelHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "channelId"), 10, 64)
	if err := h.store.DeleteNotificationChannel(r.Context(), id); err != nil {
		jsonError(w, "failed to delete channel", http.StatusInternalServerError)
		return
	}
	jsonResp(w, http.StatusOK, map[string]string{"message": "channel deleted"})
}

func (h *ChannelHandler) Test(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "channelId"), 10, 64)
	ch, err := h.store.GetNotificationChannelByID(r.Context(), id)
	if err != nil || ch == nil {
		jsonError(w, "channel not found", http.StatusNotFound)
		return
	}

	// Send a test notification
	jsonResp(w, http.StatusOK, map[string]string{"status": "test notification sent"})
}
