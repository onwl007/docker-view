package service

import (
	"context"
	"testing"
	"time"

	"github.com/wanglei/docker-view/internal/audit"
)

func TestAuditServiceEventsFiltersAndLimits(t *testing.T) {
	store := audit.NewMemoryStore(10)
	_ = store.Record(context.Background(), audit.Event{
		EventType:  "container.lifecycle",
		TargetType: "container",
		TargetID:   "nginx",
		Action:     "restart",
		Actor:      "alice",
		Result:     "success",
		Timestamp:  time.Date(2026, time.March, 24, 8, 0, 0, 0, time.UTC),
	})
	_ = store.Record(context.Background(), audit.Event{
		EventType:  "settings.change",
		TargetType: "settings",
		TargetID:   "settings",
		Action:     "save",
		Actor:      "bob",
		Result:     "failure",
		Timestamp:  time.Date(2026, time.March, 24, 9, 0, 0, 0, time.UTC),
	})

	svc := NewAuditService(store)
	result, err := svc.Events(context.Background(), AuditListParams{
		Query:  "bob",
		Result: "failure",
		Limit:  1,
	})
	if err != nil {
		t.Fatalf("Events() error = %v", err)
	}

	if result.Total != 1 || len(result.Items) != 1 {
		t.Fatalf("unexpected result %+v", result)
	}
	if result.Items[0].Action != "save" {
		t.Fatalf("unexpected action %q", result.Items[0].Action)
	}
}
