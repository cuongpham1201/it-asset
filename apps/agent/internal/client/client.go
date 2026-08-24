package client

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/duclamtk39/assetIT/apps/agent/internal/model"
)

const maxResponseBytes = 1 << 20

type Client struct {
	baseURL string
	token   string
	http    *http.Client
}

type EnrollmentResponse struct {
	AgentID           string `json:"agent_id"`
	AgentToken        string `json:"agent_token"`
	InventoryAccepted bool   `json:"inventory_accepted"`
}

func New(serverURL, token, caFile string, timeout time.Duration) (*Client, error) {
	base, err := url.Parse(serverURL)
	if err != nil {
		return nil, fmt.Errorf("parse server URL: %w", err)
	}
	base.Path = strings.TrimRight(base.Path, "/")
	base.RawQuery = ""
	base.Fragment = ""
	tlsConfig := &tls.Config{MinVersion: tls.VersionTLS12}
	if caFile != "" {
		pem, err := os.ReadFile(caFile)
		if err != nil {
			return nil, fmt.Errorf("read CA file: %w", err)
		}
		pool, err := x509.SystemCertPool()
		if err != nil || pool == nil {
			pool = x509.NewCertPool()
		}
		if !pool.AppendCertsFromPEM(pem) {
			return nil, errors.New("CA file contains no valid certificate")
		}
		tlsConfig.RootCAs = pool
	}
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.TLSClientConfig = tlsConfig
	return &Client{baseURL: base.String(), token: token, http: &http.Client{Timeout: timeout, Transport: transport}}, nil
}

func (c *Client) Send(ctx context.Context, payload model.InventoryEnvelope) error {
	_, err := c.do(ctx, "/api/v1/agents/inventory", payload)
	return err
}

func (c *Client) Enroll(ctx context.Context, payload model.InventoryEnvelope) (EnrollmentResponse, error) {
	data, err := c.do(ctx, "/api/v1/agents/enroll", payload)
	if err != nil {
		return EnrollmentResponse{}, err
	}
	var response EnrollmentResponse
	if err := json.Unmarshal(data, &response); err != nil {
		return response, fmt.Errorf("decode enrollment response: %w", err)
	}
	if response.AgentID == "" || response.AgentToken == "" {
		return response, errors.New("enrollment response is missing agent credentials")
	}
	return response, nil
}

func (c *Client) do(ctx context.Context, path string, payload model.InventoryEnvelope) ([]byte, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("encode inventory: %w", err)
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create inventory request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+c.token)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("User-Agent", "AssetFlow-Agent/"+payload.Agent.Version)
	request.Header.Set("X-AssetFlow-Schema-Version", payload.SchemaVersion)
	response, err := c.http.Do(request)
	if err != nil {
		return nil, fmt.Errorf("send inventory: %w", err)
	}
	defer response.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(response.Body, maxResponseBytes))
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		message := strings.TrimSpace(string(data))
		if len(message) > 300 {
			message = message[:300]
		}
		return nil, fmt.Errorf("agent endpoint returned %s: %s", response.Status, message)
	}
	return data, nil
}
