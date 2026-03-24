package service

import (
	"context"

	"github.com/wanglei/docker-view/internal/audit"
	"github.com/wanglei/docker-view/internal/docker"
)

type AuditMetadata struct {
	Actor     string
	Source    string
	UserAgent string
}

type ContainerDeleteParams struct {
	ID            string
	Force         bool
	RemoveVolumes bool
	Audit         AuditMetadata
}

type ContainerTimeoutParams struct {
	ID             string
	TimeoutSeconds *int
	Audit          AuditMetadata
}

type ContainerActionService interface {
	Start(ctx context.Context, params ContainerTimeoutParams) error
	Stop(ctx context.Context, params ContainerTimeoutParams) error
	Restart(ctx context.Context, params ContainerTimeoutParams) error
	Delete(ctx context.Context, params ContainerDeleteParams) error
}

type containerActionService struct {
	gateway docker.ContainerMutationGateway
	audit   audit.Recorder
}

func NewContainerActionService(gateway docker.ContainerMutationGateway, recorder audit.Recorder) ContainerActionService {
	return &containerActionService{
		gateway: gateway,
		audit:   recorder,
	}
}

func (s *containerActionService) Start(ctx context.Context, params ContainerTimeoutParams) error {
	err := s.gateway.StartContainer(ctx, params.ID)
	recordAudit(ctx, s.audit, "start", params.ID, params.Audit, err, nil, "container.lifecycle", "container")
	if err != nil {
		return wrapDockerError(err, "container not found", "container cannot be started from its current state")
	}

	return nil
}

func (s *containerActionService) Stop(ctx context.Context, params ContainerTimeoutParams) error {
	err := s.gateway.StopContainer(ctx, params.ID, params.TimeoutSeconds)
	recordAudit(ctx, s.audit, "stop", params.ID, params.Audit, err, map[string]any{
		"timeoutSeconds": params.TimeoutSeconds,
	}, "container.lifecycle", "container")
	if err != nil {
		return wrapDockerError(err, "container not found", "container cannot be stopped from its current state")
	}

	return nil
}

func (s *containerActionService) Restart(ctx context.Context, params ContainerTimeoutParams) error {
	err := s.gateway.RestartContainer(ctx, params.ID, params.TimeoutSeconds)
	recordAudit(ctx, s.audit, "restart", params.ID, params.Audit, err, map[string]any{
		"timeoutSeconds": params.TimeoutSeconds,
	}, "container.lifecycle", "container")
	if err != nil {
		return wrapDockerError(err, "container not found", "container cannot be restarted from its current state")
	}

	return nil
}

func (s *containerActionService) Delete(ctx context.Context, params ContainerDeleteParams) error {
	err := s.gateway.RemoveContainer(ctx, params.ID, params.Force, params.RemoveVolumes)
	recordAudit(ctx, s.audit, "delete", params.ID, params.Audit, err, map[string]any{
		"force":         params.Force,
		"removeVolumes": params.RemoveVolumes,
	}, "container.lifecycle", "container")
	if err != nil {
		return wrapDockerError(err, "container not found", "container cannot be removed from its current state")
	}

	return nil
}

func recordAudit(ctx context.Context, recorder audit.Recorder, action, targetID string, metadata AuditMetadata, err error, details map[string]any, eventType, targetType string) {
	if recorder == nil {
		return
	}

	result := "success"
	if err != nil {
		result = "failure"
		if details == nil {
			details = make(map[string]any)
		}
		details["error"] = err.Error()
	}

	_ = recorder.Record(ctx, audit.Event{
		EventType:  eventType,
		TargetType: targetType,
		TargetID:   targetID,
		Action:     action,
		Actor:      fallbackActor(metadata.Actor),
		Source:     metadata.Source,
		Result:     result,
		Details:    details,
	})
}

func fallbackActor(actor string) string {
	if actor == "" {
		return "anonymous"
	}

	return actor
}
