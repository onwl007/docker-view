package http

import (
	"encoding/json"
	"net/http"

	"github.com/wanglei/docker-view/internal/config"
)

func New(cfg config.Config) *http.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"status": "ok",
			"addr":   cfg.HTTP.Addr,
		})
	})

	return &http.Server{
		Addr:    cfg.HTTP.Addr,
		Handler: mux,
	}
}
