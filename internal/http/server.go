package http

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/wanglei/docker-view/internal/config"
	"github.com/wanglei/docker-view/internal/service"
)

type ServerOptions struct {
	SystemSummaryService service.SystemSummaryService
	ResourcesService     service.ResourcesService
}

func New(cfg config.Config, opts ServerOptions) *http.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed")
			return
		}

		writeJSON(w, http.StatusOK, successResponse[map[string]string]{Data: map[string]string{
			"status": "ok",
			"addr":   cfg.HTTP.Addr,
		}})
	})

	mux.HandleFunc("/api/v1/system/summary", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed")
			return
		}

		summary, err := opts.SystemSummaryService.Summary(r.Context())
		if err != nil {
			writeError(w, http.StatusBadGateway, "docker_unavailable", "docker engine is unavailable")
			return
		}

		writeJSON(w, http.StatusOK, successResponse[service.SystemSummary]{Data: summary})
	})

	mux.HandleFunc("/api/v1/containers", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed")
			return
		}

		limit, err := parseOptionalInt(r.URL.Query().Get("limit"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_argument", "limit must be a positive integer")
			return
		}

		all, err := parseOptionalBoolDefaultTrue(r.URL.Query().Get("all"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_argument", "all must be true or false")
			return
		}

		items, err := opts.ResourcesService.Containers(r.Context(), service.ContainerListParams{
			Query:  r.URL.Query().Get("q"),
			Status: r.URL.Query().Get("status"),
			All:    all,
			Limit:  limit,
			Sort:   r.URL.Query().Get("sort"),
		})
		if err != nil {
			writeError(w, http.StatusBadGateway, "docker_unavailable", "docker engine is unavailable")
			return
		}

		writeJSON(w, http.StatusOK, successResponse[[]service.ContainerListItem]{
			Data: items.Items,
			Meta: &responseMeta{Total: items.Total},
		})
	})

	mux.HandleFunc("/api/v1/images", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed")
			return
		}

		items, err := opts.ResourcesService.Images(r.Context(), service.ImageListParams{
			Query: r.URL.Query().Get("q"),
		})
		if err != nil {
			writeError(w, http.StatusBadGateway, "docker_unavailable", "docker engine is unavailable")
			return
		}

		writeJSON(w, http.StatusOK, successResponse[[]service.ImageListItem]{
			Data: items.Items,
			Meta: &responseMeta{Total: items.Total},
		})
	})

	mux.HandleFunc("/api/v1/volumes", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed")
			return
		}

		items, err := opts.ResourcesService.Volumes(r.Context(), service.VolumeListParams{
			Query: r.URL.Query().Get("q"),
		})
		if err != nil {
			writeError(w, http.StatusBadGateway, "docker_unavailable", "docker engine is unavailable")
			return
		}

		writeJSON(w, http.StatusOK, successResponse[[]service.VolumeListItem]{
			Data: items.Items,
			Meta: &responseMeta{Total: items.Total},
		})
	})

	mux.HandleFunc("/api/v1/networks", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed")
			return
		}

		items, err := opts.ResourcesService.Networks(r.Context(), service.NetworkListParams{
			Query: r.URL.Query().Get("q"),
		})
		if err != nil {
			writeError(w, http.StatusBadGateway, "docker_unavailable", "docker engine is unavailable")
			return
		}

		writeJSON(w, http.StatusOK, successResponse[[]service.NetworkListItem]{
			Data: items.Items,
			Meta: &responseMeta{Total: items.Total},
		})
	})

	mux.Handle("/", spaHandler(cfg.Web.Dir))

	return &http.Server{
		Addr:    cfg.HTTP.Addr,
		Handler: mux,
	}
}

func parseOptionalInt(value string) (int, error) {
	if value == "" {
		return 0, nil
	}

	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 0 {
		return 0, errors.New("invalid integer")
	}

	return parsed, nil
}

func parseOptionalBoolDefaultTrue(value string) (bool, error) {
	if value == "" {
		return true, nil
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, err
	}

	return parsed, nil
}

func spaHandler(webDir string) http.Handler {
	fileServer := http.FileServer(http.Dir(webDir))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			serveIndex(w, r, webDir, fileServer)
			return
		}

		cleanPath := filepath.Clean(strings.TrimPrefix(r.URL.Path, "/"))
		target := filepath.Join(webDir, cleanPath)
		info, err := os.Stat(target)
		if err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}

		if err != nil && !errors.Is(err, os.ErrNotExist) {
			writeError(w, http.StatusInternalServerError, "internal_error", "failed to load frontend asset")
			return
		}

		serveIndex(w, r, webDir, fileServer)
	})
}

func serveIndex(w http.ResponseWriter, r *http.Request, webDir string, fileServer http.Handler) {
	indexPath := filepath.Join(webDir, "index.html")
	if _, err := os.Stat(indexPath); err != nil {
		writeError(w, http.StatusNotFound, "frontend_not_built", "frontend assets are not available")
		return
	}

	req := r.Clone(r.Context())
	req.URL.Path = "/index.html"
	fileServer.ServeHTTP(w, req)
}
