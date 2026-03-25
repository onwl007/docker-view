package service

import (
	"context"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"unicode/utf8"

	cerrdefs "github.com/containerd/errdefs"
	"github.com/wanglei/docker-view/internal/docker"
)

const volumeFilePreviewLimit = 64 * 1024

func (s *resourcesService) Volume(ctx context.Context, name string) (VolumeDetail, error) {
	if strings.TrimSpace(name) == "" {
		return VolumeDetail{}, &codedError{code: "invalid_argument", message: "volume name is required"}
	}

	volume, err := s.gateway.Volume(ctx, name)
	if err != nil {
		return VolumeDetail{}, wrapDockerError(err, "volume not found", "volume is not available in the current state")
	}

	containers, err := s.gateway.Containers(ctx)
	if err != nil {
		return VolumeDetail{}, err
	}

	attachedContainers := make([]string, 0)
	for _, container := range containers {
		containerName := dockerContainerName(container)
		for _, mount := range container.Mounts {
			if mount.Type == "volume" && mount.Name == volume.Name {
				attachedContainers = appendUnique(attachedContainers, containerName)
			}
		}
	}
	sort.Strings(attachedContainers)

	return VolumeDetail{
		Name:               volume.Name,
		Driver:             volume.Driver,
		Mountpoint:         volume.Mountpoint,
		CreatedAt:          volume.CreatedAt,
		Scope:              volume.Scope,
		SizeBytes:          volume.SizeBytes,
		Labels:             cloneStringMap(volume.Labels),
		Options:            cloneStringMap(volume.Options),
		Status:             cloneAnyMap(volume.Status),
		AttachedContainers: attachedContainers,
	}, nil
}

func (s *resourcesService) VolumeFiles(ctx context.Context, name, currentPath string) (VolumeFileListing, error) {
	if gateway, ok := s.gateway.(docker.VolumeFilesystemGateway); ok {
		listing, err := s.volumeFilesFromDocker(ctx, gateway, name, currentPath)
		if err == nil {
			return listing, nil
		}
		if cerrdefs.IsNotFound(err) || cerrdefs.IsInvalidArgument(err) || cerrdefs.IsPermissionDenied(err) {
			return VolumeFileListing{}, mapVolumeFilesystemGatewayError(err)
		}
	}

	volume, resolvedPath, displayPath, _, err := s.resolveVolumePath(ctx, name, currentPath)
	if err != nil {
		return VolumeFileListing{}, err
	}

	entries, err := os.ReadDir(resolvedPath)
	if err != nil {
		return VolumeFileListing{}, mapFilesystemError(err)
	}

	items := make([]VolumeFileEntry, 0, len(entries))
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			return VolumeFileListing{}, mapFilesystemError(err)
		}

		entryPath := filepath.Join(displayPath, entry.Name())
		entryPath = strings.TrimPrefix(filepath.ToSlash(entryPath), "/")

		entryType := "file"
		switch {
		case entry.IsDir():
			entryType = "directory"
		case info.Mode()&os.ModeSymlink != 0:
			entryType = "symlink"
		case !info.Mode().IsRegular():
			entryType = "other"
		}

		items = append(items, VolumeFileEntry{
			Name:       entry.Name(),
			Path:       entryPath,
			Type:       entryType,
			SizeBytes:  info.Size(),
			ModifiedAt: info.ModTime().UTC(),
		})
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].Type != items[j].Type {
			return items[i].Type == "directory"
		}
		return items[i].Name < items[j].Name
	})

	parentPath := ""
	if displayPath != "" {
		parentPath = filepath.Dir(displayPath)
		if parentPath == "." {
			parentPath = ""
		}
		parentPath = strings.TrimPrefix(filepath.ToSlash(parentPath), "/")
	}

	return VolumeFileListing{
		VolumeName:  volume.Name,
		Mountpoint:  volume.Mountpoint,
		CurrentPath: displayPath,
		ParentPath:  parentPath,
		Entries:     items,
	}, nil
}

