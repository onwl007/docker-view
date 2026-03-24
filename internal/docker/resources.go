package docker

import (
	"context"
	"sort"
	"strings"
	"time"

	mobycontainer "github.com/moby/moby/api/types/container"
	mobyimage "github.com/moby/moby/api/types/image"
	mobynetwork "github.com/moby/moby/api/types/network"
	mobyvolume "github.com/moby/moby/api/types/volume"
	mobyclient "github.com/moby/moby/client"
)

type ResourceGateway interface {
	Containers(ctx context.Context) ([]Container, error)
	Images(ctx context.Context) ([]Image, error)
	Volumes(ctx context.Context) ([]Volume, error)
	Networks(ctx context.Context) ([]Network, error)
}

type Container struct {
	ID             string
	Names          []string
	Image          string
	CreatedAt      time.Time
	Ports          []Port
	Labels         map[string]string
	State          string
	Status         string
	Mounts         []Mount
	NetworkNames   []string
	ComposeProject string
}

type Port struct {
	IP          string
	PrivatePort uint16
	PublicPort  uint16
	Protocol    string
}

type Mount struct {
	Type        string
	Name        string
	Source      string
	Destination string
}

type Image struct {
	ID         string
	RepoTags   []string
	CreatedAt  time.Time
	SizeBytes  int64
	Containers int64
	Labels     map[string]string
}

type Volume struct {
	Name       string
	Driver     string
	Mountpoint string
	CreatedAt  time.Time
	Scope      string
	Labels     map[string]string
	SizeBytes  int64
}

type Network struct {
	ID        string
	Name      string
	CreatedAt time.Time
	Scope     string
	Driver    string
	Internal  bool
	Subnet    string
	Gateway   string
	Labels    map[string]string
}

func (c *Client) Containers(ctx context.Context) ([]Container, error) {
	containers, err := c.client.ContainerList(ctx, mobyclient.ContainerListOptions{All: true})
	if err != nil {
		return nil, err
	}

	items := make([]Container, 0, len(containers.Items))
	for _, item := range containers.Items {
		items = append(items, mapContainer(item))
	}

	return items, nil
}

func (c *Client) Images(ctx context.Context) ([]Image, error) {
	images, err := c.client.ImageList(ctx, mobyclient.ImageListOptions{All: true})
	if err != nil {
		return nil, err
	}

	items := make([]Image, 0, len(images.Items))
	for _, item := range images.Items {
		items = append(items, mapImage(item))
	}

	return items, nil
}

func (c *Client) Volumes(ctx context.Context) ([]Volume, error) {
	volumes, err := c.client.VolumeList(ctx, mobyclient.VolumeListOptions{})
	if err != nil {
		return nil, err
	}

	items := make([]Volume, 0, len(volumes.Items))
	for _, item := range volumes.Items {
		items = append(items, mapVolume(item))
	}

	return items, nil
}

func (c *Client) Networks(ctx context.Context) ([]Network, error) {
	networks, err := c.client.NetworkList(ctx, mobyclient.NetworkListOptions{})
	if err != nil {
		return nil, err
	}

	items := make([]Network, 0, len(networks.Items))
	for _, item := range networks.Items {
		items = append(items, mapNetwork(item))
	}

	return items, nil
}

func mapContainer(item mobycontainer.Summary) Container {
	ports := make([]Port, 0, len(item.Ports))
	for _, port := range item.Ports {
		ports = append(ports, Port{
			IP:          port.IP.String(),
			PrivatePort: port.PrivatePort,
			PublicPort:  port.PublicPort,
			Protocol:    string(port.Type),
		})
	}

	mounts := make([]Mount, 0, len(item.Mounts))
	for _, mount := range item.Mounts {
		mounts = append(mounts, Mount{
			Type:        string(mount.Type),
			Name:        mount.Name,
			Source:      mount.Source,
			Destination: mount.Destination,
		})
	}

	var networkNames []string
	if item.NetworkSettings != nil {
		networkNames = make([]string, 0, len(item.NetworkSettings.Networks))
		for name := range item.NetworkSettings.Networks {
			networkNames = append(networkNames, name)
		}
		sort.Strings(networkNames)
	}

	return Container{
		ID:             item.ID,
		Names:          item.Names,
		Image:          item.Image,
		CreatedAt:      time.Unix(item.Created, 0).UTC(),
		Ports:          ports,
		Labels:         cloneStringMap(item.Labels),
		State:          string(item.State),
		Status:         item.Status,
		Mounts:         mounts,
		NetworkNames:   networkNames,
		ComposeProject: item.Labels["com.docker.compose.project"],
	}
}

func mapImage(item mobyimage.Summary) Image {
	return Image{
		ID:         item.ID,
		RepoTags:   append([]string(nil), item.RepoTags...),
		CreatedAt:  time.Unix(item.Created, 0).UTC(),
		SizeBytes:  item.Size,
		Containers: item.Containers,
		Labels:     cloneStringMap(item.Labels),
	}
}

func mapVolume(item mobyvolume.Volume) Volume {
	sizeBytes := int64(0)
	if item.UsageData != nil && item.UsageData.Size >= 0 {
		sizeBytes = item.UsageData.Size
	}

	return Volume{
		Name:       item.Name,
		Driver:     item.Driver,
		Mountpoint: item.Mountpoint,
		CreatedAt:  parseDockerTime(item.CreatedAt),
		Scope:      item.Scope,
		Labels:     cloneStringMap(item.Labels),
		SizeBytes:  sizeBytes,
	}
}

func mapNetwork(item mobynetwork.Summary) Network {
	network := Network{
		ID:        item.ID,
		Name:      item.Name,
		CreatedAt: item.Created.UTC(),
		Scope:     item.Scope,
		Driver:    item.Driver,
		Internal:  item.Internal,
		Labels:    cloneStringMap(item.Labels),
	}

	if len(item.IPAM.Config) > 0 {
		network.Subnet = item.IPAM.Config[0].Subnet.String()
		network.Gateway = item.IPAM.Config[0].Gateway.String()
	}

	return network
}

func cloneStringMap(input map[string]string) map[string]string {
	if len(input) == 0 {
		return nil
	}

	output := make(map[string]string, len(input))
	for key, value := range input {
		output[key] = value
	}

	return output
}

func parseDockerTime(value string) time.Time {
	if value == "" {
		return time.Time{}
	}

	timestamp, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return time.Time{}
	}

	return timestamp.UTC()
}

func shortName(names []string, fallback string) string {
	for _, name := range names {
		trimmed := strings.TrimPrefix(name, "/")
		if trimmed != "" {
			return trimmed
		}
	}

	return fallback
}
