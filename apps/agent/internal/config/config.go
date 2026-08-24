package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"
)

const (
	defaultInterval = 30 * time.Minute
	defaultTimeout  = 20 * time.Second
)

type Config struct {
	ServerURL       string `json:"server_url"`
	EnrollmentToken string `json:"enrollment_token"`
	SiteCode        string `json:"site_code,omitempty"`
	Interval        string `json:"interval,omitempty"`
	RequestTimeout  string `json:"request_timeout,omitempty"`
	CAFile          string `json:"ca_file,omitempty"`
	StateFile       string `json:"state_file,omitempty"`
	AllowHTTP       bool   `json:"allow_http,omitempty"`
}

func DefaultPath() string {
	if value := strings.TrimSpace(os.Getenv("ASSETFLOW_AGENT_CONFIG")); value != "" {
		return value
	}
	if runtime.GOOS == "windows" {
		if root := os.Getenv("ProgramData"); root != "" {
			return root + `\AssetFlow\agent.json`
		}
		return `C:\ProgramData\AssetFlow\agent.json`
	}
	return "/etc/assetflow/agent.json"
}

func Load(path string) (Config, error) {
	var cfg Config
	data, err := os.ReadFile(path)
	if err != nil {
		return cfg, fmt.Errorf("read agent config: %w", err)
	}
	decoder := json.NewDecoder(strings.NewReader(string(data)))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&cfg); err != nil {
		return cfg, fmt.Errorf("parse agent config: %w", err)
	}
	applyEnvironment(&cfg)
	if strings.TrimSpace(cfg.StateFile) == "" {
		cfg.StateFile = DefaultStatePath()
	}
	return cfg, cfg.Validate()
}

func DefaultStatePath() string {
	if runtime.GOOS == "windows" {
		if root := os.Getenv("ProgramData"); root != "" {
			return root + `\AssetFlow\agent-state.json`
		}
		return `C:\ProgramData\AssetFlow\agent-state.json`
	}
	return "/var/lib/assetflow-agent/state.json"
}

func (c Config) IntervalDuration() time.Duration {
	if value, err := time.ParseDuration(c.Interval); err == nil && value > 0 {
		return value
	}
	return defaultInterval
}

func (c Config) TimeoutDuration() time.Duration {
	if value, err := time.ParseDuration(c.RequestTimeout); err == nil && value > 0 {
		return value
	}
	return defaultTimeout
}

func (c Config) Validate() error {
	if strings.TrimSpace(c.ServerURL) == "" {
		return errors.New("server_url is required")
	}
	u, err := url.Parse(c.ServerURL)
	if err != nil || u.Host == "" {
		return errors.New("server_url must be an absolute URL")
	}
	if u.Scheme != "https" {
		local := u.Scheme == "http" && (u.Hostname() == "localhost" || u.Hostname() == "127.0.0.1" || u.Hostname() == "::1")
		if !c.AllowHTTP && !local {
			return errors.New("server_url must use HTTPS; allow_http is for isolated development only")
		}
	}
	if c.Interval != "" {
		value, err := time.ParseDuration(c.Interval)
		if err != nil || value < time.Minute {
			return errors.New("interval must be a duration of at least 1m")
		}
	}
	if c.RequestTimeout != "" {
		value, err := time.ParseDuration(c.RequestTimeout)
		if err != nil || value <= 0 || value > 2*time.Minute {
			return errors.New("request_timeout must be greater than 0 and at most 2m")
		}
	}
	return nil
}

func applyEnvironment(cfg *Config) {
	setString(&cfg.ServerURL, "ASSETFLOW_SERVER_URL")
	setString(&cfg.EnrollmentToken, "ASSETFLOW_ENROLLMENT_TOKEN")
	setString(&cfg.SiteCode, "ASSETFLOW_SITE_CODE")
	setString(&cfg.Interval, "ASSETFLOW_AGENT_INTERVAL")
	setString(&cfg.RequestTimeout, "ASSETFLOW_AGENT_TIMEOUT")
	setString(&cfg.CAFile, "ASSETFLOW_CA_FILE")
	setString(&cfg.StateFile, "ASSETFLOW_AGENT_STATE_FILE")
	if raw := strings.TrimSpace(os.Getenv("ASSETFLOW_ALLOW_HTTP")); raw != "" {
		if value, err := strconv.ParseBool(raw); err == nil {
			cfg.AllowHTTP = value
		}
	}
}

func setString(target *string, key string) {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		*target = value
	}
}
