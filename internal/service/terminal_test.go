package service

import (
	"context"
	"io"
	"net"
	"strings"
	"testing"
	"time"

	"github.com/wanglei/docker-view/internal/audit"
	"github.com/wanglei/docker-view/internal/docker"
)

func TestTerminalServiceCreateSession(t *testing.T) {
	svc := NewTerminalService(stubTerminalGateway{
		session: docker.ExecSession{ID: "exec_1", ContainerID: "abc", TTY: true},
	}, audit.NewNopRecorder())

	session, err := svc.CreateSession(context.Background(), TerminalSessionParams{
		ContainerID: "abc",
		TTY:         true,
	})
	if err != nil {
		t.Fatalf("CreateSession() error = %v", err)
	}
	if session.SessionID != "exec_1" {
		t.Fatalf("unexpected session id %q", session.SessionID)
	}
}

func TestTerminalServiceProxySessionNotFound(t *testing.T) {
	svc := NewTerminalService(stubTerminalGateway{}, audit.NewNopRecorder())

	err := svc.ProxySession(context.Background(), "missing", stubTerminalBridge{})
	if err == nil {
		t.Fatal("expected error")
	}
	if errorCode(err) != "terminal_session_not_found" {
		t.Fatalf("unexpected error code %q", errorCode(err))
	}
}

type stubTerminalGateway struct {
	session    docker.ExecSession
	attachment docker.ExecAttachment
	inspect    docker.ExecInspect
	err        error
}

func (s stubTerminalGateway) CreateExec(context.Context, string, docker.ExecCreateOptions) (docker.ExecSession, error) {
	return s.session, s.err
}

func (s stubTerminalGateway) AttachExec(context.Context, string, bool, uint, uint) (docker.ExecAttachment, error) {
	if s.attachment.Reader == nil {
		conn := &nopConn{Reader: strings.NewReader("")}
		s.attachment = docker.ExecAttachment{
			Conn:       conn,
			Reader:     nil,
			Close:      func() {},
			CloseWrite: func() error { return nil },
		}
	}
	return s.attachment, s.err
}

func (s stubTerminalGateway) ResizeExec(context.Context, string, uint, uint) error {
	return s.err
}

func (s stubTerminalGateway) InspectExec(context.Context, string) (docker.ExecInspect, error) {
	if s.inspect.ID == "" {
		return docker.ExecInspect{ID: "exec", Running: false, ExitCode: 0}, s.err
	}
	return s.inspect, s.err
}

type stubTerminalBridge struct{}

func (stubTerminalBridge) ReadInput() (TerminalInput, error) {
	return TerminalInput{}, io.EOF
}

func (stubTerminalBridge) WriteOutput(TerminalOutput) error {
	return nil
}

func (stubTerminalBridge) Close() error {
	return nil
}

type nopConn struct {
	io.Reader
}

func (n *nopConn) Read(p []byte) (int, error)         { return n.Reader.Read(p) }
func (n *nopConn) Write(p []byte) (int, error)        { return len(p), nil }
func (n *nopConn) Close() error                       { return nil }
func (n *nopConn) LocalAddr() net.Addr                { return nil }
func (n *nopConn) RemoteAddr() net.Addr               { return nil }
func (n *nopConn) SetDeadline(_ time.Time) error      { return nil }
func (n *nopConn) SetReadDeadline(_ time.Time) error  { return nil }
func (n *nopConn) SetWriteDeadline(_ time.Time) error { return nil }
