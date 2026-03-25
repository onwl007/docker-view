package docker

import (
	"archive/tar"
	"context"
	"fmt"
	"io"
	"path"
	"sort"
	"strings"
	"time"

	cerrdefs "github.com/containerd/errdefs"
	mobycontainer "github.com/moby/moby/api/types/container"
	mobymount "github.com/moby/moby/api/types/mount"
	mobyclient "github.com/moby/moby/client"
)

const volumeArchiveMountTarget = "/volume"

type VolumeFilesystemGateway interface {
	ListVolumeFiles(ctx context.Context, name, relativePath string) ([]VolumeFileArchiveEntry, error)
	ReadVolumeFile(ctx context.Context, name, relativePath string, limit int64) (VolumeFileReadResult, error)
}

type VolumeFileArchiveEntry struct {
	Name       string
	Type       string
	SizeBytes  int64
	ModifiedAt time.Time
}

type VolumeFileReadResult struct {
	Name       string
	SizeBytes  int64
	ModifiedAt time.Time
	Content    []byte
	Truncated  bool
}

func (c *Client) ListVolumeFiles(ctx context.Context, name, relativePath string) ([]VolumeFileArchiveEntry, error) {
	result, cleanup, err := c.copyVolumePath(ctx, name, relativePath)
	if err != nil {
		return nil, err
	}
	defer cleanup()

	if !result.Stat.Mode.IsDir() {
		return nil, cerrdefs.ErrInvalidArgument.WithMessage("requested path is not a directory")
	}

	entries, err := decodeVolumeDirectoryArchive(result.Content, result.Stat)
	if err != nil {
		return nil, err
	}
	return entries, nil
}

func (c *Client) ReadVolumeFile(ctx context.Context, name, relativePath string, limit int64) (VolumeFileReadResult, error) {
	result, cleanup, err := c.copyVolumePath(ctx, name, relativePath)
	if err != nil {
		return VolumeFileReadResult{}, err
	}
	defer cleanup()

	if result.Stat.Mode.IsDir() {
		return VolumeFileReadResult{}, cerrdefs.ErrInvalidArgument.WithMessage("requested path is a directory")
	}

	reader := tar.NewReader(result.Content)
	for {
		header, err := reader.Next()
		if err == io.EOF {
			return VolumeFileReadResult{}, cerrdefs.ErrNotFound.WithMessage("requested path was not found")
		}
		if err != nil {
			return VolumeFileReadResult{}, fmt.Errorf("read volume archive: %w", err)
		}
		if header.Typeflag == tar.TypeDir {
			continue
		}

		content, readErr := io.ReadAll(io.LimitReader(reader, limit+1))
		if readErr != nil {
			return VolumeFileReadResult{}, fmt.Errorf("read volume file content: %w", readErr)
		}

		truncated := false
		if int64(len(content)) > limit {
			content = content[:limit]
			truncated = true
		}

		return VolumeFileReadResult{
			Name:       result.Stat.Name,
			SizeBytes:  result.Stat.Size,
			ModifiedAt: result.Stat.Mtime.UTC(),
			Content:    content,
			Truncated:  truncated,
		}, nil
	}
}

func (c *Client) copyVolumePath(ctx context.Context, name, relativePath string) (mobyclient.CopyFromContainerResult, func(), error) {
	imageRef, err := c.volumeHelperImage(ctx)
	if err != nil {
		return mobyclient.CopyFromContainerResult{}, nil, err
	}

	containerID, err := c.createVolumeHelperContainer(ctx, imageRef, name)
	if err != nil {
		return mobyclient.CopyFromContainerResult{}, nil, err
	}

	cleanup := func() {
		_, _ = c.client.ContainerRemove(context.WithoutCancel(ctx), containerID, mobyclient.ContainerRemoveOptions{
			Force: true,
		})
	}

	sourcePath := volumeArchiveMountTarget
	if trimmed := strings.Trim(strings.TrimSpace(relativePath), "/"); trimmed != "" {
		sourcePath = path.Join(volumeArchiveMountTarget, trimmed)
	}

	result, copyErr := c.client.CopyFromContainer(ctx, containerID, mobyclient.CopyFromContainerOptions{
		SourcePath: sourcePath,
	})
	if copyErr != nil {
		cleanup()
		return mobyclient.CopyFromContainerResult{}, nil, copyErr
	}

	return result, func() {
		_ = result.Content.Close()
		cleanup()
	}, nil
}

