//go:build windows

package inventory

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"

	"github.com/duclamtk39/assetIT/apps/agent/internal/model"
)

type windowsInventory struct {
	Manufacturer string `json:"manufacturer"`
	Model        string `json:"model"`
	Serial       string `json:"serial"`
	UUID         string `json:"uuid"`
	CPU          string `json:"cpu"`
	Memory       uint64 `json:"memory"`
	OSName       string `json:"osName"`
	OSVersion    string `json:"osVersion"`
	OSBuild      string `json:"osBuild"`
	Disks        []struct {
		Name   string `json:"name"`
		Model  string `json:"model"`
		Serial string `json:"serial"`
		Size   uint64 `json:"size"`
	} `json:"disks"`
}

func collectPlatform(ctx context.Context) (model.OperatingSystem, model.Hardware, error) {
	// The script is constant and contains no configuration or remotely supplied input.
	script := `$ErrorActionPreference='Stop'; $cs=Get-CimInstance Win32_ComputerSystem; $bios=Get-CimInstance Win32_BIOS; $prod=Get-CimInstance Win32_ComputerSystemProduct; $cpu=Get-CimInstance Win32_Processor | Select-Object -First 1; $os=Get-CimInstance Win32_OperatingSystem; $disks=@(Get-CimInstance Win32_DiskDrive | ForEach-Object {[pscustomobject]@{name=$_.DeviceID;model=$_.Model;serial=([string]$_.SerialNumber).Trim();size=[uint64]$_.Size}}); [pscustomobject]@{manufacturer=$cs.Manufacturer;model=$cs.Model;serial=([string]$bios.SerialNumber).Trim();uuid=[string]$prod.UUID;cpu=$cpu.Name;memory=[uint64]$cs.TotalPhysicalMemory;osName=($os.Caption);osVersion=$os.Version;osBuild=$os.BuildNumber;disks=$disks} | ConvertTo-Json -Depth 4 -Compress`
	output, err := exec.CommandContext(ctx, "powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script).Output()
	if err != nil {
		return model.OperatingSystem{}, model.Hardware{}, fmt.Errorf("collect Windows CIM inventory: %w", err)
	}
	var raw windowsInventory
	if err := json.Unmarshal(output, &raw); err != nil {
		return model.OperatingSystem{}, model.Hardware{}, fmt.Errorf("decode Windows CIM inventory: %w", err)
	}
	disks := make([]model.Disk, 0, len(raw.Disks))
	for _, item := range raw.Disks {
		disks = append(disks, model.Disk{Name: item.Name, Model: strings.TrimSpace(item.Model), Serial: strings.TrimSpace(item.Serial), SizeBytes: item.Size, Type: "disk"})
	}
	return model.OperatingSystem{Family: "windows", Name: strings.TrimSpace(raw.OSName), Version: raw.OSVersion, Build: raw.OSBuild}, model.Hardware{
		Manufacturer: strings.TrimSpace(raw.Manufacturer), Model: strings.TrimSpace(raw.Model), SerialNumber: strings.TrimSpace(raw.Serial), SystemUUID: strings.TrimSpace(raw.UUID), CPUModel: strings.TrimSpace(raw.CPU), MemoryBytes: raw.Memory, Disks: disks,
	}, nil
}
