package api

import (
	"encoding/json"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/anchoo2kewl/buildme/internal/config"
	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/notify"
	"github.com/anchoo2kewl/buildme/internal/provider"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/anchoo2kewl/buildme/internal/ws"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func NewRouter(s store.Store, cfg *config.Config, hub *ws.Hub, registry *provider.Registry, dispatcher *notify.Dispatcher) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RealIP)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	authH := &AuthHandler{store: s, cfg: cfg}
	projectH := &ProjectHandler{store: s}
	providerH := &ProviderHandler{store: s, registry: registry}
	buildH := &BuildHandler{store: s}
	memberH := &MemberHandler{store: s, cfg: cfg}
	channelH := &ChannelHandler{store: s}
	wsH := &WSHandler{hub: hub}
	syncH := &SyncHandler{store: s, cfg: cfg, client: &http.Client{Timeout: 30 * time.Second}, dispatcher: dispatcher}
	apikeyH := &APIKeyHandler{store: s}
	adminH := &AdminHandler{store: s}

	// Health + version
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		jsonResp(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	r.Get("/api/version", VersionHandler)

	// Public auth routes
	r.Post("/api/auth/signup", authH.Signup)
	r.Post("/api/auth/login", authH.Login)
	r.Get("/api/auth/github", authH.GitHubRedirect)
	r.Get("/api/auth/github/callback", authH.GitHubCallback)

	// Webhook ingestion (public, verified by signature)
	r.Post("/api/webhooks/ingest/{providerType}", func(w http.ResponseWriter, r *http.Request) {
		wh := &WebhookHandler{store: s, registry: registry}
		wh.Ingest(w, r)
	})

	// Authenticated routes
	r.Group(func(r chi.Router) {
		r.Use(JWTAuth(cfg.JWTSecret, s))

		r.Get("/api/me", authH.Me)
		r.Post("/api/me/password", authH.ChangePassword)
		r.Get("/api/ws", wsH.Upgrade)

		// Invites
		r.Post("/api/invites", authH.CreateInvite)
		r.Get("/api/invites", authH.ListInvites)

		// API Keys
		r.Get("/api/api-keys", apikeyH.List)
		r.Post("/api/api-keys", apikeyH.Create)
		r.Delete("/api/api-keys/{keyId}", apikeyH.Delete)

		// Dashboard + Sync + Drift
		r.Get("/api/dashboard", syncH.Dashboard)
		r.Post("/api/sync", syncH.SyncAll)
		r.Get("/api/drift", syncH.DriftCheck)

		// Admin settings (super admin only)
		r.Get("/api/admin/email-settings", adminH.GetEmailSettings)
		r.Put("/api/admin/email-settings", adminH.UpdateEmailSettings)
		r.Post("/api/admin/test-email", adminH.TestEmail)

		// Projects (user-level)
		r.Get("/api/projects", projectH.List)
		r.Post("/api/projects", projectH.Create)

		// Project-scoped routes
		r.Route("/api/projects/{projectId}", func(r chi.Router) {
			r.Use(ProjectAccess(s))

			r.Get("/", projectH.Get)
			r.Group(func(r chi.Router) {
				r.Use(RequireRole(models.RoleAdmin))
				r.Put("/", projectH.Update)
			})
			r.Group(func(r chi.Router) {
				r.Use(RequireRole(models.RoleOwner))
				r.Delete("/", projectH.Delete)
			})

			// Builds (viewer+)
			r.Get("/builds", buildH.List)
			r.Get("/builds/{buildId}", buildH.Get)
			r.Post("/builds/{buildId}/retrigger", syncH.RetriggerBuild)
			r.Post("/sync", syncH.SyncProject)

			// Providers (admin+)
			r.Group(func(r chi.Router) {
				r.Use(RequireRole(models.RoleAdmin))
				r.Get("/providers", providerH.List)
				r.Post("/providers", providerH.Create)
				r.Put("/providers/{providerId}", providerH.Update)
				r.Delete("/providers/{providerId}", providerH.Delete)
				r.Post("/providers/{providerId}/test", providerH.Test)
				r.Post("/providers/{providerId}/sync", providerH.Sync)
			})

			// Members (admin+)
			r.Group(func(r chi.Router) {
				r.Use(RequireRole(models.RoleAdmin))
				r.Get("/members", memberH.List)
				r.Post("/members", memberH.Invite)
				r.Patch("/members/{memberId}/role", memberH.UpdateRole)
				r.Delete("/members/{memberId}", memberH.Remove)
			})

			// Notification channels (admin+)
			r.Group(func(r chi.Router) {
				r.Use(RequireRole(models.RoleAdmin))
				r.Get("/channels", channelH.List)
				r.Post("/channels", channelH.Create)
				r.Put("/channels/{channelId}", channelH.Update)
				r.Delete("/channels/{channelId}", channelH.Delete)
				r.Post("/channels/{channelId}/test", channelH.Test)
			})
		})
	})

	// SPA fallback: serve frontend static files
	serveSPA(r, cfg.FrontendDist)

	return r
}

func serveSPA(r chi.Router, distPath string) {
	if distPath == "" {
		return
	}

	absPath, err := filepath.Abs(distPath)
	if err != nil {
		return
	}

	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		return
	}

	fileServer := http.FileServer(http.Dir(absPath))

	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}

		path := filepath.Join(absPath, r.URL.Path)
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			// Hashed filenames (build/, assets/) can be cached long-term.
			// Non-hashed files (app.js, style.css) must revalidate.
			if strings.HasPrefix(r.URL.Path, "/build/") || strings.HasPrefix(r.URL.Path, "/assets/") {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			} else {
				w.Header().Set("Cache-Control", "no-cache, must-revalidate")
			}
			fileServer.ServeHTTP(w, r)
			return
		}

		// Try route-specific index.html (Qwik City SSG generates per-route HTML)
		routeIndex := filepath.Join(absPath, r.URL.Path, "index.html")
		if _, err := os.Stat(routeIndex); err == nil {
			w.Header().Set("Cache-Control", "no-cache, must-revalidate")
			http.ServeFile(w, r, routeIndex)
			return
		}

		// Fallback to root index.html (SPA catch-all)
		indexPath := filepath.Join(absPath, "index.html")
		if _, err := os.Stat(indexPath); err == nil {
			w.Header().Set("Cache-Control", "no-cache, must-revalidate")
			http.ServeFile(w, r, indexPath)
			return
		}

		http.NotFound(w, r)
	})
}

func jsonResp(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