func (s *resourcesService) VolumeFileContent(ctx context.Context, name, filePath string) (VolumeFileContent, error) {
	if gateway, ok := s.gateway.(docker.VolumeFilesystemGateway); ok {
		content, err := s.volumeFileContentFromDocker(ctx, gateway, name, filePath)
		if err == nil {
			return content, nil
		}
		if cerrdefs.IsNotFound(err) || cerrdefs.IsInvalidArgument(err) || cerrdefs.IsPermissionDenied(err) {
			return VolumeFileContent{}, mapVolumeFilesystemGatewayError(err)
		}
	}

	volume, resolvedPath, displayPath, _, err := s.resolveVolumePath(ctx, name, filePath)
	if err != nil {
		return VolumeFileContent{}, err
	}

	info, err := os.Stat(resolvedPath)
	if err != nil {
		return VolumeFileContent{}, mapFilesystemError(err)
	}
	if info.IsDir() {
		return VolumeFileContent{}, &codedError{code: "invalid_argument", message: "requested path is a directory"}
	}

	content, err := os.ReadFile(resolvedPath)
	if err != nil {
		return VolumeFileContent{}, mapFilesystemError(err)
	}

	truncated := false
	if len(content) > volumeFilePreviewLimit {
		content = content[:volumeFilePreviewLimit]
		truncated = true
	}

	if !utf8.Valid(content) {
		return VolumeFileContent{}, &codedError{code: "invalid_argument", message: "binary file preview is not supported"}
	}

	return VolumeFileContent{
		VolumeName: volume.Name,
		Path:       displayPath,
		Name:       filepath.Base(resolvedPath),
		SizeBytes:  info.Size(),
		ModifiedAt: info.ModTime().UTC(),
		Content:    string(content),
		Truncated:  truncated,
	}, nil
}

func (s *resourcesService) Network(ctx context.Context, id string) (NetworkDetail, error) {
	if strings.TrimSpace(id) == "" {
		return NetworkDetail{}, &codedError{code: "invalid_argument", message: "network id is required"}
	}

	network, err := s.gateway.Network(ctx, id)
	if err != nil {
		return NetworkDetail{}, wrapDockerError(err, "network not found", "network is not available in the current state")
	}

	containerNames := make([]string, 0, len(network.Containers))
	containers := make([]NetworkContainer, 0, len(network.Containers))
	for _, container := range network.Containers {
		name := strings.TrimSpace(container.Name)
		containerNames = appendUnique(containerNames, name)
		containers = append(containers, NetworkContainer{
			ID:          container.ID,
			ShortID:     shortID(container.ID),
			Name:        name,
			EndpointID:  container.EndpointID,
			MacAddress:  container.MacAddress,
			IPv4Address: container.IPv4Address,
			IPv6Address: container.IPv6Address,
		})
	}
	sort.Strings(containerNames)
	sort.Slice(containers, func(i, j int) bool {
		return containers[i].Name < containers[j].Name
	})

	ipamConfigs := make([]NetworkIPAMConfig, 0, len(network.IPAMConfigs))
	for _, config := range network.IPAMConfigs {
		ipamConfigs = append(ipamConfigs, NetworkIPAMConfig{
			Subnet:       config.Subnet,
			IPRange:      config.IPRange,
			Gateway:      config.Gateway,
			AuxAddresses: cloneStringMap(config.AuxAddresses),
		})
	}

	return NetworkDetail{
		ID:             network.ID,
		ShortID:        shortID(network.ID),
		Name:           network.Name,
		Driver:         network.Driver,
		Scope:          network.Scope,
		CreatedAt:      network.CreatedAt,
		Subnet:         network.Subnet,
		Gateway:        network.Gateway,
		Internal:       network.Internal,
		Attachable:     network.Attachable,
		Ingress:        network.Ingress,
		EnableIPv4:     network.EnableIPv4,
		EnableIPv6:     network.EnableIPv6,
		Labels:         cloneStringMap(network.Labels),
		Options:        cloneStringMap(network.Options),
		IPAMDriver:     network.IPAMDriver,
		IPAMOptions:    cloneStringMap(network.IPAMOptions),
		IPAMConfigs:    ipamConfigs,
		Containers:     containers,
		ContainerNames: containerNames,
	}, nil
}

func (s *resourcesService) resolveVolumePath(ctx context.Context, name, requestedPath string) (VolumeDetail, string, string, string, error) {
	volume, err := s.Volume(ctx, name)
	if err != nil {
		return VolumeDetail{}, "", "", "", err
	}
	if strings.TrimSpace(volume.Mountpoint) == "" {
		return VolumeDetail{}, "", "", "", &codedError{code: "conflict", message: "volume mountpoint is not available"}
	}

	rootPath := volume.Mountpoint
	if evaluated, evalErr := filepath.EvalSymlinks(rootPath); evalErr == nil {
		rootPath = evaluated
	}

	relativePath, err := normalizeRelativeVolumePath(requestedPath)
	if err != nil {
		return VolumeDetail{}, "", "", "", err
	}

	resolvedPath := filepath.Join(rootPath, filepath.FromSlash(relativePath))
	if evaluated, evalErr := filepath.EvalSymlinks(resolvedPath); evalErr == nil {
		resolvedPath = evaluated
	}

	if !pathWithinRoot(rootPath, resolvedPath) {
		return VolumeDetail{}, "", "", "", &codedError{code: "invalid_argument", message: "path escapes the volume mountpoint"}
	}

	return volume, resolvedPath, relativePath, rootPath, nil
}

