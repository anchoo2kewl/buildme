package api

import (
	"net/http"

	"github.com/anchoo2kewl/buildme/internal/version"
)

func VersionHandler(w http.ResponseWriter, r *http.Request) {
	jsonResp(w, http.StatusOK, version.Get())
}
