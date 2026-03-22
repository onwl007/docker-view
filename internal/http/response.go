package http

import (
	"encoding/json"
	"net/http"
)

type successResponse[T any] struct {
	Data T `json:"data"`
}

type errorResponse struct {
	Error apiError `json:"error"`
}

type apiError struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details map[string]any `json:"details,omitempty"`
}

func writeJSON[T any](w http.ResponseWriter, status int, payload successResponse[T]) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(errorResponse{
		Error: apiError{
			Code:    code,
			Message: message,
		},
	})
}