func normalizeRelativeVolumePath(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" || trimmed == "." || trimmed == "/" {
		return "", nil
	}

	if filepath.IsAbs(trimmed) {
		return "", &codedError{code: "invalid_argument", message: "path must be relative to the volume root"}
	}

	cleaned := filepath.Clean(filepath.FromSlash(trimmed))
	if cleaned == "." {
		return "", nil
	}
	if cleaned == ".." || strings.HasPrefix(cleaned, ".."+string(filepath.Separator)) {
		return "", &codedError{code: "invalid_argument", message: "path escapes the volume mountpoint"}
	}

	return filepath.ToSlash(cleaned), nil
}

func pathWithinRoot(rootPath, candidatePath string) bool {
	root := filepath.Clean(rootPath)
	candidate := filepath.Clean(candidatePath)
	if root == candidate {
		return true
	}

	relativePath, err := filepath.Rel(root, candidate)
	if err != nil {
		return false
	}

	return relativePath != ".." && !strings.HasPrefix(relativePath, ".."+string(filepath.Separator))
}

func mapFilesystemError(err error) error {
	if os.IsNotExist(err) {
		return &codedError{code: "not_found", message: "requested path was not found"}
	}
	if os.IsPermission(err) {
		return &codedError{code: "conflict", message: "permission denied while reading the volume"}
	}
	return err
}

func (s *resourcesService) volumeFilesFromDocker(
	ctx context.Context,
	gateway docker.VolumeFilesystemGateway,
	name, currentPath string,
) (VolumeFileListing, error) {
	volume, err := s.Volume(ctx, name)
	if err != nil {
		return VolumeFileListing{}, err
	}

	relativePath, err := normalizeRelativeVolumePath(currentPath)
	if err != nil {
		return VolumeFileListing{}, err
	}

	entries, err := gateway.ListVolumeFiles(ctx, name, relativePath)
	if err != nil {
		return VolumeFileListing{}, err
	}

	items := make([]VolumeFileEntry, 0, len(entries))
	for _, entry := range entries {
		entryPath := entry.Name
		if relativePath != "" {
			entryPath = relativePath + "/" + entry.Name
		}

		items = append(items, VolumeFileEntry{
			Name:       entry.Name,
			Path:       entryPath,
			Type:       entry.Type,
			SizeBytes:  entry.SizeBytes,
			ModifiedAt: entry.ModifiedAt,
		})
	}

	parentPath := ""
	if relativePath != "" {
		parentPath = filepath.Dir(relativePath)
		if parentPath == "." {
			parentPath = ""
		}
		parentPath = strings.TrimPrefix(filepath.ToSlash(parentPath), "/")
	}

	return VolumeFileListing{
		VolumeName:  volume.Name,
		Mountpoint:  volume.Mountpoint,
		CurrentPath: relativePath,
		ParentPath:  parentPath,
		Entries:     items,
	}, nil
}

func (s *resourcesService) volumeFileContentFromDocker(
	ctx context.Context,
	gateway docker.VolumeFilesystemGateway,
	name, filePath string,
) (VolumeFileContent, error) {
	volume, err := s.Volume(ctx, name)
	if err != nil {
		return VolumeFileContent{}, err
	}

	relativePath, err := normalizeRelativeVolumePath(filePath)
	if err != nil {
		return VolumeFileContent{}, err
	}

	content, err := gateway.ReadVolumeFile(ctx, name, relativePath, volumeFilePreviewLimit)
	if err != nil {
		return VolumeFileContent{}, err
	}
	if !utf8.Valid(content.Content) {
		return VolumeFileContent{}, &codedError{code: "invalid_argument", message: "binary file preview is not supported"}
	}

	return VolumeFileContent{
		VolumeName: volume.Name,
		Path:       relativePath,
		Name:       content.Name,
		SizeBytes:  content.SizeBytes,
		ModifiedAt: content.ModifiedAt,
		Content:    string(content.Content),
		Truncated:  content.Truncated,
	}, nil
}

func mapVolumeFilesystemGatewayError(err error) error {
	switch {
	case cerrdefs.IsNotFound(err):
		return &codedError{code: "not_found", message: "requested path was not found", err: err}
	case cerrdefs.IsPermissionDenied(err):
		return &codedError{code: "conflict", message: "permission denied while reading the volume", err: err}
	case cerrdefs.IsInvalidArgument(err):
		return &codedError{code: "invalid_argument", message: err.Error(), err: err}
	default:
		return err
	}
}
