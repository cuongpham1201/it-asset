package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/duclamtk39/assetIT/apps/agent/internal/client"
	"github.com/duclamtk39/assetIT/apps/agent/internal/config"
	"github.com/duclamtk39/assetIT/apps/agent/internal/inventory"
	"github.com/duclamtk39/assetIT/apps/agent/internal/state"
)

var version = "development"

func main() {
	log.SetFlags(log.Ldate | log.Ltime | log.LUTC)
	if err := execute(os.Args[1:]); err != nil {
		log.Printf("ERROR %v", err)
		os.Exit(1)
	}
}

func execute(args []string) error {
	if len(args) == 0 {
		return usageError()
	}
	switch args[0] {
	case "inventory":
		return printInventory(args[1:])
	case "once":
		return sendOnce(args[1:])
	case "run":
		return run(args[1:])
	case "version", "--version", "-version":
		fmt.Println(version)
		return nil
	default:
		return usageError()
	}
}

func usageError() error {
	return errors.New("usage: assetflow-agent <inventory|once|run|version> [--config path]")
}

func printInventory(args []string) error {
	flags := flag.NewFlagSet("inventory", flag.ContinueOnError)
	siteCode := flags.String("site", "", "optional AssetFlow site code")
	if err := flags.Parse(args); err != nil {
		return err
	}
	payload, err := (inventory.Collector{}).Collect(context.Background(), version, *siteCode)
	if err != nil {
		return err
	}
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	return encoder.Encode(payload)
}

func sendOnce(args []string) error {
	cfg, err := loadConfig(args, "once")
	if err != nil {
		return err
	}
	return collectAndSend(context.Background(), cfg)
}

func run(args []string) error {
	cfg, err := loadConfig(args, "run")
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := collectAndSend(ctx, cfg); err != nil {
		log.Printf("WARN initial inventory failed: %v", err)
	}
	ticker := time.NewTicker(cfg.IntervalDuration())
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			if err := collectAndSend(ctx, cfg); err != nil {
				log.Printf("WARN inventory failed: %v", err)
			}
		}
	}
}

func loadConfig(args []string, command string) (config.Config, error) {
	flags := flag.NewFlagSet(command, flag.ContinueOnError)
	path := flags.String("config", config.DefaultPath(), "path to agent JSON configuration")
	if err := flags.Parse(args); err != nil {
		return config.Config{}, err
	}
	return config.Load(*path)
}

func collectAndSend(ctx context.Context, cfg config.Config) error {
	collectCtx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()
	payload, err := (inventory.Collector{}).Collect(collectCtx, version, cfg.SiteCode)
	if err != nil {
		return fmt.Errorf("collect inventory: %w", err)
	}
	stored, stateErr := state.Load(cfg.StateFile)
	if stateErr != nil && !os.IsNotExist(stateErr) {
		return fmt.Errorf("load agent state: %w", stateErr)
	}
	if os.IsNotExist(stateErr) {
		if cfg.EnrollmentToken == "" {
			return errors.New("enrollment_token is required until this device is enrolled")
		}
		if err := state.EnsureWritable(cfg.StateFile); err != nil {
			return err
		}
		api, err := client.New(cfg.ServerURL, cfg.EnrollmentToken, cfg.CAFile, cfg.TimeoutDuration())
		if err != nil {
			return err
		}
		enrollment, err := api.Enroll(ctx, payload)
		if err != nil {
			return err
		}
		if err := state.Save(cfg.StateFile, state.State{AgentID: enrollment.AgentID, AgentToken: enrollment.AgentToken}); err != nil {
			return err
		}
		log.Printf("agent enrolled agent_id=%s hostname=%s", enrollment.AgentID, payload.Device.Hostname)
		return nil
	}
	payload.Agent.ID = stored.AgentID
	api, err := client.New(cfg.ServerURL, stored.AgentToken, cfg.CAFile, cfg.TimeoutDuration())
	if err != nil {
		return err
	}
	if err := api.Send(ctx, payload); err != nil {
		return err
	}
	log.Printf("inventory accepted fingerprint=%s hostname=%s", payload.Device.Fingerprint[:12], payload.Device.Hostname)
	return nil
}
