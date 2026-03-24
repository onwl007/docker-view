package docker

import (
	"context"

	mobyclient "github.com/moby/moby/client"
)

type ResourceMutationGateway interface {
	PullImage(ctx context.Context, reference string) error
	RemoveImage(ctx context.Context, id string, force bool) error
	PruneImages(ctx context.Context) error
	CreateVolume(ctx context.Context, name string) error
	RemoveVolume(ctx context.Context, name string, force bool) error
	CreateNetwork(ctx context.Context, name, driver string, internal bool) error
	RemoveNetwork(ctx context.Context, id string) error
}

func (c *Client) PullImage(ctx context.Context, reference string) error {
	response, err := c.client.ImagePull(ctx, reference, mobyclient.ImagePullOptions{})
	if err != nil {
		return err
	}
	defer response.Close()

	return response.Wait(ctx)
}

func (c *Client) RemoveImage(ctx context.Context, id string, force bool) error {
	_, err := c.client.ImageRemove(ctx, id, mobyclient.ImageRemoveOptions{
		Force:         force,
		PruneChildren: true,
	})
	return err
}

func (c *Client) PruneImages(ctx context.Context) error {
	_, err := c.client.ImagePrune(ctx, mobyclient.ImagePruneOptions{})
	return err
}

func (c *Client) CreateVolume(ctx context.Context, name string) error {
	_, err := c.client.VolumeCreate(ctx, mobyclient.VolumeCreateOptions{
		Name: name,
	})
	return err
}

func (c *Client) RemoveVolume(ctx context.Context, name string, force bool) error {
	_, err := c.client.VolumeRemove(ctx, name, mobyclient.VolumeRemoveOptions{
		Force: force,
	})
	return err
}

func (c *Client) CreateNetwork(ctx context.Context, name, driver string, internal bool) error {
	_, err := c.client.NetworkCreate(ctx, name, mobyclient.NetworkCreateOptions{
		Driver:   driver,
		Internal: internal,
	})
	return err
}

func (c *Client) RemoveNetwork(ctx context.Context, id string) error {
	_, err := c.client.NetworkRemove(ctx, id, mobyclient.NetworkRemoveOptions{})
	return err
}
