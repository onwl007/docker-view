package service

import (
	"bufio"
	"context"
	"encoding/binary"
	"errors"
	"io"
	"strings"
	"sync"
	"time"

	mobystdcopy "github.com/moby/moby/api/pkg/stdcopy"
	"github.com/wanglei/docker-view/internal/docker"
)

type TerminalService interface {
	CreateSession(ctx context.Context, params TerminalSessionParams) (TerminalSession, error)
	ProxySession(ctx context.Context, sessionID string, bridge TerminalBridge) error
}

type TerminalSessionParams struct {
	ContainerID string
	Command     []string
	User        string
	Privileged  bool
	TTY         bool
	WorkingDir  string
	Env         []string
	Cols        uint
	Rows        uint
	Audit       AuditMetadata
}

type TerminalSession struct {
	SessionID     string `json:"sessionId"`
	WebSocketPath string `json:"websocketPath"`
}

type TerminalInput struct {
	Type string `json:"type"`
	Data string `json:"data,omitempty"`
	Cols uint   `json:"cols,omitempty"`
	Rows uint   `json:"rows,omitempty"`
}

type TerminalOutput struct {
	Type     string `json:"type"`
	Data     string `json:"data,omitempty"`
	ExitCode int    `json:"exitCode,omitempty"`
	Message  string `json:"message,omitempty"`
}

type TerminalBridge interface {
	ReadInput() (TerminalInput, error)
	WriteOutput(TerminalOutput) error
	Close() error
}

type terminalSessionRecord struct {
	id          string
	containerID string
	tty         bool
	cols        uint
	rows        uint
}

type terminalService struct {
	gateway  docker.TerminalGateway
	audit    interface{}
	mu       sync.RWMutex
	sessions map[string]terminalSessionRecord
}

func NewTerminalService(gateway docker.TerminalGateway) TerminalService {
	return &terminalService{
		gateway:  gateway,
		sessions: make(map[string]terminalSessionRecord),
	}
}

func (s *terminalService) CreateSession(ctx context.Context, params TerminalSessionParams) (TerminalSession, error) {
	if strings.TrimSpace(params.ContainerID) == "" {
		return TerminalSession{}, &codedError{code: "invalid_argument", message: "container id is required"}
	}

	command := params.Command
	if len(command) == 0 {
		command = []string{"/bin/sh"}
	}

	session, err := s.gateway.CreateExec(ctx, params.ContainerID, docker.ExecCreateOptions{
		Command:    command,
		User:       params.User,
		Privileged: params.Privileged,
		TTY:        params.TTY,
		WorkingDir: params.WorkingDir,
		Env:        append([]string(nil), params.Env...),
		Cols:       params.Cols,
		Rows:       params.Rows,
	})
	if err != nil {
		return TerminalSession{}, wrapDockerError(err, "container not found", "terminal session cannot be created")
	}

	s.mu.Lock()
	s.sessions[session.ID] = terminalSessionRecord{
		id:          session.ID,
		containerID: params.ContainerID,
		tty:         params.TTY,
		cols:        params.Cols,
		rows:        params.Rows,
	}
	s.mu.Unlock()

	return TerminalSession{
		SessionID:     session.ID,
		WebSocketPath: "/api/v1/terminal/sessions/" + session.ID + "/ws",
	}, nil
}

func (s *terminalService) ProxySession(ctx context.Context, sessionID string, bridge TerminalBridge) error {
	record, ok := s.getSession(sessionID)
	if !ok {
		return &codedError{code: "terminal_session_not_found", message: "terminal session not found"}
	}
	defer s.deleteSession(sessionID)

	attachment, err := s.gateway.AttachExec(ctx, sessionID, record.tty, record.cols, record.rows)
	if err != nil {
		return wrapDockerError(err, "terminal session not found", "terminal session is not available")
	}
	defer attachment.Close()

	runCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	errCh := make(chan error, 3)

	go func() {
		errCh <- s.forwardTerminalInput(runCtx, sessionID, attachment, bridge)
	}()
	go func() {
		errCh <- s.forwardTerminalOutput(runCtx, record.tty, attachment.Reader, bridge)
	}()
	go func() {
		errCh <- s.watchTerminalExit(runCtx, sessionID, bridge)
	}()

	var finalErr error
	for i := 0; i < 3; i++ {
		err := <-errCh
		if err == nil || errors.Is(err, context.Canceled) || errors.Is(err, io.EOF) {
			cancel()
			continue
		}
		if finalErr == nil {
			finalErr = err
		}
		cancel()
	}

	_ = bridge.Close()
	return finalErr
}

func (s *terminalService) getSession(id string) (terminalSessionRecord, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.sessions[id]
	return record, ok
}

func (s *terminalService) deleteSession(id string) {
	s.mu.Lock()
	delete(s.sessions, id)
	s.mu.Unlock()
}

func (s *terminalService) forwardTerminalInput(ctx context.Context, sessionID string, attachment docker.ExecAttachment, bridge TerminalBridge) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		message, err := bridge.ReadInput()
		if err != nil {
			return err
		}

		switch message.Type {
		case "stdin":
			if message.Data == "" {
				continue
			}
			if _, err := io.WriteString(attachment.Conn, message.Data); err != nil {
				return err
			}
		case "resize":
			if err := s.gateway.ResizeExec(ctx, sessionID, message.Cols, message.Rows); err != nil {
				return err
			}
		case "close":
			if attachment.CloseWrite != nil {
				return attachment.CloseWrite()
			}
			return io.EOF
		default:
			return &codedError{code: "invalid_argument", message: "unknown terminal message type"}
		}
	}
}

func (s *terminalService) forwardTerminalOutput(ctx context.Context, tty bool, reader *bufio.Reader, bridge TerminalBridge) error {
	if tty {
		buffer := make([]byte, 4096)
		for {
			select {
			case <-ctx.Done():
				return ctx.Err()
			default:
			}

			count, err := reader.Read(buffer)
			if count > 0 {
				if writeErr := bridge.WriteOutput(TerminalOutput{
					Type: "stdout",
					Data: string(buffer[:count]),
				}); writeErr != nil {
					return writeErr
				}
			}
			if err != nil {
				return err
			}
		}
	}

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		stream, payload, err := readTerminalFrame(reader)
		if err != nil {
			return err
		}
		if err := bridge.WriteOutput(TerminalOutput{
			Type: stream,
			Data: string(payload),
		}); err != nil {
			return err
		}
	}
}

func (s *terminalService) watchTerminalExit(ctx context.Context, sessionID string, bridge TerminalBridge) error {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			inspect, err := s.gateway.InspectExec(ctx, sessionID)
			if err != nil {
				return err
			}
			if inspect.Running {
				continue
			}
			if err := bridge.WriteOutput(TerminalOutput{
				Type:     "exit",
				ExitCode: inspect.ExitCode,
			}); err != nil {
				return err
			}
			return nil
		}
	}
}

func readTerminalFrame(reader io.Reader) (string, []byte, error) {
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
	case byte(mobystdcopy.Stderr):
		return "stderr", payload, nil
	default:
		return "stdout", payload, nil
	}
}
