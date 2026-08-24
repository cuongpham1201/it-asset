package state

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

type State struct {
	AgentID    string `json:"agent_id"`
	AgentToken string `json:"agent_token"`
}

// EnsureWritable verifies the credential directory before enrollment. Without
// this preflight the API could accept a device while the Agent cannot persist
// the one-time credential returned by the server.
func EnsureWritable(path string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return fmt.Errorf("create state directory: %w", err)
	}
	temporary, err := os.CreateTemp(filepath.Dir(path), ".assetflow-state-check-*")
	if err != nil {
		return fmt.Errorf("state directory is not writable: %w", err)
	}
	temporaryPath := temporary.Name()
	if err := temporary.Close(); err != nil {
		_ = os.Remove(temporaryPath)
		return fmt.Errorf("close state preflight file: %w", err)
	}
	if err := os.Remove(temporaryPath); err != nil {
		return fmt.Errorf("remove state preflight file: %w", err)
	}
	return nil
}

func Load(path string) (State, error) {
	var value State
	data, err := os.ReadFile(path)
	if err != nil {
		return value, err
	}
	if err := json.Unmarshal(data, &value); err != nil {
		return value, fmt.Errorf("parse agent state: %w", err)
	}
	if value.AgentID == "" || value.AgentToken == "" {
		return value, errors.New("agent state is incomplete")
	}
	return value, nil
}

func Save(path string, value State) error {
	if value.AgentID == "" || value.AgentToken == "" {
		return errors.New("agent state is incomplete")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return fmt.Errorf("create state directory: %w", err)
	}
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	temporary := path + ".tmp"
	if err := os.WriteFile(temporary, data, 0600); err != nil {
		return fmt.Errorf("write agent state: %w", err)
	}
	if err := os.Rename(temporary, path); err != nil {
		return fmt.Errorf("replace agent state: %w", err)
	}
	_ = os.Chmod(path, 0600)
	return nil
}