func (c *Client) volumeHelperImage(ctx context.Context) (string, error) {
	images, err := c.Images(ctx)
	if err != nil {
		return "", err
	}

	for _, image := range images {
		if ref := strings.TrimSpace(image.ID); ref != "" {
			return ref, nil
		}
		for _, tag := range image.RepoTags {
			trimmed := strings.TrimSpace(tag)
			if trimmed != "" && trimmed != "<none>:<none>" {
				return trimmed, nil
			}
		}
	}

	return "", cerrdefs.ErrFailedPrecondition.WithMessage("no local image is available for volume file access")
}

func (c *Client) createVolumeHelperContainer(ctx context.Context, imageRef, volumeName string) (string, error) {
	result, err := c.client.ContainerCreate(ctx, mobyclient.ContainerCreateOptions{
		Image: imageRef,
		Config: &mobycontainer.Config{
			Cmd: []string{"true"},
		},
		HostConfig: &mobycontainer.HostConfig{
			Mounts: []mobymount.Mount{{
				Type:     mobymount.TypeVolume,
				Source:   volumeName,
				Target:   volumeArchiveMountTarget,
				ReadOnly: true,
			}},
		},
	})
	if err != nil {
		return "", err
	}

	return result.ID, nil
}

func decodeVolumeDirectoryArchive(content io.Reader, stat mobycontainer.PathStat) ([]VolumeFileArchiveEntry, error) {
	rootName := strings.Trim(strings.TrimSpace(stat.Name), "/")
	reader := tar.NewReader(content)
	entriesByName := make(map[string]VolumeFileArchiveEntry)

	for {
		header, err := reader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("read volume directory archive: %w", err)
		}

		headerName := strings.TrimPrefix(path.Clean(strings.TrimPrefix(header.Name, "./")), "/")
		if headerName == "." || headerName == "" {
			continue
		}

		relativeName := headerName
		if rootName != "" {
			if headerName == rootName {
				continue
			}
			prefix := rootName + "/"
			if !strings.HasPrefix(headerName, prefix) {
				continue
			}
			relativeName = strings.TrimPrefix(headerName, prefix)
		}

		if relativeName == "" || relativeName == "." {
			continue
		}

		childName, nested := splitArchiveChild(relativeName)
		existing, exists := entriesByName[childName]
		if nested {
			if !exists {
				entriesByName[childName] = VolumeFileArchiveEntry{
					Name:       childName,
					Type:       "directory",
					ModifiedAt: header.ModTime.UTC(),
				}
			}
			continue
		}

		entry := VolumeFileArchiveEntry{
			Name:       childName,
			Type:       archiveEntryType(header),
			SizeBytes:  header.Size,
			ModifiedAt: header.ModTime.UTC(),
		}
		if exists && existing.Type == "directory" && entry.Type != "directory" {
			continue
		}
		entriesByName[childName] = entry
	}

	entries := make([]VolumeFileArchiveEntry, 0, len(entriesByName))
	for _, entry := range entriesByName {
		entries = append(entries, entry)
	}
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].Type != entries[j].Type {
			return entries[i].Type == "directory"
		}
		return entries[i].Name < entries[j].Name
	})

	return entries, nil
}

func splitArchiveChild(relativeName string) (string, bool) {
	parts := strings.SplitN(relativeName, "/", 2)
	if len(parts) == 1 {
		return parts[0], false
	}
	return parts[0], true
}

func archiveEntryType(header *tar.Header) string {
	switch header.Typeflag {
	case tar.TypeDir:
		return "directory"
	case tar.TypeSymlink, tar.TypeLink:
		return "symlink"
	case tar.TypeReg, tar.TypeRegA:
		return "file"
	default:
		return "other"
	}
}
