package service

import (
	"context"
	"strings"

	"github.com/wanglei/docker-view/internal/audit"
)

type AuditListParams struct {
	Query      string
	TargetType string
	Action     string
	Result     string
	Limit      int
}

type AuditService interface {
	Events(ctx context.Context, params AuditListParams) (ListResult[audit.Event], error)
}

type auditService struct {
	store audit.Store
}

func NewAuditService(store audit.Store) AuditService {
	return &auditService{store: store}
}

func (s *auditService) Events(ctx context.Context, params AuditListParams) (ListResult[audit.Event], error) {
	items, err := s.store.List(ctx)
	if err != nil {
		return ListResult[audit.Event]{}, err
	}

	filtered := make([]audit.Event, 0, len(items))
	for _, item := range items {
		if params.TargetType != "" && item.TargetType != params.TargetType {
			continue
		}
		if params.Action != "" && item.Action != params.Action {
			continue
		}
		if params.Result != "" && item.Result != params.Result {
			continue
		}
		if !matchesQuery(params.Query, item.EventType, item.TargetType, item.TargetID, item.Action, item.Actor, item.Source) {
			continue
		}

		filtered = append(filtered, item)
	}

	total := len(filtered)
	if params.Limit > 0 && len(filtered) > params.Limit {
		filtered = filtered[:params.Limit]
	}

	return ListResult[audit.Event]{
		Items: filtered,
		Total: total,
	}, nil
}

func isSensitivePath(path string) bool {
	switch {
	case strings.HasPrefix(path, "/api/v1/audit"):
		return true
	case strings.HasPrefix(path, "/api/v1/settings"):
		return true
	case strings.HasPrefix(path, "/api/v1/terminal/"):
		return true
	case strings.Contains(path, "/logs"):
		return true
	case strings.HasSuffix(path, "/exec-sessions"):
		return true
	default:
		return false
	}
}
