package model

import "time"

const SchemaVersion = "1.0"

type InventoryEnvelope struct {
	SchemaVersion string    `json:"schema_version"`
	CollectedAt   time.Time `json:"collected_at"`
	SiteCode      string    `json:"site_code,omitempty"`
	Agent         Agent     `json:"agent"`
	Device        Device    `json:"device"`
}

type Agent struct {
	ID      string `json:"id"`
	Version string `json:"version"`
}

type Device struct {
	Fingerprint string             `json:"fingerprint"`
	Hostname    string             `json:"hostname"`
	FQDN        string             `json:"fqdn,omitempty"`
	OS          OperatingSystem    `json:"os"`
	Hardware    Hardware           `json:"hardware"`
	Interfaces  []NetworkInterface `json:"network_interfaces"`
}

type OperatingSystem struct {
	Family  string `json:"family"`
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
	Build   string `json:"build,omitempty"`
	Kernel  string `json:"kernel,omitempty"`
	Arch    string `json:"arch"`
}

type Hardware struct {
	Manufacturer string `json:"manufacturer,omitempty"`
	Model        string `json:"model,omitempty"`
	SerialNumber string `json:"serial_number,omitempty"`
	SystemUUID   string `json:"system_uuid,omitempty"`
	CPUModel     string `json:"cpu_model,omitempty"`
	LogicalCPUs  int    `json:"logical_cpus"`
	MemoryBytes  uint64 `json:"memory_bytes,omitempty"`
	Disks        []Disk `json:"disks,omitempty"`
}

type Disk struct {
	Name      string `json:"name"`
	Model     string `json:"model,omitempty"`
	Serial    string `json:"serial,omitempty"`
	Type      string `json:"type,omitempty"`
	SizeBytes uint64 `json:"size_bytes,omitempty"`
}

type NetworkInterface struct {
	Name       string   `json:"name"`
	MACAddress string   `json:"mac_address,omitempty"`
	Addresses  []string `json:"addresses,omitempty"`
}
