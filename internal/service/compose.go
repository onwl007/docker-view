package service

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/wanglei/docker-view/internal/audit"
	"github.com/wanglei/docker-view/internal/docker"
)

const (
	composeProjectLabel = "com.docker.compose.project"
	composeServiceLabel = "com.docker.compose.service"
)

type ComposeProjectListParams struct {
	Query string
}

type ComposeProjectListItem struct {
	Name           string    `json:"name"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"createdAt"`
	ContainerCount int       `json:"containerCount"`
	RunningCount   int       `json:"runningCount"`
	StoppedCount   int       `json:"stoppedCount"`
	Services       []string  `json:"services"`
	Networks       []string  `json:"networks"`
	Volumes        []string  `json:"volumes"`
}

type ComposeProjectContainer struct {
	ID        string    `json:"id"`
	ShortID   string    `json:"shortId"`
	Name      string    `json:"name"`
	Service   string    `json:"service,omitempty"`
	Image     string    `json:"image"`
	State     string    `json:"state"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

type ComposeProjectDetail struct {
	Name           string                    `json:"name"`
	Status         string                    `json:"status"`
	CreatedAt      time.Time                 `json:"createdAt"`
	ContainerCount int                       `json:"containerCount"`
	RunningCount   int                       `json:"runningCount"`
	StoppedCount   int                       `json:"stoppedCount"`
	Services       []string                  `json:"services"`
	Networks       []string                  `json:"networks"`
	Volumes        []string                  `json:"volumes"`
	Containers     []ComposeProjectContainer `json:"containers"`
}

type ComposeProjectService interface {
	Projects(ctx context.Context, params ComposeProjectListParams) (ListResult[ComposeProjectListItem], error)
	Project(ctx context.Context, name string) (ComposeProjectDetail, error)
}

type ComposeProjectActionService interface {
	Start(ctx context.Context, name string, metadata AuditMetadata) error
	Stop(ctx context.Context, name string, metadata AuditMetadata) error
	Recreate(ctx context.Context, name string, metadata AuditMetadata) error
	Delete(ctx context.Context, name string, metadata AuditMetadata) error
}

type composeGateway interface {
	docker.ResourceGateway
	docker.ContainerMutationGateway
	docker.ResourceMutationGateway
}

type composeProjectService struct {
	gateway docker.ResourceGateway
}

type composeProjectActionService struct {
	gateway composeGateway
	audit   audit.Recorder
}

func NewComposeProjectService(gateway docker.ResourceGateway) ComposeProjectService {
	return &composeProjectService{gateway: gateway}
}

func NewComposeProjectActionService(gateway composeGateway, recorder audit.Recorder) ComposeProjectActionService {
	return &composeProjectActionService{gateway: gateway, audit: recorder}
}

func (s *composeProjectService) Projects(ctx context.Context, params ComposeProjectListParams) (ListResult[ComposeProjectListItem], error) {
	projects, err := loadComposeProjects(ctx, s.gateway)
	if err != nil {
		return ListResult[ComposeProjectListItem]{}, err
	}

	items := make([]ComposeProjectListItem, 0, len(projects))
	for _, project := range projects {
		if !matchesQuery(params.Query, project.Name, strings.Join(project.services, " "), strings.Join(project.networks, " "), strings.Join(project.volumes, " ")) {
			continue
		}

		items = append(items, ComposeProjectListItem{
			Name:           project.Name,
			Status:         project.status(),
			CreatedAt:      project.createdAt,
			ContainerCount: len(project.containers),
			RunningCount:   project.runningCount(),
			StoppedCount:   project.stoppedCount(),
			Services:       append([]string(nil), project.services...),
			Networks:       append([]string(nil), project.networks...),
			Volumes:        append([]string(nil), project.volumes...),
		})
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].CreatedAt.Equal(items[j].CreatedAt) {
			return items[i].Name < items[j].Name
		}
		return items[i].CreatedAt.Before(items[j].CreatedAt)
	})

	return ListResult[ComposeProjectListItem]{
		Items: items,
		Total: len(items),
	}, nil
}

func (s *composeProjectService) Project(ctx context.Context, name string) (ComposeProjectDetail, error) {
	project, err := findComposeProject(ctx, s.gateway, name)
	if err != nil {
		return ComposeProjectDetail{}, err
	}

	containers := make([]ComposeProjectContainer, 0, len(project.containers))
	for _, item := range project.containers {
		containers = append(containers, ComposeProjectContainer{
			ID:        item.ID,
			ShortID:   shortID(item.ID),
			Name:      dockerContainerName(item),
			Service:   strings.TrimSpace(item.Labels[composeServiceLabel]),
			Image:     item.Image,
			State:     normalizeContainerState(item.State),
			Status:    item.Status,
			CreatedAt: item.CreatedAt,
		})
	}

	sort.Slice(containers, func(i, j int) bool {
		if containers[i].Service == containers[j].Service {
			return containers[i].Name < containers[j].Name
		}
		return containers[i].Service < containers[j].Service
	})

	return ComposeProjectDetail{
		Name:           project.Name,
		Status:         project.status(),
		CreatedAt:      project.createdAt,
		ContainerCount: len(project.containers),
		RunningCount:   project.runningCount(),
		StoppedCount:   project.stoppedCount(),
		Services:       append([]string(nil), project.services...),
		Networks:       append([]string(nil), project.networks...),
		Volumes:        append([]string(nil), project.volumes...),
		Containers:     containers,
	}, nil
}

func (s *composeProjectActionService) Start(ctx context.Context, name string, metadata AuditMetadata) error {
	project, err := findComposeProject(ctx, s.gateway, name)
	if err != nil {
		return err
	}

	for _, container := range project.containers {
		if normalizeContainerState(container.State) == "running" {
			continue
		}
		if err := s.gateway.StartContainer(ctx, container.ID); err != nil {
			recordAudit(ctx, s.audit, "start", name, metadata, err, map[string]any{"containerId": container.ID}, "compose.lifecycle", "compose_project")
			return wrapDockerError(err, "compose project not found", "compose project cannot be started from its current state")
		}
	}

	recordAudit(ctx, s.audit, "start", name, metadata, nil, map[string]any{"containerCount": len(project.containers)}, "compose.lifecycle", "compose_project")
	return nil
}

func (s *composeProjectActionService) Stop(ctx context.Context, name string, metadata AuditMetadata) error {
	project, err := findComposeProject(ctx, s.gateway, name)
	if err != nil {
		return err
	}

	for _, container := range project.containers {
		if normalizeContainerState(container.State) != "running" {
			continue
		}
		if err := s.gateway.StopContainer(ctx, container.ID, nil); err != nil {
			recordAudit(ctx, s.audit, "stop", name, metadata, err, map[string]any{"containerId": container.ID}, "compose.lifecycle", "compose_project")
			return wrapDockerError(err, "compose project not found", "compose project cannot be stopped from its current state")
		}
	}

	recordAudit(ctx, s.audit, "stop", name, metadata, nil, map[string]any{"containerCount": len(project.containers)}, "compose.lifecycle", "compose_project")
	return nil
}

func (s *composeProjectActionService) Recreate(ctx context.Context, name string, metadata AuditMetadata) error {
	project, err := findComposeProject(ctx, s.gateway, name)
	if err != nil {
		return err
	}
	if len(project.containers) == 0 {
		return &codedError{code: "conflict", message: "compose project cannot be recreated without managed containers"}
	}

	for _, container := range project.containers {
		if err := s.gateway.RestartContainer(ctx, container.ID, nil); err != nil {
			recordAudit(ctx, s.audit, "recreate", name, metadata, err, map[string]any{"containerId": container.ID}, "compose.lifecycle", "compose_project")
			return wrapDockerError(err, "compose project not found", "compose project cannot be recreated from its current state")
		}
	}

	recordAudit(ctx, s.audit, "recreate", name, metadata, nil, map[string]any{
		"containerCount": len(project.containers),
		"mode":           "restart",
	}, "compose.lifecycle", "compose_project")
	return nil
}

func (s *composeProjectActionService) Delete(ctx context.Context, name string, metadata AuditMetadata) error {
	project, err := findComposeProject(ctx, s.gateway, name)
	if err != nil {
		return err
	}

	for _, container := range project.containers {
		if err := s.gateway.RemoveContainer(ctx, container.ID, true, false); err != nil {
			recordAudit(ctx, s.audit, "delete", name, metadata, err, map[string]any{"containerId": container.ID}, "compose.lifecycle", "compose_project")
			return wrapDockerError(err, "compose project not found", "compose project cannot be removed from its current state")
		}
	}

	for _, network := range project.managedNetworks {
		if err := s.gateway.RemoveNetwork(ctx, network.ID); err != nil {
			recordAudit(ctx, s.audit, "delete", name, metadata, err, map[string]any{"networkId": network.ID}, "compose.lifecycle", "compose_project")
			return wrapDockerError(err, "compose project not found", "compose project cannot be removed from its current state")
		}
	}

	recordAudit(ctx, s.audit, "delete", name, metadata, nil, map[string]any{
		"containerCount": len(project.containers),
		"networkCount":   len(project.managedNetworks),
		"volumesRemoved": false,
	}, "compose.lifecycle", "compose_project")
	return nil
}

type composeProjectAggregate struct {
	Name            string
	containers      []docker.Container
	managedNetworks []docker.Network
	services        []string
	networks        []string
	volumes         []string
	createdAt       time.Time
}

func (p *composeProjectAggregate) runningCount() int {
	count := 0
	for _, container := range p.containers {
		if normalizeContainerState(container.State) == "running" {
			count++
		}
	}
	return count
}

func (p *composeProjectAggregate) stoppedCount() int {
	return len(p.containers) - p.runningCount()
}

func (p *composeProjectAggregate) status() string {
	switch {
	case len(p.containers) == 0:
		return "inactive"
	case p.runningCount() == len(p.containers):
		return "running"
	case p.runningCount() == 0:
		return "stopped"
	default:
		return "partial"
	}
}

func findComposeProject(ctx context.Context, gateway docker.ResourceGateway, name string) (composeProjectAggregate, error) {
	projects, err := loadComposeProjects(ctx, gateway)
	if err != nil {
		return composeProjectAggregate{}, err
	}

	for _, project := range projects {
		if project.Name == strings.TrimSpace(name) {
			return project, nil
		}
	}

	return composeProjectAggregate{}, &codedError{code: "not_found", message: "compose project not found"}
}

func loadComposeProjects(ctx context.Context, gateway docker.ResourceGateway) ([]composeProjectAggregate, error) {
	containers, err := gateway.Containers(ctx)
	if err != nil {
		return nil, err
	}

	networks, err := gateway.Networks(ctx)
	if err != nil {
		return nil, err
	}

	volumes, err := gateway.Volumes(ctx)
	if err != nil {
		return nil, err
	}

	projectsByName := make(map[string]*composeProjectAggregate)
	for _, container := range containers {
		projectName := strings.TrimSpace(container.ComposeProject)
		if projectName == "" {
			projectName = strings.TrimSpace(container.Labels[composeProjectLabel])
		}
		if projectName == "" {
			continue
		}

		project := ensureComposeProject(projectsByName, projectName)
		project.containers = append(project.containers, container)
		project.createdAt = earlierTime(project.createdAt, container.CreatedAt)
		project.services = appendUnique(project.services, strings.TrimSpace(container.Labels[composeServiceLabel]))
		for _, networkName := range container.NetworkNames {
			project.networks = appendUnique(project.networks, networkName)
		}
		for _, volumeName := range volumeNames(container.Mounts) {
			project.volumes = appendUnique(project.volumes, volumeName)
		}
	}

	for _, network := range networks {
		projectName := strings.TrimSpace(network.Labels[composeProjectLabel])
		if projectName == "" {
			continue
		}

		project := ensureComposeProject(projectsByName, projectName)
		project.createdAt = earlierTime(project.createdAt, network.CreatedAt)
		project.networks = appendUnique(project.networks, network.Name)
		project.managedNetworks = append(project.managedNetworks, network)
	}

	for _, volume := range volumes {
		projectName := strings.TrimSpace(volume.Labels[composeProjectLabel])
		if projectName == "" {
			continue
		}

		project := ensureComposeProject(projectsByName, projectName)
		project.createdAt = earlierTime(project.createdAt, volume.CreatedAt)
		project.volumes = appendUnique(project.volumes, volume.Name)
	}

	items := make([]composeProjectAggregate, 0, len(projectsByName))
	for _, project := range projectsByName {
		sort.Strings(project.services)
		sort.Strings(project.networks)
		sort.Strings(project.volumes)
		sort.Slice(project.containers, func(i, j int) bool {
			return dockerContainerName(project.containers[i]) < dockerContainerName(project.containers[j])
		})
		sort.Slice(project.managedNetworks, func(i, j int) bool {
			return project.managedNetworks[i].Name < project.managedNetworks[j].Name
		})
		items = append(items, *project)
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].createdAt.Equal(items[j].createdAt) {
			return items[i].Name < items[j].Name
		}
		return items[i].createdAt.Before(items[j].createdAt)
	})

	return items, nil
}

func ensureComposeProject(projects map[string]*composeProjectAggregate, name string) *composeProjectAggregate {
	project, ok := projects[name]
	if ok {
		return project
	}

	project = &composeProjectAggregate{Name: name}
	projects[name] = project
	return project
}

func earlierTime(current, candidate time.Time) time.Time {
	if candidate.IsZero() {
		return current
	}
	if current.IsZero() || candidate.Before(current) {
		return candidate
	}
	return current
}
