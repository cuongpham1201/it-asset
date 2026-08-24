//go:build linux

package inventory

import (
	"bufio"
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"github.com/duclamtk39/assetIT/apps/agent/internal/model"
)

func collectPlatform(ctx context.Context) (model.OperatingSystem, model.Hardware, error) {
	osInfo := model.OperatingSystem{Family: "linux", Name: "Linux"}
	if values := readKeyValueFile("/etc/os-release", "="); len(values) > 0 {
		osInfo.Name = unquote(values["PRETTY_NAME"])
		osInfo.Version = unquote(values["VERSION_ID"])
	}
	if output, err := exec.CommandContext(ctx, "uname", "-r").Output(); err == nil {
		osInfo.Kernel = strings.TrimSpace(string(output))
	}
	hardware := model.Hardware{
		Manufacturer: readTrimmed("/sys/class/dmi/id/sys_vendor"),
		Model:        readTrimmed("/sys/class/dmi/id/product_name"),
		SerialNumber: readTrimmed("/sys/class/dmi/id/product_serial"),
		SystemUUID:   readTrimmed("/sys/class/dmi/id/product_uuid"),
		CPUModel:     linuxCPUModel(),
		MemoryBytes:  linuxMemoryBytes(),
		Disks:        linuxDisks(ctx),
	}
	return osInfo, hardware, nil
}

func linuxCPUModel() string {
	file, err := os.Open("/proc/cpuinfo")
	if err != nil {
		return ""
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "model name") || strings.HasPrefix(line, "Hardware") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				return strings.TrimSpace(parts[1])
			}
		}
	}
	return ""
}

func linuxMemoryBytes() uint64 {
	values := readKeyValueFile("/proc/meminfo", ":")
	fields := strings.Fields(values["MemTotal"])
	if len(fields) == 0 {
		return 0
	}
	kib, _ := strconv.ParseUint(fields[0], 10, 64)
	return kib * 1024
}

func linuxDisks(ctx context.Context) []model.Disk {
	output, err := exec.CommandContext(ctx, "lsblk", "--json", "--bytes", "--nodeps", "--output", "NAME,MODEL,SERIAL,SIZE,TYPE").Output()
	if err != nil {
		return nil
	}
	var payload struct {
		Devices []struct {
			Name   string          `json:"name"`
			Model  string          `json:"model"`
			Serial string          `json:"serial"`
			Size   json.RawMessage `json:"size"`
			Type   string          `json:"type"`
		} `json:"blockdevices"`
	}
	if json.Unmarshal(output, &payload) != nil {
		return nil
	}
	result := make([]model.Disk, 0, len(payload.Devices))
	for _, item := range payload.Devices {
		if item.Type != "disk" {
			continue
		}
		var size uint64
		if json.Unmarshal(item.Size, &size) != nil {
			var raw string
			_ = json.Unmarshal(item.Size, &raw)
			size, _ = strconv.ParseUint(raw, 10, 64)
		}
		result = append(result, model.Disk{Name: item.Name, Model: strings.TrimSpace(item.Model), Serial: strings.TrimSpace(item.Serial), SizeBytes: size, Type: item.Type})
	}
	return result
}

func readKeyValueFile(path, separator string) map[string]string {
	result := map[string]string{}
	file, err := os.Open(path)
	if err != nil {
		return result
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		parts := strings.SplitN(scanner.Text(), separator, 2)
		if len(parts) == 2 {
			result[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
		}
	}
	return result
}

func readTrimmed(path string) string {
	data, _ := os.ReadFile(path)
	return strings.TrimSpace(string(data))
}

func unquote(value string) string {
	if unquoted, err := strconv.Unquote(value); err == nil {
		return unquoted
	}
	return value
}
