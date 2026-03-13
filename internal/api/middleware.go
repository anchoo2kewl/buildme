package api

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"github.com/anchoo2kewl/buildme/internal/auth"
	"github.com/anchoo2kewl/buildme/internal/models"
	"github.com/anchoo2kewl/buildme/internal/store"
	"github.com/go-chi/chi/v5"
)

type contextKey string

const (
	ctxUserID    contextKey = "user_id"
	ctxUser      contextKey = "user"
	ctxProjectID contextKey = "project_id"
	ctxRole      contextKey = "role"
)

func UserIDFromCtx(ctx context.Context) int64 {
	if v, ok := ctx.Value(ctxUserID).(int64); ok {
		return v
	}
	return 0
}

func UserFromCtx(ctx context.Context) *models.User {
	if v, ok := ctx.Value(ctxUser).(*models.User); ok {
		return v
	}
	return nil
}

func ProjectIDFromCtx(ctx context.Context) int64 {
	if v, ok := ctx.Value(ctxProjectID).(int64); ok {
		return v
	}
	return 0
}

func RoleFromCtx(ctx context.Context) models.ProjectRole {
	if v, ok := ctx.Value(ctxRole).(models.ProjectRole); ok {
		return v
	}
	return ""
}

// JWTAuth middleware validates the JWT token and sets user context.
func JWTAuth(secret string, s store.Store) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenStr := ""
			if h := r.Header.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
				tokenStr = h[7:]
			}
			if tokenStr == "" {
				tokenStr = r.URL.Query().Get("token")
			}
			if tokenStr == "" {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			claims, err := auth.ValidateToken(tokenStr, secret)
			if err != nil {
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
				return
			}

			user, err := s.GetUserByID(r.Context(), claims.UserID)
			if err != nil || user == nil {
				http.Error(w, `{"error":"user not found"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), ctxUserID, user.ID)
			ctx = context.WithValue(ctx, ctxUser, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ProjectAccess middleware loads the project from URL param and checks membership.
func ProjectAccess(s store.Store) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			projectIDStr := chi.URLParam(r, "projectId")
			projectID, err := strconv.ParseInt(projectIDStr, 10, 64)
			if err != nil {
				http.Error(w, `{"error":"invalid project id"}`, http.StatusBadRequest)
				return
			}

			userID := UserIDFromCtx(r.Context())
			user := UserFromCtx(r.Context())

			// Super admins bypass membership check
			if user != nil && user.IsSuperAdmin {
				ctx := context.WithValue(r.Context(), ctxProjectID, projectID)
				ctx = context.WithValue(ctx, ctxRole, models.RoleOwner)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			member, err := s.GetProjectMember(r.Context(), projectID, userID)
			if err != nil || member == nil {
				http.Error(w, `{"error":"not a member of this project"}`, http.StatusForbidden)
				return
			}

			ctx := context.WithValue(r.Context(), ctxProjectID, projectID)
			ctx = context.WithValue(ctx, ctxRole, member.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireRole middleware ensures the user has at least the given role level.
func RequireRole(minRole models.ProjectRole) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := RoleFromCtx(r.Context())
			if role.Level() < minRole.Level() {
				http.Error(w, `{"error":"insufficient permissions"}`, http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r.WithContext(r.Context()))
		})
	}
}
