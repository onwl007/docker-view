package docker

import (
	"context"
	"fmt"

	mobyclient "github.com/moby/moby/client"
)

type Summary struct {
	DockerHost        string
	HostName          string
	DockerVersion     string
	APIVersion        string
	OperatingSystem   string
	KernelVersion     string
	StorageDriver     string
	CgroupDriver      string
	DockerRootDir     string
	ContainersTotal   int
	ContainersRunning int
	ContainersStopped int
	ImagesTotal       int
	VolumesTotal      int
	NetworksTotal     int
	CPUCores          int
	MemoryBytes       int64
}

type SystemGateway interface {
	Summary(ctx context.Context) (Summary, error)
}

type Client struct {
	dockerHost string
	client     *mobyclient.Client
}

func NewClient(host string) (*Client, error) {
	cli, err := mobyclient.NewClientWithOpts(
		mobyclient.WithHost(host),
		mobyclient.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return nil, fmt.Errorf("create docker sdk client: %w", err)
	}

	return &Client{
		dockerHost: host,
		client:     cli,
	}, nil
}

func (c *Client) Summary(ctx context.Context) (Summary, error) {
	if _, err := c.client.Ping(ctx, mobyclient.PingOptions{NegotiateAPIVersion: true}); err != nil {
		return Summary{}, err
	}

	info, err := c.client.Info(ctx, mobyclient.InfoOptions{})
	if err != nil {
		return Summary{}, err
	}

	version, err := c.client.ServerVersion(ctx, mobyclient.ServerVersionOptions{})
	if err != nil {
		return Summary{}, err
	}

	volumes, err := c.client.VolumeList(ctx, mobyclient.VolumeListOptions{})
	if err != nil {
		return Summary{}, err
	}

	networks, err := c.client.NetworkList(ctx, mobyclient.NetworkListOptions{})
	if err != nil {
		return Summary{}, err
	}

	return Summary{
		DockerHost:        c.dockerHost,
		HostName:          info.Info.Name,
		DockerVersion:     version.Version,
		APIVersion:        version.APIVersion,
		OperatingSystem:   info.Info.OperatingSystem,
		KernelVersion:     info.Info.KernelVersion,
		StorageDriver:     info.Info.Driver,
		CgroupDriver:      info.Info.CgroupDriver,
		DockerRootDir:     info.Info.DockerRootDir,
		ContainersTotal:   info.Info.Containers,
		ContainersRunning: info.Info.ContainersRunning,
		ContainersStopped: info.Info.ContainersStopped,
		ImagesTotal:       info.Info.Images,
		VolumesTotal:      len(volumes.Items),
		NetworksTotal:     len(networks.Items),
		CPUCores:          info.Info.NCPU,
		MemoryBytes:       info.Info.MemTotal,
	}, nil
}
