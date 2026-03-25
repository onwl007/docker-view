package service

import (
	"context"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/wanglei/docker-view/internal/docker"
)

type ListResult[T any] struct {
	Items []T
	Total int
}

type ContainerListParams struct {
	Query  string
	Status string
	All    bool
	Limit  int
	Sort   string
}

type ImageListParams struct {
	Query string
}

type VolumeListParams struct {
	Query string
}

type NetworkListParams struct {
	Query string
}

type ContainerListItem struct {
	ID             string            `json:"id"`
	ShortID        string            `json:"shortId"`
	Name           string            `json:"name"`
	Image          string            `json:"image"`
	State          string            `json:"state"`
	Status         string            `json:"status"`
	CreatedAt      time.Time         `json:"createdAt"`
	Ports          []string          `json:"ports"`
	Labels         map[string]string `json:"labels,omitempty"`
	ComposeProject string            `json:"composeProject,omitempty"`
	NetworkNames   []string          `json:"networkNames,omitempty"`
	VolumeNames    []string          `json:"volumeNames,omitempty"`
}

type ImageListItem struct {
	ID         string    `json:"id"`
	ShortID    string    `json:"shortId"`
	Repository string    `json:"repository"`
	Tag        string    `json:"tag"`
	CreatedAt  time.Time `json:"createdAt"`
	SizeBytes  int64     `json:"sizeBytes"`
	Containers int64     `json:"containers"`
	InUse      bool      `json:"inUse"`
}

type ImageDetail struct {
	ID           string            `json:"id"`
	ShortID      string            `json:"shortId"`
	RepoTags     []string          `json:"repoTags"`
	RepoDigests  []string          `json:"repoDigests,omitempty"`
	CreatedAt    time.Time         `json:"createdAt"`
	SizeBytes    int64             `json:"sizeBytes"`
	Containers   int64             `json:"containers"`
	InUse        bool              `json:"inUse"`
	Architecture string            `json:"architecture,omitempty"`
	Variant      string            `json:"variant,omitempty"`
	OS           string            `json:"os,omitempty"`
	Author       string            `json:"author,omitempty"`
	User         string            `json:"user,omitempty"`
	WorkingDir   string            `json:"workingDir,omitempty"`
	Entrypoint   []string          `json:"entrypoint,omitempty"`
	Command      []string          `json:"command,omitempty"`
	Env          []string          `json:"env,omitempty"`
	Labels       map[string]string `json:"labels,omitempty"`
	ExposedPorts []string          `json:"exposedPorts,omitempty"`
	Layers       []string          `json:"layers,omitempty"`
}

type VolumeListItem struct {
	Name               string    `json:"name"`
	Driver             string    `json:"driver"`
	Mountpoint         string    `json:"mountpoint"`
	CreatedAt          time.Time `json:"createdAt"`
	Scope              string    `json:"scope"`
	SizeBytes          int64     `json:"sizeBytes"`
	AttachedContainers []string  `json:"attachedContainers,omitempty"`
}

type VolumeDetail struct {
	Name               string            `json:"name"`
	Driver             string            `json:"driver"`
	Mountpoint         string            `json:"mountpoint"`
	CreatedAt          time.Time         `json:"createdAt"`
	Scope              string            `json:"scope"`
	SizeBytes          int64             `json:"sizeBytes"`
	Labels             map[string]string `json:"labels,omitempty"`
	Options            map[string]string `json:"options,omitempty"`
	Status             map[string]any    `json:"status,omitempty"`
	AttachedContainers []string          `json:"attachedContainers,omitempty"`
}

type VolumeFileEntry struct {
	Name       string    `json:"name"`
	Path       string    `json:"path"`
	Type       string    `json:"type"`
	SizeBytes  int64     `json:"sizeBytes"`
	ModifiedAt time.Time `json:"modifiedAt"`
}

type VolumeFileListing struct {
	VolumeName  string            `json:"volumeName"`
	Mountpoint  string            `json:"mountpoint"`
	CurrentPath string            `json:"currentPath"`
	ParentPath  string            `json:"parentPath,omitempty"`
	Entries     []VolumeFileEntry `json:"entries"`
}

type VolumeFileContent struct {
	VolumeName string    `json:"volumeName"`
	Path       string    `json:"path"`
	Name       string    `json:"name"`
	SizeBytes  int64     `json:"sizeBytes"`
	ModifiedAt time.Time `json:"modifiedAt"`
	Content    string    `json:"content"`
	Truncated  bool      `json:"truncated"`
}

