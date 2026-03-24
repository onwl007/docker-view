package http

import (
	"encoding/json"
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
	SystemSummaryService   service.SystemSummaryService
	ResourcesService       service.ResourcesService
	ContainerActionService service.ContainerActionService
	ResourceActionService  service.ResourceActionService
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

	mux.HandleFunc("POST /api/v1/containers/{id}/start", func(w http.ResponseWriter, r *http.Request) {
		if err := opts.ContainerActionService.Start(r.Context(), service.ContainerTimeoutParams{
			ID:    r.PathValue("id"),
			Audit: requestAuditMetadata(r),
		}); err != nil {
			writeServiceError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, successResponse[map[string]bool]{
			Data: map[string]bool{"success": true},
		})
	})

	mux.HandleFunc("POST /api/v1/containers/{id}/stop", func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			TimeoutSeconds *int `json:"timeoutSeconds"`
		}

		if err := decodeJSONBody(r, &payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_argument", err.Error())
			return
		}

		if err := opts.ContainerActionService.Stop(r.Context(), service.ContainerTimeoutParams{
			ID:             r.PathValue("id"),
			TimeoutSeconds: payload.TimeoutSeconds,
			Audit:          requestAuditMetadata(r),
		}); err != nil {
			writeServiceError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, successResponse[map[string]bool]{
			Data: map[string]bool{"success": true},
		})
	})

	mux.HandleFunc("POST /api/v1/containers/{id}/restart", func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			TimeoutSeconds *int `json:"timeoutSeconds"`
		}

		if err := decodeJSONBody(r, &payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_argument", err.Error())
			return
		}

		if err := opts.ContainerActionService.Restart(r.Context(), service.ContainerTimeoutParams{
			ID:             r.PathValue("id"),
			TimeoutSeconds: payload.TimeoutSeconds,
			Audit:          requestAuditMetadata(r),
		}); err != nil {
			writeServiceError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, successResponse[map[string]bool]{
			Data: map[string]bool{"success": true},
		})
	})

	mux.HandleFunc("DELETE /api/v1/containers/{id}", func(w http.ResponseWriter, r *http.Request) {
		force, err := parseOptionalBoolDefaultFalse(r.URL.Query().Get("force"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_argument", "force must be true or false")
			return
		}

		removeVolumes, err := parseOptionalBoolDefaultFalse(r.URL.Query().Get("removeVolumes"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_argument", "removeVolumes must be true or false")
			return
		}

		if err := opts.ContainerActionService.Delete(r.Context(), service.ContainerDeleteParams{
			ID:            r.PathValue("id"),
			Force:         force,
			RemoveVolumes: removeVolumes,
			Audit:         requestAuditMetadata(r),
		}); err != nil {
			writeServiceError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, successResponse[map[string]bool]{
			Data: map[string]bool{"success": true},
		})
	})

	mux.HandleFunc("POST /api/v1/images/pull", func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			Reference string `json:"reference"`
		}

		if err := decodeJSONBody(r, &payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_argument", err.Error())
			return
		}

		if err := opts.ResourceActionService.PullImage(r.Context(), service.ImagePullParams{
			Reference: payload.Reference,
			Audit:     requestAuditMetadata(r),
		}); err != nil {
			writeServiceError(w, err)
			return
		}

		writeActionSuccess(w)
	})

	mux.HandleFunc("DELETE /api/v1/images/{id}", func(w http.ResponseWriter, r *http.Request) {
		force, err := parseOptionalBoolDefaultFalse(r.URL.Query().Get("force"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_argument", "force must be true or false")
			return
		}

		if err := opts.ResourceActionService.DeleteImage(r.Context(), service.ImageDeleteParams{
			ID:    r.PathValue("id"),
			Force: force,
			Audit: requestAuditMetadata(r),
		}); err != nil {
			writeServiceError(w, err)
			return
		}

		writeActionSuccess(w)
	})

	mux.HandleFunc("POST /api/v1/images/prune", func(w http.ResponseWriter, r *http.Request) {
		if err := opts.ResourceActionService.PruneImages(r.Context(), requestAuditMetadata(r)); err != nil {
			writeServiceError(w, err)
			return
		}

		writeActionSuccess(w)
	})

	mux.HandleFunc("POST /api/v1/volumes", func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			Name string `json:"name"`
		}

		if err := decodeJSONBody(r, &payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_argument", err.Error())
			return
		}

		if err := opts.ResourceActionService.CreateVolume(r.Context(), service.VolumeCreateParams{
			Name:  payload.Name,
			Audit: requestAuditMetadata(r),
		}); err != nil {
			writeServiceError(w, err)
			return
		}

		writeActionSuccess(w)
	})

	mux.HandleFunc("DELETE /api/v1/volumes/{name}", func(w http.ResponseWriter, r *http.Request) {
		force, err := parseOptionalBoolDefaultFalse(r.URL.Query().Get("force"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_argument", "force must be true or false")
			return
		}

		if err := opts.ResourceActionService.DeleteVolume(r.Context(), service.VolumeDeleteParams{
			Name:  r.PathValue("name"),
			Force: force,
			Audit: requestAuditMetadata(r),
		}); err != nil {
			writeServiceError(w, err)
			return
		}

		writeActionSuccess(w)
	})

	mux.HandleFunc("POST /api/v1/networks", func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			Name     string `json:"name"`
			Driver   string `json:"driver"`
			Internal bool   `json:"internal"`
		}

		if err := decodeJSONBody(r, &payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_argument", err.Error())
			return
		}

		if err := opts.ResourceActionService.CreateNetwork(r.Context(), service.NetworkCreateParams{
			Name:     payload.Name,
			Driver:   payload.Driver,
			Internal: payload.Internal,
			Audit:    requestAuditMetadata(r),
		}); err != nil {
			writeServiceError(w, err)
			return
		}

		writeActionSuccess(w)
	})

	mux.HandleFunc("DELETE /api/v1/networks/{id}", func(w http.ResponseWriter, r *http.Request) {
		if err := opts.ResourceActionService.DeleteNetwork(r.Context(), service.NetworkDeleteParams{
			ID:    r.PathValue("id"),
			Audit: requestAuditMetadata(r),
		}); err != nil {
			writeServiceError(w, err)
			return
		}

		writeActionSuccess(w)
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

func parseOptionalBoolDefaultFalse(value string) (bool, error) {
	if value == "" {
		return false, nil
	}

	return strconv.ParseBool(value)
}

func decodeJSONBody(r *http.Request, target any) error {
	if r.Body == nil {
		return nil
	}

	defer r.Body.Close()
	if r.ContentLength == 0 {
		return nil
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return errors.New("invalid json body")
	}

	return nil
}

func writeServiceError(w http.ResponseWriter, err error) {
	switch serviceCode(err) {
	case "not_found":
		writeError(w, http.StatusNotFound, "not_found", serviceMessage(err))
	case "conflict":
		writeError(w, http.StatusConflict, "conflict", serviceMessage(err))
	case "invalid_argument":
		writeError(w, http.StatusBadRequest, "invalid_argument", serviceMessage(err))
	case "docker_unavailable":
		writeError(w, http.StatusBadGateway, "docker_unavailable", serviceMessage(err))
	default:
		writeError(w, http.StatusInternalServerError, "internal_error", "internal server error")
	}
}

func writeActionSuccess(w http.ResponseWriter) {
	writeJSON(w, http.StatusOK, successResponse[map[string]bool]{
		Data: map[string]bool{"success": true},
	})
}

func serviceCode(err error) string {
	type coder interface{ Code() string }
	var coded coder
	if errors.As(err, &coded) {
		return coded.Code()
	}

	return "internal_error"
}

func serviceMessage(err error) string {
	if err == nil {
		return ""
	}

	return err.Error()
}

func requestAuditMetadata(r *http.Request) service.AuditMetadata {
	return service.AuditMetadata{
		Actor:     r.Header.Get("X-Docker-View-Actor"),
		Source:    r.RemoteAddr,
		UserAgent: r.UserAgent(),
	}
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
