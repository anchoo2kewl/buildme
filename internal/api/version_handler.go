package api

import (
	"net/http"

	"github.com/anchoo2kewl/buildme/internal/config"
	"github.com/anchoo2kewl/buildme/internal/version"
)

func versionHandler(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		jsonResp(w, http.StatusOK, version.GetFull(cfg.Port))
	}
}