type NetworkListItem struct {
	ID             string    `json:"id"`
	ShortID        string    `json:"shortId"`
	Name           string    `json:"name"`
	Driver         string    `json:"driver"`
	Scope          string    `json:"scope"`
	CreatedAt      time.Time `json:"createdAt"`
	Subnet         string    `json:"subnet,omitempty"`
	Gateway        string    `json:"gateway,omitempty"`
	Internal       bool      `json:"internal"`
	ContainerNames []string  `json:"containerNames,omitempty"`
}

type NetworkIPAMConfig struct {
	Subnet       string            `json:"subnet,omitempty"`
	IPRange      string            `json:"ipRange,omitempty"`
	Gateway      string            `json:"gateway,omitempty"`
	AuxAddresses map[string]string `json:"auxAddresses,omitempty"`
}

type NetworkContainer struct {
	ID          string `json:"id"`
	ShortID     string `json:"shortId"`
	Name        string `json:"name"`
	EndpointID  string `json:"endpointId,omitempty"`
	MacAddress  string `json:"macAddress,omitempty"`
	IPv4Address string `json:"ipv4Address,omitempty"`
	IPv6Address string `json:"ipv6Address,omitempty"`
}

type NetworkDetail struct {
	ID             string              `json:"id"`
	ShortID        string              `json:"shortId"`
	Name           string              `json:"name"`
	Driver         string              `json:"driver"`
	Scope          string              `json:"scope"`
	CreatedAt      time.Time           `json:"createdAt"`
	Subnet         string              `json:"subnet,omitempty"`
	Gateway        string              `json:"gateway,omitempty"`
	Internal       bool                `json:"internal"`
	Attachable     bool                `json:"attachable"`
	Ingress        bool                `json:"ingress"`
	EnableIPv4     bool                `json:"enableIPv4"`
	EnableIPv6     bool                `json:"enableIPv6"`
	Labels         map[string]string   `json:"labels,omitempty"`
	Options        map[string]string   `json:"options,omitempty"`
	IPAMDriver     string              `json:"ipamDriver,omitempty"`
	IPAMOptions    map[string]string   `json:"ipamOptions,omitempty"`
	IPAMConfigs    []NetworkIPAMConfig `json:"ipamConfigs,omitempty"`
	Containers     []NetworkContainer  `json:"containers,omitempty"`
	ContainerNames []string            `json:"containerNames,omitempty"`
}

type ResourcesService interface {
	Containers(ctx context.Context, params ContainerListParams) (ListResult[ContainerListItem], error)
	Images(ctx context.Context, params ImageListParams) (ListResult[ImageListItem], error)
	Image(ctx context.Context, id string) (ImageDetail, error)
	Volumes(ctx context.Context, params VolumeListParams) (ListResult[VolumeListItem], error)
	Volume(ctx context.Context, name string) (VolumeDetail, error)
	VolumeFiles(ctx context.Context, name, currentPath string) (VolumeFileListing, error)
	VolumeFileContent(ctx context.Context, name, filePath string) (VolumeFileContent, error)
	Networks(ctx context.Context, params NetworkListParams) (ListResult[NetworkListItem], error)
	Network(ctx context.Context, id string) (NetworkDetail, error)
}

type resourcesService struct {
	gateway docker.ResourceGateway
}

func NewResourcesService(gateway docker.ResourceGateway) ResourcesService {
	return &resourcesService{gateway: gateway}
}

func (s *resourcesService) Containers(ctx context.Context, params ContainerListParams) (ListResult[ContainerListItem], error) {
	containers, err := s.gateway.Containers(ctx)
	if err != nil {
		return ListResult[ContainerListItem]{}, err
	}

	items := make([]ContainerListItem, 0, len(containers))
	for _, item := range containers {
		if !params.All && normalizeContainerState(item.State) != "running" {
			continue
		}

		name := dockerContainerName(item)
		if params.Status != "" && normalizeContainerState(item.State) != params.Status {
			continue
		}

		if !matchesQuery(params.Query, name, item.Image, item.ComposeProject, item.ID) {
			continue
		}

		items = append(items, ContainerListItem{
			ID:             item.ID,
			ShortID:        shortID(item.ID),
			Name:           name,
			Image:          item.Image,
			State:          normalizeContainerState(item.State),
			Status:         item.Status,
			CreatedAt:      item.CreatedAt,
			Ports:          formatPorts(item.Ports),
			Labels:         item.Labels,
			ComposeProject: item.ComposeProject,
			NetworkNames:   append([]string(nil), item.NetworkNames...),
			VolumeNames:    volumeNames(item.Mounts),
		})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})

	total := len(items)
	if params.Limit > 0 && len(items) > params.Limit {
		items = items[:params.Limit]
	}

	return ListResult[ContainerListItem]{
		Items: items,
		Total: total,
	}, nil
}

