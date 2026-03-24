package docker

import (
	"bufio"
	"context"
	"net"

	mobyclient "github.com/moby/moby/client"
)

type ExecCreateOptions struct {
	Command    []string
	User       string
	Privileged bool
	TTY        bool
	WorkingDir string
	Env        []string
	Cols       uint
	Rows       uint
}

type ExecSession struct {
	ID          string
	ContainerID string
	TTY         bool
}

type ExecInspect struct {
	ID          string
	ContainerID string
	Running     bool
	ExitCode    int
	PID         int
}

type ExecAttachment struct {
	Conn       net.Conn
	Reader     *bufio.Reader
	Close      func()
	CloseWrite func() error
}

type TerminalGateway interface {
	CreateExec(ctx context.Context, containerID string, options ExecCreateOptions) (ExecSession, error)
	AttachExec(ctx context.Context, execID string, tty bool, cols, rows uint) (ExecAttachment, error)
	ResizeExec(ctx context.Context, execID string, cols, rows uint) error
	InspectExec(ctx context.Context, execID string) (ExecInspect, error)
}

func (c *Client) CreateExec(ctx context.Context, containerID string, options ExecCreateOptions) (ExecSession, error) {
	result, err := c.client.ExecCreate(ctx, containerID, mobyclient.ExecCreateOptions{
		User:         options.User,
		Privileged:   options.Privileged,
		TTY:          options.TTY,
		ConsoleSize:  mobyclient.ConsoleSize{Height: options.Rows, Width: options.Cols},
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		Env:          append([]string(nil), options.Env...),
		WorkingDir:   options.WorkingDir,
		Cmd:          append([]string(nil), options.Command...),
	})
	if err != nil {
		return ExecSession{}, err
	}

	return ExecSession{
		ID:          result.ID,
		ContainerID: containerID,
		TTY:         options.TTY,
	}, nil
}

func (c *Client) AttachExec(ctx context.Context, execID string, tty bool, cols, rows uint) (ExecAttachment, error) {
	result, err := c.client.ExecAttach(ctx, execID, mobyclient.ExecAttachOptions{
		TTY:         tty,
		ConsoleSize: mobyclient.ConsoleSize{Height: rows, Width: cols},
	})
	if err != nil {
		return ExecAttachment{}, err
	}

	return ExecAttachment{
		Conn:   result.Conn,
		Reader: result.Reader,
		Close: func() {
			result.Close()
		},
		CloseWrite: result.CloseWrite,
	}, nil
}

func (c *Client) ResizeExec(ctx context.Context, execID string, cols, rows uint) error {
	_, err := c.client.ExecResize(ctx, execID, mobyclient.ExecResizeOptions{
		Height: rows,
		Width:  cols,
	})
	return err
}

func (c *Client) InspectExec(ctx context.Context, execID string) (ExecInspect, error) {
	result, err := c.client.ExecInspect(ctx, execID, mobyclient.ExecInspectOptions{})
	if err != nil {
		return ExecInspect{}, err
	}

	return ExecInspect{
		ID:          result.ID,
		ContainerID: result.ContainerID,
		Running:     result.Running,
		ExitCode:    result.ExitCode,
		PID:         result.PID,
	}, nil
}
