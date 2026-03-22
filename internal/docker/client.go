package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"time"
)

type Summary struct {
	DockerHost        string
	HostName          string
	DockerVersion     string
	APIVersion        string
	ContainersTotal   int
	ContainersRunning int
	ContainersStopped int
	ImagesTotal       int
	VolumesTotal      int
	NetworksTotal     int
	CPUCores          int
	MemoryBytes       int64
}

type Gateway interface {
	Summary(ctx context.Context) (Summary, error)
}

type Client struct {
	baseURL    string
	httpClient *http.Client
	dockerHost string
}

func NewClient(host string) (*Client, error) {
	parsed, err := url.Parse(host)
	if err != nil {
		return nil, fmt.Errorf("parse docker host: %w", err)
	}

	transport := http.DefaultTransport.(*http.Transport).Clone()
	baseURL := host

	switch parsed.Scheme {
	case "unix":
		socketPath := parsed.Path
		transport.DialContext = func(ctx context.Context, _, _ string) (net.Conn, error) {
			var dialer net.Dialer
			return dialer.DialContext(ctx, "unix", socketPath)
		}
		baseURL = "http://docker"
	case "tcp":
		baseURL = "http://" + parsed.Host
	case "http", "https":
		baseURL = host
	default:
		return nil, fmt.Errorf("unsupported docker host scheme %q", parsed.Scheme)
	}

	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout:   5 * time.Second,
			Transport: transport,
		},
		dockerHost: host,
	}, nil
}

func (c *Client) Summary(ctx context.Context) (Summary, error) {
	if err := c.ping(ctx); err != nil {
		return Summary{}, err
	}

	info, err := c.info(ctx)
	if err != nil {
		return Summary{}, err
	}

	version, err := c.version(ctx)
	if err != nil {
		return Summary{}, err
	}

	volumes, err := c.volumeCount(ctx)
	if err != nil {
		return Summary{}, err
	}

	networks, err := c.networkCount(ctx)
	if err != nil {
		return Summary{}, err
	}

	return Summary{
		DockerHost:        c.dockerHost,
		HostName:          info.Name,
		DockerVersion:     version.Version,
		APIVersion:        version.APIVersion,
		ContainersTotal:   info.Containers,
		ContainersRunning: info.ContainersRunning,
		ContainersStopped: info.ContainersStopped,
		ImagesTotal:       info.Images,
		VolumesTotal:      volumes,
		NetworksTotal:     networks,
		CPUCores:          info.NCPU,
		MemoryBytes:       info.MemTotal,
	}, nil
}

func (c *Client) ping(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/_ping", nil)
	if err != nil {
		return fmt.Errorf("build ping request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("ping docker engine: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ping docker engine: unexpected status %d", resp.StatusCode)
	}

	return nil
}

func (c *Client) info(ctx context.Context) (systemInfoResponse, error) {
	var payload systemInfoResponse
	if err := c.getJSON(ctx, "/info", &payload); err != nil {
		return systemInfoResponse{}, err
	}
	return payload, nil
}

func (c *Client) version(ctx context.Context) (versionResponse, error) {
	var payload versionResponse
	if err := c.getJSON(ctx, "/version", &payload); err != nil {
		return versionResponse{}, err
	}
	return payload, nil
}

func (c *Client) volumeCount(ctx context.Context) (int, error) {
	var payload volumeListResponse
	if err := c.getJSON(ctx, "/volumes", &payload); err != nil {
		return 0, err
	}
	return len(payload.Volumes), nil
}

func (c *Client) networkCount(ctx context.Context) (int, error) {
	var payload []networkResponse
	if err := c.getJSON(ctx, "/networks", &payload); err != nil {
		return 0, err
	}
	return len(payload), nil
}

func (c *Client) getJSON(ctx context.Context, path string, target any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return fmt.Errorf("build request %q: %w", path, err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request %q: %w", path, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("request %q: unexpected status %d", path, resp.StatusCode)
	}

	if err := json.NewDecoder(resp.Body).Decode(target); err != nil {
		return fmt.Errorf("decode %q response: %w", path, err)
	}

	return nil
}

type systemInfoResponse struct {
	Name              string `json:"Name"`
	Containers        int    `json:"Containers"`
	ContainersRunning int    `json:"ContainersRunning"`
	ContainersStopped int    `json:"ContainersStopped"`
	Images            int    `json:"Images"`
	NCPU              int    `json:"NCPU"`
	MemTotal          int64  `json:"MemTotal"`
}

type versionResponse struct {
	Version    string `json:"Version"`
	APIVersion string `json:"ApiVersion"`
}

type volumeListResponse struct {
	Volumes []json.RawMessage `json:"Volumes"`
}

type networkResponse struct {
	ID string `json:"Id"`
}