func (s *resourcesService) Images(ctx context.Context, params ImageListParams) (ListResult[ImageListItem], error) {
	images, err := s.gateway.Images(ctx)
	if err != nil {
		return ListResult[ImageListItem]{}, err
	}

	items := make([]ImageListItem, 0, len(images))
	for _, item := range images {
		repoTags := item.RepoTags
		if len(repoTags) == 0 {
			repoTags = []string{"<none>:<none>"}
		}

		for _, repoTag := range repoTags {
			repository, tag := splitRepoTag(repoTag)
			if !matchesQuery(params.Query, repository, tag, item.ID) {
				continue
			}

			items = append(items, ImageListItem{
				ID:         item.ID,
				ShortID:    shortID(item.ID),
				Repository: repository,
				Tag:        tag,
				CreatedAt:  item.CreatedAt,
				SizeBytes:  item.SizeBytes,
				Containers: item.Containers,
				InUse:      item.Containers > 0,
			})
		}
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})

	return ListResult[ImageListItem]{
		Items: items,
		Total: len(items),
	}, nil
}

func (s *resourcesService) Image(ctx context.Context, id string) (ImageDetail, error) {
	if strings.TrimSpace(id) == "" {
		return ImageDetail{}, &codedError{code: "invalid_argument", message: "image id is required"}
	}

	item, err := s.gateway.Image(ctx, id)
	if err != nil {
		return ImageDetail{}, wrapDockerError(err, "image not found", "image is not available in the current state")
	}

	containers := int64(0)
	images, err := s.gateway.Images(ctx)
	if err == nil {
		for _, listed := range images {
			if listed.ID == item.ID {
				containers = listed.Containers
				break
			}
		}
	}

	return ImageDetail{
		ID:           item.ID,
		ShortID:      shortID(item.ID),
		RepoTags:     append([]string(nil), item.RepoTags...),
		RepoDigests:  append([]string(nil), item.RepoDigests...),
		CreatedAt:    item.CreatedAt,
		SizeBytes:    item.SizeBytes,
		Containers:   containers,
		InUse:        containers > 0,
		Architecture: item.Architecture,
		Variant:      item.Variant,
		OS:           item.OS,
		Author:       item.Author,
		User:         item.User,
		WorkingDir:   item.WorkingDir,
		Entrypoint:   append([]string(nil), item.Entrypoint...),
		Command:      append([]string(nil), item.Command...),
		Env:          append([]string(nil), item.Env...),
		Labels:       cloneStringMap(item.Labels),
		ExposedPorts: append([]string(nil), item.ExposedPorts...),
		Layers:       append([]string(nil), item.Layers...),
	}, nil
}

func (s *resourcesService) Volumes(ctx context.Context, params VolumeListParams) (ListResult[VolumeListItem], error) {
	volumes, err := s.gateway.Volumes(ctx)
	if err != nil {
		return ListResult[VolumeListItem]{}, err
	}

	containers, err := s.gateway.Containers(ctx)
	if err != nil {
		return ListResult[VolumeListItem]{}, err
	}

	attachedContainersByVolume := make(map[string][]string)
	for _, container := range containers {
		containerName := dockerContainerName(container)
		for _, mount := range container.Mounts {
			if mount.Type != "volume" || mount.Name == "" {
				continue
			}
			attachedContainersByVolume[mount.Name] = appendUnique(attachedContainersByVolume[mount.Name], containerName)
		}
	}

	items := make([]VolumeListItem, 0, len(volumes))
	for _, volume := range volumes {
		if !matchesQuery(params.Query, volume.Name, volume.Driver, volume.Mountpoint) {
			continue
		}

		items = append(items, VolumeListItem{
			Name:               volume.Name,
			Driver:             volume.Driver,
			Mountpoint:         volume.Mountpoint,
			CreatedAt:          volume.CreatedAt,
			Scope:              volume.Scope,
			SizeBytes:          volume.SizeBytes,
			AttachedContainers: attachedContainersByVolume[volume.Name],
		})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})

	return ListResult[VolumeListItem]{
		Items: items,
		Total: len(items),
	}, nil
}

