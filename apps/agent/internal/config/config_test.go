package config

import "testing"

func TestValidateRejectsPlainHTTP(t *testing.T) {
	cfg := Config{ServerURL: "http://assets.company.test", EnrollmentToken: "secret"}
	if cfg.Validate() == nil {
		t.Fatal("plain HTTP was accepted without explicit development override")
	}
}

func TestValidateAllowsHTTPSAndLocalDevelopment(t *testing.T) {
	for _, serverURL := range []string{"https://assets.company.test", "http://127.0.0.1:3000"} {
		cfg := Config{ServerURL: serverURL, EnrollmentToken: "secret", Interval: "15m"}
		if err := cfg.Validate(); err != nil {
			t.Fatalf("expected %s to be valid: %v", serverURL, err)
		}
	}
}
