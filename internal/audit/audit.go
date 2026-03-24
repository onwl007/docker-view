package audit

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"time"
)

type Event struct {
	EventType  string         `json:"eventType"`
	TargetType string         `json:"targetType"`
	TargetID   string         `json:"targetId"`
	Action     string         `json:"action"`
	Actor      string         `json:"actor"`
	Source     string         `json:"source"`
	Result     string         `json:"result"`
	Timestamp  time.Time      `json:"timestamp"`
	Details    map[string]any `json:"details,omitempty"`
}

type Recorder interface {
	Record(context.Context, Event) error
}

type LogRecorder struct {
	logger *log.Logger
}

func NewLogRecorder(writer io.Writer) *LogRecorder {
	return &LogRecorder{
		logger: log.New(writer, "", 0),
	}
}

func (r *LogRecorder) Record(_ context.Context, event Event) error {
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now().UTC()
	}

	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}

	r.logger.Print(string(payload))
	return nil
}
