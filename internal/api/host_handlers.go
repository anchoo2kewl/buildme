package api

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/anchoo2kewl/buildme/internal/auth"
	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/go-chi/chi/v5"
)

type HostHandler struct {
	store store.Store
}

func (h *HostHandler) List(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	if user == nil {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var hosts []models.Host
	var err error

	if user.IsSuperAdmin {
		hosts, err = h.store.ListAllHosts(r.Context())
	} else {
		// Get all projects the user is a member of, then collect hosts
		projects, projErr := h.store.ListProjectsForUser(r.Context(), user.ID)
		if projErr != nil {
			jsonError(w, "failed to list hosts", http.StatusInternalServerError)
			return
		}
		seen := map[int64]bool{}
		for _, p := range projects {
			projectHosts, hErr := h.store.ListHostsByProject(r.Context(), p.ID)
			if hErr != nil {
				jsonError(w, "failed to list hosts", http.StatusInternalServerError)
				return
			}
			for _, ph := range projectHosts {
				if !seen[ph.ID] {
					seen[ph.ID] = true
					hosts = append(hosts, ph)
				}
			}
		}
	}

	if err != nil {
		jsonError(w, "failed to list hosts", http.StatusInternalServerError)
		return
	}

	// Enrich with project IDs
	for i := range hosts {
		ids, _ := h.store.GetHostProjectIDs(r.Context(), hosts[i].ID)
		hosts[i].ProjectIDs = ids
	}

	if hosts == nil {
		hosts = []models.Host{}
	}
	jsonResp(w, http.StatusOK, hosts)
}

func (h *HostHandler) Create(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	if user == nil || !user.IsSuperAdmin {
		jsonError(w, "super admin required", http.StatusForbidden)
		return
	}

	var req struct {
		Name            string  `json:"name"`
		Hostname        string  `json:"hostname"`
		CPUThreshold    float64 `json:"cpu_threshold"`
		MemoryThreshold float64 `json:"memory_threshold"`
		DiskThreshold   float64 `json:"disk_threshold"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		jsonError(w, "name is required", http.StatusBadRequest)
		return
	}

	// Default thresholds
	if req.CPUThreshold == 0 {
		req.CPUThreshold = 90
	}
	if req.MemoryThreshold == 0 {
		req.MemoryThreshold = 90
	}
	if req.DiskThreshold == 0 {
		req.DiskThreshold = 90
	}

	rawKey, keyHash, _, err := auth.GenerateAPIKey()
	if err != nil {
		jsonError(w, "failed to generate host key", http.StatusInternalServerError)
		return
	}

	host := &models.Host{
		Name:            req.Name,
		Hostname:        req.Hostname,
		APIKeyHash:      keyHash,
		Enabled:         true,
		CPUThreshold:    req.CPUThreshold,
		MemoryThreshold: req.MemoryThreshold,
		DiskThreshold:   req.DiskThreshold,
	}

	if err := h.store.CreateHost(r.Context(), host); err != nil {
		jsonError(w, "failed to create host", http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusCreated, map[string]any{
		"id":               host.ID,
		"name":             host.Name,
		"hostname":         host.Hostname,
		"api_key":          rawKey,
		"enabled":          host.Enabled,
		"cpu_threshold":    host.CPUThreshold,
		"memory_threshold": host.MemoryThreshold,
		"disk_threshold":   host.DiskThreshold,
	})
}

func (h *HostHandler) Get(w http.ResponseWriter, r *http.Request) {
	hostID, err := strconv.ParseInt(chi.URLParam(r, "hostId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid host id", http.StatusBadRequest)
		return
	}

	host, err := h.store.GetHostByID(r.Context(), hostID)
	if err != nil || host == nil {
		jsonError(w, "host not found", http.StatusNotFound)
		return
	}

	ids, _ := h.store.GetHostProjectIDs(r.Context(), host.ID)
	host.ProjectIDs = ids

	jsonResp(w, http.StatusOK, host)
}

func (h *HostHandler) Update(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	if user == nil || !user.IsSuperAdmin {
		jsonError(w, "super admin required", http.StatusForbidden)
		return
	}

	hostID, err := strconv.ParseInt(chi.URLParam(r, "hostId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid host id", http.StatusBadRequest)
		return
	}

	host, err := h.store.GetHostByID(r.Context(), hostID)
	if err != nil || host == nil {
		jsonError(w, "host not found", http.StatusNotFound)
		return
	}

	var req struct {
		Name            *string  `json:"name"`
		Hostname        *string  `json:"hostname"`
		Enabled         *bool    `json:"enabled"`
		CPUThreshold    *float64 `json:"cpu_threshold"`
		MemoryThreshold *float64 `json:"memory_threshold"`
		DiskThreshold   *float64 `json:"disk_threshold"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name != nil {
		host.Name = *req.Name
	}
	if req.Hostname != nil {
		host.Hostname = *req.Hostname
	}
	if req.Enabled != nil {
		host.Enabled = *req.Enabled
	}
	if req.CPUThreshold != nil {
		host.CPUThreshold = *req.CPUThreshold
	}
	if req.MemoryThreshold != nil {
		host.MemoryThreshold = *req.MemoryThreshold
	}
	if req.DiskThreshold != nil {
		host.DiskThreshold = *req.DiskThreshold
	}

	if err := h.store.UpdateHost(r.Context(), host); err != nil {
		jsonError(w, "failed to update host", http.StatusInternalServerError)
		return
	}

	ids, _ := h.store.GetHostProjectIDs(r.Context(), host.ID)
	host.ProjectIDs = ids

	jsonResp(w, http.StatusOK, host)
}

func (h *HostHandler) Delete(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	if user == nil || !user.IsSuperAdmin {
		jsonError(w, "super admin required", http.StatusForbidden)
		return
	}

	hostID, err := strconv.ParseInt(chi.URLParam(r, "hostId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid host id", http.StatusBadRequest)
		return
	}

	if err := h.store.DeleteHost(r.Context(), hostID); err != nil {
		jsonError(w, "failed to delete host", http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusOK, map[string]string{"message": "host deleted"})
}

func (h *HostHandler) LinkProject(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	if user == nil || !user.IsSuperAdmin {
		jsonError(w, "super admin required", http.StatusForbidden)
		return
	}

	hostID, err := strconv.ParseInt(chi.URLParam(r, "hostId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid host id", http.StatusBadRequest)
		return
	}

	var req struct {
		ProjectID int64 `json:"project_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.ProjectID == 0 {
		jsonError(w, "project_id is required", http.StatusBadRequest)
		return
	}

	if err := h.store.LinkHostProject(r.Context(), hostID, req.ProjectID); err != nil {
		jsonError(w, "failed to link project", http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusOK, map[string]string{"message": "project linked"})
}

func (h *HostHandler) UnlinkProject(w http.ResponseWriter, r *http.Request) {
	user := UserFromCtx(r.Context())
	if user == nil || !user.IsSuperAdmin {
		jsonError(w, "super admin required", http.StatusForbidden)
		return
	}

	hostID, err := strconv.ParseInt(chi.URLParam(r, "hostId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid host id", http.StatusBadRequest)
		return
	}

	projectID, err := strconv.ParseInt(chi.URLParam(r, "projectId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid project id", http.StatusBadRequest)
		return
	}

	if err := h.store.UnlinkHostProject(r.Context(), hostID, projectID); err != nil {
		jsonError(w, "failed to unlink project", http.StatusInternalServerError)
		return
	}

	jsonResp(w, http.StatusOK, map[string]string{"message": "project unlinked"})
}

func (h *HostHandler) ListMetrics(w http.ResponseWriter, r *http.Request) {
	hostID, err := strconv.ParseInt(chi.URLParam(r, "hostId"), 10, 64)
	if err != nil {
		jsonError(w, "invalid host id", http.StatusBadRequest)
		return
	}

	limit := 100
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	metrics, err := h.store.ListHostMetrics(r.Context(), hostID, limit)
	if err != nil {
		jsonError(w, "failed to list metrics", http.StatusInternalServerError)
		return
	}
	if metrics == nil {
		metrics = []models.HostMetric{}
	}
	jsonResp(w, http.StatusOK, metrics)
}

func (h *HostHandler) AgentHeartbeat(w http.ResponseWriter, r *http.Request) {
	hostKey := r.Header.Get("X-Host-Key")
	if hostKey == "" {
		jsonError(w, "missing X-Host-Key header", http.StatusUnauthorized)
		return
	}

	keyHash := fmt.Sprintf("%x", sha256.Sum256([]byte(hostKey)))

	host, err := h.store.GetHostByAPIKeyHash(r.Context(), keyHash)
	if err != nil || host == nil {
		jsonError(w, "invalid host key", http.StatusUnauthorized)
		return
	}

	if !host.Enabled {
		jsonError(w, "host is disabled", http.StatusForbidden)
		return
	}

	var req struct {
		CPUPercent    float64 `json:"cpu_percent"`
		MemoryPercent float64 `json:"memory_percent"`
		DiskPercent   float64 `json:"disk_percent"`
		NetInBytes    int64   `json:"net_in_bytes"`
		NetOutBytes   int64   `json:"net_out_bytes"`
		MemoryTotal   int64   `json:"memory_total"`
		MemoryUsed    int64   `json:"memory_used"`
		DiskTotal     int64   `json:"disk_total"`
		DiskUsed      int64   `json:"disk_used"`
		AgentVersion  string  `json:"agent_version"`
		IPAddress     string  `json:"ip_address"`
		OSInfo        string  `json:"os_info"`
		Username      string  `json:"username"`
		Hostname      string  `json:"hostname"`
		UptimeSecs    int64   `json:"uptime_secs"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Create metric record
	metric := &models.HostMetric{
		HostID:        host.ID,
		CPUPercent:    req.CPUPercent,
		MemoryPercent: req.MemoryPercent,
		DiskPercent:   req.DiskPercent,
		NetInBytes:    req.NetInBytes,
		NetOutBytes:   req.NetOutBytes,
	}
	h.store.CreateHostMetric(r.Context(), metric)

	// Update host record with latest metrics + agent info
	update := &models.Host{
		CPUPercent:    req.CPUPercent,
		MemoryPercent: req.MemoryPercent,
		DiskPercent:   req.DiskPercent,
		NetInBytes:    req.NetInBytes,
		NetOutBytes:   req.NetOutBytes,
		MemoryTotal:   req.MemoryTotal,
		MemoryUsed:    req.MemoryUsed,
		DiskTotal:     req.DiskTotal,
		DiskUsed:      req.DiskUsed,
		AgentVersion:  req.AgentVersion,
		IPAddress:     req.IPAddress,
		OSInfo:        req.OSInfo,
		Username:      req.Username,
		Hostname:      req.Hostname,
		UptimeSecs:    req.UptimeSecs,
	}
	h.store.UpdateHostHeartbeat(r.Context(), host.ID, update)

	jsonResp(w, http.StatusOK, map[string]any{
		"status":           "ok",
		"cpu_threshold":    host.CPUThreshold,
		"memory_threshold": host.MemoryThreshold,
		"disk_threshold":   host.DiskThreshold,
	})
}
