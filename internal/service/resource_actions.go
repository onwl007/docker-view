package service

import (
	"context"
	"strings"

	"github.com/wanglei/docker-view/internal/audit"
	"github.com/wanglei/docker-view/internal/docker"
)

type ImagePullParams struct {
	Reference string
	Audit     AuditMetadata
}

type ImageDeleteParams struct {
	ID    string
	Force bool
	Audit AuditMetadata
}

type VolumeCreateParams struct {
	Name  string
	Audit AuditMetadata
}

type VolumeDeleteParams struct {
	Name  string
	Force bool
	Audit AuditMetadata
}

type NetworkCreateParams struct {
	Name     string
	Driver   string
	Internal bool
	Audit    AuditMetadata
}

type NetworkDeleteParams struct {
	ID    string
	Audit AuditMetadata
}

type ResourceActionService interface {
	PullImage(ctx context.Context, params ImagePullParams) error
	DeleteImage(ctx context.Context, params ImageDeleteParams) error
	PruneImages(ctx context.Context, metadata AuditMetadata) error
	CreateVolume(ctx context.Context, params VolumeCreateParams) error
	DeleteVolume(ctx context.Context, params VolumeDeleteParams) error
	CreateNetwork(ctx context.Context, params NetworkCreateParams) error
	DeleteNetwork(ctx context.Context, params NetworkDeleteParams) error
}

type resourceActionService struct {
	gateway docker.ResourceMutationGateway
	audit   audit.Recorder
}

func NewResourceActionService(gateway docker.ResourceMutationGateway, recorder audit.Recorder) ResourceActionService {
	return &resourceActionService{gateway: gateway, audit: recorder}
}

func (s *resourceActionService) PullImage(ctx context.Context, params ImagePullParams) error {
	if strings.TrimSpace(params.Reference) == "" {
		return &codedError{code: "invalid_argument", message: "image reference is required"}
	}

	err := s.gateway.PullImage(ctx, params.Reference)
	recordAudit(ctx, s.audit, "pull", params.Reference, params.Audit, err, map[string]any{
		"reference": params.Reference,
	}, "image.registry", "image")
	if err != nil {
		return wrapDockerError(err, "image not found", "image pull conflicts with the current state")
	}

	return nil
}

func (s *resourceActionService) DeleteImage(ctx context.Context, params ImageDeleteParams) error {
	err := s.gateway.RemoveImage(ctx, params.ID, params.Force)
	recordAudit(ctx, s.audit, "delete", params.ID, params.Audit, err, map[string]any{
		"force": params.Force,
	}, "image.lifecycle", "image")
	if err != nil {
		return wrapDockerError(err, "image not found", "image cannot be removed from its current state")
	}

	return nil
}

func (s *resourceActionService) PruneImages(ctx context.Context, metadata AuditMetadata) error {
	err := s.gateway.PruneImages(ctx)
	recordAudit(ctx, s.audit, "prune", "unused", metadata, err, nil, "image.lifecycle", "image")
	if err != nil {
		return wrapDockerError(err, "image not found", "images cannot be pruned in the current state")
	}

	return nil
}

func (s *resourceActionService) CreateVolume(ctx context.Context, params VolumeCreateParams) error {
	if strings.TrimSpace(params.Name) == "" {
		return &codedError{code: "invalid_argument", message: "volume name is required"}
	}

	err := s.gateway.CreateVolume(ctx, params.Name)
	recordAudit(ctx, s.audit, "create", params.Name, params.Audit, err, nil, "volume.lifecycle", "volume")
	if err != nil {
		return wrapDockerError(err, "volume not found", "volume cannot be created in the current state")
	}

	return nil
}

func (s *resourceActionService) DeleteVolume(ctx context.Context, params VolumeDeleteParams) error {
	err := s.gateway.RemoveVolume(ctx, params.Name, params.Force)
	recordAudit(ctx, s.audit, "delete", params.Name, params.Audit, err, map[string]any{
		"force": params.Force,
	}, "volume.lifecycle", "volume")
	if err != nil {
		return wrapDockerError(err, "volume not found", "volume cannot be removed from its current state")
	}

	return nil
}

func (s *resourceActionService) CreateNetwork(ctx context.Context, params NetworkCreateParams) error {
	if strings.TrimSpace(params.Name) == "" {
		return &codedError{code: "invalid_argument", message: "network name is required"}
	}

	driver := params.Driver
	if strings.TrimSpace(driver) == "" {
		driver = "bridge"
	}

	err := s.gateway.CreateNetwork(ctx, params.Name, driver, params.Internal)
	recordAudit(ctx, s.audit, "create", params.Name, params.Audit, err, map[string]any{
		"driver":   driver,
		"internal": params.Internal,
	}, "network.lifecycle", "network")
	if err != nil {
		return wrapDockerError(err, "network not found", "network cannot be created in the current state")
	}

	return nil
}

func (s *resourceActionService) DeleteNetwork(ctx context.Context, params NetworkDeleteParams) error {
	err := s.gateway.RemoveNetwork(ctx, params.ID)
	recordAudit(ctx, s.audit, "delete", params.ID, params.Audit, err, nil, "network.lifecycle", "network")
	if err != nil {
		return wrapDockerError(err, "network not found", "network cannot be removed from its current state")
	}

	return nil
}
