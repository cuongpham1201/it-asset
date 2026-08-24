package state

import (
	"path/filepath"
	"testing"
)

func TestSaveAndLoad(t *testing.T) {
	path := filepath.Join(t.TempDir(), "state", "agent.json")
	want := State{AgentID: "agent-id", AgentToken: "agent-token"}
	if err := Save(path, want); err != nil {
		t.Fatal(err)
	}
	got, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("unexpected state: %#v", got)
	}
}

func TestEnsureWritableCreatesStateDirectory(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "agent-state.json")
	if err := EnsureWritable(path); err != nil {
		t.Fatal(err)
	}
	want := State{AgentID: "agent-id", AgentToken: "agent-token"}
	if err := Save(path, want); err != nil {
		t.Fatal(err)
	}
}
