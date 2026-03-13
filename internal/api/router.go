package api

import (
	"encoding/json"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/anchoo2kewl/buildme/internal/config"
	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/provider"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/anchoo2kewl/buildme/internal/ws"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func NewRouter(s store.Store, cfg *config.Config, hub *ws.Hub, registry *provider.Registry) http.Handler {
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
	memberH := &MemberHandler{store: s}
	channelH := &ChannelHandler{store: s}
	wsH := &WSHandler{hub: hub}

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
		// Don't serve SPA for API routes
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}

		// Try to serve the file directly
		path := filepath.Join(absPath, r.URL.Path)
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}

		// SPA fallback: serve index.html
		indexPath := filepath.Join(absPath, "index.html")
		if _, err := fs.Stat(os.DirFS(absPath), "index.html"); err == nil {
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
