package client

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/duclamtk39/assetIT/apps/agent/internal/model"
)

func TestSendUsesVersionedAuthenticatedEndpoint(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/api/v1/agents/inventory" {
			t.Errorf("unexpected endpoint: %s", request.URL.Path)
		}
		if request.Header.Get("Authorization") != "Bearer agent-credential" {
			t.Error("missing agent credential")
		}
		if request.Header.Get("X-AssetFlow-Schema-Version") != model.SchemaVersion {
			t.Error("missing schema version")
		}
		response.WriteHeader(http.StatusAccepted)
	}))
	defer server.Close()

	api, err := New(server.URL, "agent-credential", "", time.Second)
	if err != nil {
		t.Fatal(err)
	}
	payload := model.InventoryEnvelope{SchemaVersion: model.SchemaVersion, Agent: model.Agent{Version: "test"}}
	if err := api.Send(context.Background(), payload); err != nil {
		t.Fatal(err)
	}
}

func TestEnrollReturnsAgentCredential(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/api/v1/agents/enroll" {
			t.Errorf("unexpected endpoint: %s", request.URL.Path)
		}
		response.Header().Set("Content-Type", "application/json")
		_, _ = response.Write([]byte(`{"agent_id":"agent-1","agent_token":"token-1","inventory_accepted":true}`))
	}))
	defer server.Close()
	api, err := New(server.URL, "enrollment-secret", "", time.Second)
	if err != nil {
		t.Fatal(err)
	}
	result, err := api.Enroll(context.Background(), model.InventoryEnvelope{SchemaVersion: model.SchemaVersion, Agent: model.Agent{Version: "test"}})
	if err != nil {
		t.Fatal(err)
	}
	if result.AgentID != "agent-1" || result.AgentToken != "token-1" {
		t.Fatalf("unexpected enrollment: %#v", result)
	}
}
