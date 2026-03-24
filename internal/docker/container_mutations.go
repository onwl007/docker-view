package docker

import (
	"context"

	mobyclient "github.com/moby/moby/client"
)

type ContainerMutationGateway interface {
	StartContainer(ctx context.Context, id string) error
	StopContainer(ctx context.Context, id string, timeoutSeconds *int) error
	RestartContainer(ctx context.Context, id string, timeoutSeconds *int) error
	RemoveContainer(ctx context.Context, id string, force, removeVolumes bool) error
}

func (c *Client) StartContainer(ctx context.Context, id string) error {
	_, err := c.client.ContainerStart(ctx, id, mobyclient.ContainerStartOptions{})
	return err
}

func (c *Client) StopContainer(ctx context.Context, id string, timeoutSeconds *int) error {
	_, err := c.client.ContainerStop(ctx, id, mobyclient.ContainerStopOptions{
		Timeout: timeoutSeconds,
	})
	return err
}

func (c *Client) RestartContainer(ctx context.Context, id string, timeoutSeconds *int) error {
	_, err := c.client.ContainerRestart(ctx, id, mobyclient.ContainerRestartOptions{
		Timeout: timeoutSeconds,
	})
	return err
}

func (c *Client) RemoveContainer(ctx context.Context, id string, force, removeVolumes bool) error {
	_, err := c.client.ContainerRemove(ctx, id, mobyclient.ContainerRemoveOptions{
		Force:         force,
		RemoveVolumes: removeVolumes,
	})
	return err
}
