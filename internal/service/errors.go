package service

import (
	"errors"

	cerrdefs "github.com/containerd/errdefs"
)

type codedError struct {
	code    string
	message string
	err     error
}

func (e *codedError) Error() string {
	return e.message
}

func (e *codedError) Unwrap() error {
	return e.err
}

func (e *codedError) Code() string {
	return e.code
}

func errorCode(err error) string {
	var coded interface{ Code() string }
	if errors.As(err, &coded) {
		return coded.Code()
	}

	return "internal_error"
}

func errorMessage(err error) string {
	if err == nil {
		return ""
	}

	return err.Error()
}

func wrapDockerError(err error, notFoundMessage, conflictMessage string) error {
	switch {
	case cerrdefs.IsNotFound(err):
		return &codedError{
			code:    "not_found",
			message: notFoundMessage,
			err:     err,
		}
	case cerrdefs.IsConflict(err):
		return &codedError{
			code:    "conflict",
			message: conflictMessage,
			err:     err,
		}
	case cerrdefs.IsInvalidArgument(err):
		return &codedError{
			code:    "invalid_argument",
			message: "invalid request",
			err:     err,
		}
	default:
		return &codedError{
			code:    "docker_unavailable",
			message: "docker engine is unavailable",
			err:     err,
		}
	}
}
