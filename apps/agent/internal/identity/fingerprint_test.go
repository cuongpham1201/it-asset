package identity

import (
	"testing"

	"github.com/duclamtk39/assetIT/apps/agent/internal/model"
)

func TestFingerprintStableAcrossInterfaceOrder(t *testing.T) {
	base := model.Device{Hardware: model.Hardware{SystemUUID: "ABC", SerialNumber: "SN-01"}, Interfaces: []model.NetworkInterface{{MACAddress: "BB"}, {MACAddress: "AA"}}}
	reordered := base
	reordered.Interfaces = []model.NetworkInterface{{MACAddress: "AA"}, {MACAddress: "BB"}}
	if Fingerprint(base) != Fingerprint(reordered) {
		t.Fatal("fingerprint changed when network interfaces were reordered")
	}
}

func TestFingerprintChangesWithHardwareIdentity(t *testing.T) {
	a := model.Device{Hardware: model.Hardware{SystemUUID: "uuid-a"}}
	b := model.Device{Hardware: model.Hardware{SystemUUID: "uuid-b"}}
	if Fingerprint(a) == Fingerprint(b) {
		t.Fatal("different hardware identities produced the same fingerprint")
	}
}
