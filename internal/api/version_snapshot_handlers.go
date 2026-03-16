package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/go-chi/chi/v5"
)

type VersionSnapshotHandler struct {
	store store.Store
}

// VersionOverview returns the latest snapshot for every project+env combo.
func (h *VersionSnapshotHandler) VersionOverview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	projects, err := h.store.ListAllProjects(ctx)
	if err != nil {
		jsonError(w, "failed to list projects", http.StatusInternalServerError)
		return
	}

	var entries []models.VersionOverviewEntry
	envs := []string{"staging", "uat", "production"}

	for _, p := range projects {
		envURLs := map[string]string{
			"staging":    p.StagingURL,
			"uat":        p.UATURL,
			"production": p.ProductionURL,
		}
		for _, env := range envs {
			if envURLs[env] == "" {
				continue
			}
			snap, err := h.store.GetLatestVersionSnapshot(ctx, p.ID, env)
			if err != nil || snap == nil {
				continue
			}

			var versionInfo map[string]interface{}
			json.Unmarshal([]byte(snap.VersionInfo), &versionInfo)

			entry := models.VersionOverviewEntry{
				ProjectID:      p.ID,
				ProjectName:    p.Name,
				Env:            env,
				VersionInfo:    versionInfo,
				DeployedSHA:    snap.DeployedSHA,
				HealthStatus:   snap.HealthStatus,
				ResponseTimeMS: snap.ResponseTimeMS,
				CheckedAt:      snap.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
			}

			// Include MCP health if available
			mcpSnap, _ := h.store.GetLatestServiceSnapshot(ctx, p.ID, env, "mcp")
			if mcpSnap != nil {
				entry.MCPHealthStatus = mcpSnap.HealthStatus
				entry.MCPResponseTimeMS = mcpSnap.ResponseTimeMS
			}

			// Include host info if a host is linked to this project+env
			if host, _ := h.store.GetHostForProjectEnv(ctx, p.ID, env); host != nil {
				entry.HostID = host.ID
				entry.HostName = host.Name
				entry.HostIP = host.IPAddress
			}

			entries = append(entries, entry)
		}
	}

	if entries == nil {
		entries = []models.VersionOverviewEntry{}
	}
	jsonResp(w, http.StatusOK, entries)
}

// VersionSnapshots returns history for a specific project+env.
func (h *VersionSnapshotHandler) VersionSnapshots(w http.ResponseWriter, r *http.Request) {
	projectID, _ := strconv.ParseInt(chi.URLParam(r, "projectId"), 10, 64)
	env := r.URL.Query().Get("env")
	if env == "" {
		env = "production"
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}

	snaps, err := h.store.ListVersionSnapshots(r.Context(), projectID, env, limit)
	if err != nil {
		jsonError(w, "failed to list snapshots", http.StatusInternalServerError)
		return
	}

	if snaps == nil {
		snaps = []models.VersionSnapshot{}
	}
	jsonResp(w, http.StatusOK, snaps)
}
