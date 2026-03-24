package docker

import (
	"bufio"
	"context"
	"encoding/binary"
	"errors"
	"io"
	"strings"
	"time"

	mobystdcopy "github.com/moby/moby/api/pkg/stdcopy"
	mobyclient "github.com/moby/moby/client"
)

type LogOptions struct {
	ShowStdout bool
	ShowStderr bool
	Since      string
	Until      string
	Tail       string
	Timestamps bool
	Follow     bool
}

type LogEntry struct {
	Stream    string
	Timestamp time.Time
	Message   string
}

type LogGateway interface {
	Logs(ctx context.Context, containerID string, options LogOptions) ([]LogEntry, error)
	StreamLogs(ctx context.Context, containerID string, options LogOptions, send func(LogEntry) error) error
}

func (c *Client) Logs(ctx context.Context, containerID string, options LogOptions) ([]LogEntry, error) {
	entries := make([]LogEntry, 0, 128)
	err := c.streamLogs(ctx, containerID, options, func(entry LogEntry) error {
		entries = append(entries, entry)
		return nil
	})
	if err != nil {
		return nil, err
	}

	return entries, nil
}

func (c *Client) StreamLogs(ctx context.Context, containerID string, options LogOptions, send func(LogEntry) error) error {
	return c.streamLogs(ctx, containerID, options, send)
}

func (c *Client) streamLogs(ctx context.Context, containerID string, options LogOptions, send func(LogEntry) error) error {
	inspectResult, err := c.client.ContainerInspect(ctx, containerID, mobyclient.ContainerInspectOptions{})
	if err != nil {
		return err
	}

	if !options.ShowStdout && !options.ShowStderr {
		options.ShowStdout = true
		options.ShowStderr = true
	}
	if options.Tail == "" {
		options.Tail = "200"
	}

	reader, err := c.client.ContainerLogs(ctx, containerID, mobyclient.ContainerLogsOptions{
		ShowStdout: options.ShowStdout,
		ShowStderr: options.ShowStderr,
		Since:      options.Since,
		Until:      options.Until,
		Timestamps: options.Timestamps,
		Follow:     options.Follow,
		Tail:       options.Tail,
	})
	if err != nil {
		return err
	}
	defer reader.Close()

	if inspectResult.Container.Config != nil && inspectResult.Container.Config.Tty {
		return streamTTYLogs(reader, options.Timestamps, send)
	}

	return streamMultiplexedLogs(reader, options.Timestamps, send)
}

func streamTTYLogs(reader io.Reader, timestamps bool, send func(LogEntry) error) error {
	scanner := bufio.NewScanner(reader)
	buffer := make([]byte, 0, 64*1024)
	scanner.Buffer(buffer, 1024*1024)

	for scanner.Scan() {
		entry := parseLogLine("stdout", scanner.Text(), timestamps)
		if err := send(entry); err != nil {
			return err
		}
	}

	return scanner.Err()
}

func streamMultiplexedLogs(reader io.Reader, timestamps bool, send func(LogEntry) error) error {
	var stdoutRemainder string
	var stderrRemainder string

	for {
		stream, payload, err := readDockerFrame(reader)
		if err != nil {
			if errors.Is(err, io.EOF) {
				if strings.TrimSpace(stdoutRemainder) != "" {
					if err := send(parseLogLine("stdout", stdoutRemainder, timestamps)); err != nil {
						return err
					}
				}
				if strings.TrimSpace(stderrRemainder) != "" {
					if err := send(parseLogLine("stderr", stderrRemainder, timestamps)); err != nil {
						return err
					}
				}
				return nil
			}
			return err
		}

		lines, remainder := splitDockerChunk(remainderForStream(stream, stdoutRemainder, stderrRemainder), string(payload))
		switch stream {
		case "stdout":
			stdoutRemainder = remainder
		case "stderr":
			stderrRemainder = remainder
		default:
			continue
		}

		for _, line := range lines {
			if strings.TrimSpace(line) == "" {
				continue
			}
			if err := send(parseLogLine(stream, line, timestamps)); err != nil {
				return err
			}
		}
	}
}

func readDockerFrame(reader io.Reader) (string, []byte, error) {
	header := make([]byte, 8)
	if _, err := io.ReadFull(reader, header); err != nil {
		return "", nil, err
	}

	size := binary.BigEndian.Uint32(header[4:])
	payload := make([]byte, size)
	if _, err := io.ReadFull(reader, payload); err != nil {
		return "", nil, err
	}

	switch header[0] {
	case byte(mobystdcopy.Stdout):
		return "stdout", payload, nil
	case byte(mobystdcopy.Stderr):
		return "stderr", payload, nil
	default:
		return "stdout", payload, nil
	}
}

func splitDockerChunk(existing, chunk string) ([]string, string) {
	combined := existing + chunk
	parts := strings.Split(combined, "\n")
	if len(parts) == 1 {
		return nil, combined
	}

	return parts[:len(parts)-1], parts[len(parts)-1]
}

func remainderForStream(stream, stdoutRemainder, stderrRemainder string) string {
	if stream == "stderr" {
		return stderrRemainder
	}
	return stdoutRemainder
}

func parseLogLine(stream, line string, timestamps bool) LogEntry {
	entry := LogEntry{
		Stream:  stream,
		Message: line,
	}

	if !timestamps {
		return entry
	}

	index := strings.IndexByte(line, ' ')
	if index <= 0 {
		return entry
	}

	timestamp, err := time.Parse(time.RFC3339Nano, line[:index])
	if err != nil {
		return entry
	}

	entry.Timestamp = timestamp.UTC()
	entry.Message = line[index+1:]
	return entry
}
