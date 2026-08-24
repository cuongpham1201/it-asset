package identity

import (
	"crypto/sha256"
	"encoding/hex"
	"sort"
	"strings"

	"github.com/duclamtk39/assetIT/apps/agent/internal/model"
)

var invalidHardwareIdentifiers = map[string]struct{}{
	"default string": {}, "to be filled by o.e.m.": {}, "to be filled by oem": {},
	"system serial number": {}, "unknown": {}, "none": {}, "not specified": {},
	"n/a": {}, "na": {}, "0": {}, "00000000-0000-0000-0000-000000000000": {},
	"ffffffff-ffff-ffff-ffff-ffffffffffff": {},
}

// SanitizeHardwareIdentifier removes well-known OEM placeholders that would
// otherwise create false matches across unrelated devices.
func SanitizeHardwareIdentifier(value string) string {
	trimmed := strings.TrimSpace(value)
	if _, invalid := invalidHardwareIdentifiers[strings.ToLower(trimmed)]; invalid {
		return ""
	}
	return trimmed
}

// Fingerprint derives a stable, non-secret identifier from hardware evidence.
// It is used for reconciliation only; the server must not treat it as authentication.
func Fingerprint(device model.Device) string {
	parts := []string{
		normalize(SanitizeHardwareIdentifier(device.Hardware.SystemUUID)),
		normalize(SanitizeHardwareIdentifier(device.Hardware.SerialNumber)),
		normalize(device.Hardware.Manufacturer),
		normalize(device.Hardware.Model),
	}
	macs := make([]string, 0, len(device.Interfaces))
	for _, item := range device.Interfaces {
		if value := normalize(item.MACAddress); value != "" {
			macs = append(macs, value)
		}
	}
	sort.Strings(macs)
	parts = append(parts, macs...)
	if strings.Join(parts, "") == "" {
		parts = append(parts, normalize(device.Hostname), normalize(device.OS.Family), normalize(device.OS.Arch))
	}
	sum := sha256.Sum256([]byte(strings.Join(parts, "|")))
	return hex.EncodeToString(sum[:])
}

func normalize(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}
