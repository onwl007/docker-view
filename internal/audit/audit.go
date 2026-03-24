package audit

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"sync"
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

type Store interface {
	List(context.Context) ([]Event, error)
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

type MemoryStore struct {
	mu        sync.RWMutex
	events    []Event
	maxEvents int
}

func NewMemoryStore(maxEvents int) *MemoryStore {
	if maxEvents <= 0 {
		maxEvents = 500
	}

	return &MemoryStore{maxEvents: maxEvents}
}

func (s *MemoryStore) Record(_ context.Context, event Event) error {
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now().UTC()
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.events = append(s.events, event)
	if len(s.events) > s.maxEvents {
		s.events = append([]Event(nil), s.events[len(s.events)-s.maxEvents:]...)
	}

	return nil
}

func (s *MemoryStore) List(_ context.Context) ([]Event, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	items := make([]Event, 0, len(s.events))
	for index := len(s.events) - 1; index >= 0; index-- {
		items = append(items, s.events[index])
	}

	return items, nil
}

type MultiRecorder struct {
	recorders []Recorder
}

func NewMultiRecorder(recorders ...Recorder) *MultiRecorder {
	filtered := make([]Recorder, 0, len(recorders))
	for _, recorder := range recorders {
		if recorder != nil {
			filtered = append(filtered, recorder)
		}
	}

	return &MultiRecorder{recorders: filtered}
}

func (r *MultiRecorder) Record(ctx context.Context, event Event) error {
	for _, recorder := range r.recorders {
		if err := recorder.Record(ctx, event); err != nil {
			return err
		}
	}

	return nil
}

type NopRecorder struct{}

func NewNopRecorder() *NopRecorder {
	return &NopRecorder{}
}

func (r *NopRecorder) Record(context.Context, Event) error {
	return nil
}
