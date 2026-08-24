package inventory

import (
	"context"
	"net"
	"os"
	"runtime"
	"sort"
	"strings"
	"time"

	"github.com/duclamtk39/assetIT/apps/agent/internal/identity"
	"github.com/duclamtk39/assetIT/apps/agent/internal/model"
)

type Collector struct{}

func (Collector) Collect(ctx context.Context, agentVersion, siteCode string) (model.InventoryEnvelope, error) {
	hostname, err := os.Hostname()
	if err != nil {
		return model.InventoryEnvelope{}, err
	}
	device := model.Device{Hostname: hostname}
	device.OS, device.Hardware, err = collectPlatform(ctx)
	if err != nil {
		return model.InventoryEnvelope{}, err
	}
	device.OS.Arch = runtime.GOARCH
	device.Hardware.LogicalCPUs = runtime.NumCPU()
	device.Hardware.SerialNumber = identity.SanitizeHardwareIdentifier(device.Hardware.SerialNumber)
	device.Hardware.SystemUUID = identity.SanitizeHardwareIdentifier(device.Hardware.SystemUUID)
	device.Interfaces = collectInterfaces()
	device.Fingerprint = identity.Fingerprint(device)
	return model.InventoryEnvelope{
		SchemaVersion: model.SchemaVersion,
		CollectedAt:   time.Now().UTC(),
		SiteCode:      strings.TrimSpace(siteCode),
		Agent:         model.Agent{ID: "device:" + device.Fingerprint, Version: agentVersion},
		Device:        device,
	}, nil
}

func collectInterfaces() []model.NetworkInterface {
	interfaces, err := net.Interfaces()
	if err != nil {
		return nil
	}
	result := make([]model.NetworkInterface, 0, len(interfaces))
	for _, item := range interfaces {
		if item.Flags&net.FlagLoopback != 0 {
			continue
		}
		addresses, _ := item.Addrs()
		entry := model.NetworkInterface{Name: item.Name, MACAddress: strings.ToUpper(item.HardwareAddr.String())}
		for _, address := range addresses {
			entry.Addresses = append(entry.Addresses, address.String())
		}
		sort.Strings(entry.Addresses)
		result = append(result, entry)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result
}
