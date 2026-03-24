package service

import (
	"context"
	"testing"

	cerrdefs "github.com/containerd/errdefs"
	"github.com/wanglei/docker-view/internal/audit"
)

func TestContainerActionServiceStart(t *testing.T) {
	recorder := &auditRecorderStub{}
	gateway := &containerMutationGatewayStub{}
	service := NewContainerActionService(gateway, recorder)

	if err := service.Start(context.Background(), ContainerTimeoutParams{
		ID: "abc123",
		Audit: AuditMetadata{
			Actor:  "tester",
			Source: "127.0.0.1",
		},
	}); err != nil {
		t.Fatalf("start: %v", err)
	}

	if gateway.startedID != "abc123" {
		t.Fatalf("unexpected started id %q", gateway.startedID)
	}

	if len(recorder.events) != 1 || recorder.events[0].Result != "success" {
		t.Fatalf("unexpected audit events %+v", recorder.events)
	}
}

func TestContainerActionServiceDeleteConflict(t *testing.T) {
	recorder := &auditRecorderStub{}
	gateway := &containerMutationGatewayStub{
		removeErr: cerrdefs.ErrConflict,
	}
	service := NewContainerActionService(gateway, recorder)

	err := service.Delete(context.Background(), ContainerDeleteParams{
		ID:            "abc123",
		Force:         true,
		RemoveVolumes: true,
	})
	if err == nil {
		t.Fatal("expected error")
	}

	if errorCode(err) != "conflict" {
		t.Fatalf("unexpected error code %q", errorCode(err))
	}

	if len(recorder.events) != 1 || recorder.events[0].Result != "failure" {
		t.Fatalf("unexpected audit events %+v", recorder.events)
	}
}

type containerMutationGatewayStub struct {
	startedID string
	stopID    string
	restartID string
	removeID  string

	startErr   error
	stopErr    error
	restartErr error
	removeErr  error
}

func (g *containerMutationGatewayStub) StartContainer(_ context.Context, id string) error {
	g.startedID = id
	return g.startErr
}

func (g *containerMutationGatewayStub) StopContainer(_ context.Context, id string, _ *int) error {
	g.stopID = id
	return g.stopErr
}

func (g *containerMutationGatewayStub) RestartContainer(_ context.Context, id string, _ *int) error {
	g.restartID = id
	return g.restartErr
}

func (g *containerMutationGatewayStub) RemoveContainer(_ context.Context, id string, _, _ bool) error {
	g.removeID = id
	return g.removeErr
}

type auditRecorderStub struct {
	events []audit.Event
	err    error
}

func (r *auditRecorderStub) Record(_ context.Context, event audit.Event) error {
	if r.err != nil {
		return r.err
	}
	r.events = append(r.events, event)
	return nil
}