func (s *resourcesService) Networks(ctx context.Context, params NetworkListParams) (ListResult[NetworkListItem], error) {
	networks, err := s.gateway.Networks(ctx)
	if err != nil {
		return ListResult[NetworkListItem]{}, err
	}

	containers, err := s.gateway.Containers(ctx)
	if err != nil {
		return ListResult[NetworkListItem]{}, err
	}

	containerNamesByNetwork := make(map[string][]string)
	for _, container := range containers {
		containerName := dockerContainerName(container)
		for _, networkName := range container.NetworkNames {
			containerNamesByNetwork[networkName] = appendUnique(containerNamesByNetwork[networkName], containerName)
		}
	}

	items := make([]NetworkListItem, 0, len(networks))
	for _, network := range networks {
		if !matchesQuery(params.Query, network.Name, network.Driver, network.Scope, network.Subnet) {
			continue
		}

		items = append(items, NetworkListItem{
			ID:             network.ID,
			ShortID:        shortID(network.ID),
			Name:           network.Name,
			Driver:         network.Driver,
			Scope:          network.Scope,
			CreatedAt:      network.CreatedAt,
			Subnet:         network.Subnet,
			Gateway:        network.Gateway,
			Internal:       network.Internal,
			ContainerNames: containerNamesByNetwork[network.Name],
		})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})

	return ListResult[NetworkListItem]{
		Items: items,
		Total: len(items),
	}, nil
}

func dockerContainerName(item docker.Container) string {
	return dockerContainerNameFromParts(item.Names, item.ID)
}

func dockerContainerNameFromParts(names []string, fallback string) string {
	for _, name := range names {
		trimmed := strings.TrimPrefix(name, "/")
		if trimmed != "" {
			return trimmed
		}
	}

	return shortID(fallback)
}

func shortID(value string) string {
	trimmed := strings.TrimPrefix(value, "sha256:")
	if len(trimmed) > 12 {
		return trimmed[:12]
	}

	return trimmed
}

func formatPorts(ports []docker.Port) []string {
	items := make([]string, 0, len(ports))
	for _, port := range ports {
		value := ""
		if port.PublicPort > 0 {
			value = strings.Join([]string{itoa(uint64(port.PublicPort)), itoa(uint64(port.PrivatePort))}, ":")
		} else {
			value = itoa(uint64(port.PrivatePort))
		}
		if port.Protocol != "" {
			value += "/" + port.Protocol
		}
		items = append(items, value)
	}

	sort.Strings(items)
	return items
}

func volumeNames(mounts []docker.Mount) []string {
	items := make([]string, 0, len(mounts))
	for _, mount := range mounts {
		if mount.Type == "volume" && mount.Name != "" {
			items = appendUnique(items, mount.Name)
		}
	}

	sort.Strings(items)
	return items
}

func splitRepoTag(value string) (string, string) {
	index := strings.LastIndex(value, ":")
	if index <= 0 {
		return value, "<none>"
	}

	return value[:index], value[index+1:]
}

func normalizeContainerState(state string) string {
	switch strings.ToLower(state) {
	case "running":
		return "running"
	case "paused":
		return "paused"
	default:
		return "stopped"
	}
}

func matchesQuery(query string, values ...string) bool {
	needle := strings.TrimSpace(strings.ToLower(query))
	if needle == "" {
		return true
	}

	for _, value := range values {
		if strings.Contains(strings.ToLower(value), needle) {
			return true
		}
	}

	return false
}

func appendUnique(items []string, value string) []string {
	for _, item := range items {
		if item == value {
			return items
		}
	}

	return append(items, value)
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

func cloneAnyMap(input map[string]any) map[string]any {
	if len(input) == 0 {
		return nil
	}

	output := make(map[string]any, len(input))
	for key, value := range input {
		output[key] = value
	}

	return output
}

func itoa(value uint64) string {
	return strconv.FormatUint(value, 10)
}
