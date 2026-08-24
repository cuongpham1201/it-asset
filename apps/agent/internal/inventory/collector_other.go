//go:build !linux && !windows

package inventory

import (
	"context"
	"runtime"

	"github.com/duclamtk39/assetIT/apps/agent/internal/model"
)

func collectPlatform(_ context.Context) (model.OperatingSystem, model.Hardware, error) {
	return model.OperatingSystem{Family: runtime.GOOS, Name: runtime.GOOS}, model.Hardware{}, nil
}
