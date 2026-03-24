package service

import (
	"context"
	"testing"

	cerrdefs "github.com/containerd/errdefs"
)

func TestResourceActionServiceCreateVolume(t *testing.T) {
	gateway := &resourceMutationGatewayStub{}
	recorder := &auditRecorderStub{}
	service := NewResourceActionService(gateway, recorder)

	if err := service.CreateVolume(context.Background(), VolumeCreateParams{
		Name: "postgres_data",
	}); err != nil {
		t.Fatalf("create volume: %v", err)
	}

	if gateway.createdVolume != "postgres_data" {
		t.Fatalf("unexpected created volume %q", gateway.createdVolume)
	}
}

func TestResourceActionServiceDeleteNetworkConflict(t *testing.T) {
	gateway := &resourceMutationGatewayStub{deleteNetworkErr: cerrdefs.ErrConflict}
	recorder := &auditRecorderStub{}
	service := NewResourceActionService(gateway, recorder)

	err := service.DeleteNetwork(context.Background(), NetworkDeleteParams{ID: "bridge"})
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

type resourceMutationGatewayStub struct {
	pulledImage      string
	deletedImage     string
	createdVolume    string
	deletedVolume    string
	createdNetwork   string
	deletedNetwork   string
	pullImageErr     error
	deleteImageErr   error
	pruneImagesErr   error
	createVolumeErr  error
	deleteVolumeErr  error
	createNetworkErr error
	deleteNetworkErr error
}

func (g *resourceMutationGatewayStub) PullImage(_ context.Context, reference string) error {
	g.pulledImage = reference
	return g.pullImageErr
}

func (g *resourceMutationGatewayStub) RemoveImage(_ context.Context, id string, _ bool) error {
	g.deletedImage = id
	return g.deleteImageErr
}

func (g *resourceMutationGatewayStub) PruneImages(context.Context) error {
	return g.pruneImagesErr
}

func (g *resourceMutationGatewayStub) CreateVolume(_ context.Context, name string) error {
	g.createdVolume = name
	return g.createVolumeErr
}

func (g *resourceMutationGatewayStub) RemoveVolume(_ context.Context, name string, _ bool) error {
	g.deletedVolume = name
	return g.deleteVolumeErr
}

func (g *resourceMutationGatewayStub) CreateNetwork(_ context.Context, name, _ string, _ bool) error {
	g.createdNetwork = name
	return g.createNetworkErr
}

func (g *resourceMutationGatewayStub) RemoveNetwork(_ context.Context, id string) error {
	g.deletedNetwork = id
	return g.deleteNetworkErr
}
