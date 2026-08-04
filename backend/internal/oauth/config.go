package oauth

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"sync"
)

// Config holds OAuth IdP configuration loaded from environment.
type Config struct {
	// Issuer is the canonical platform URL (e.g. https://suzuran.example.com)
	Issuer string
	// WebAuthn RP ID (domain) and display name
	RPID            string
	RPDisplayName   string
	RPOrigins       []string
	// DingTalk OAuth
	DingTalkAppKey    string
	DingTalkAppSecret string
	DingTalkAgentID   string
	// Token TTLs
	AccessTokenTTLSeconds  int
	RefreshTokenTTLSeconds int
}

var (
	configOnce sync.Once
	cfg       *Config
)

// LoadConfig loads OAuth configuration from environment.
func LoadConfig() *Config {
	configOnce.Do(func() {
		issuer := os.Getenv("OAUTH_ISSUER")
		if issuer == "" {
			issuer = "http://localhost:8888"
		}
		rpID := os.Getenv("WEBAUTHN_RP_ID")
		if rpID == "" {
			rpID = "localhost"
		}
		rpDisplayName := os.Getenv("WEBAUTHN_RP_DISPLAY_NAME")
		if rpDisplayName == "" {
			rpDisplayName = "Suzuran Cloud"
		}
		rpOriginsCSV := os.Getenv("WEBAUTHN_RP_ORIGINS")
		if rpOriginsCSV == "" {
			rpOriginsCSV = "http://localhost:5173,http://localhost:3000"
		}

		cfg = &Config{
			Issuer:                 issuer,
			RPID:                   rpID,
			RPDisplayName:          rpDisplayName,
			RPOrigins:              splitCSV(rpOriginsCSV),
			DingTalkAppKey:         os.Getenv("DINGTALK_APP_KEY"),
			DingTalkAppSecret:      os.Getenv("DINGTALK_APP_SECRET"),
			DingTalkAgentID:        os.Getenv("DINGTALK_AGENT_ID"),
			AccessTokenTTLSeconds: 900, // 15 minutes
			RefreshTokenTTLSeconds: 2592000, // 30 days
		}
	})
	return cfg
}

// GetConfig returns the loaded config (loads if not loaded yet).
func GetConfig() *Config {
	if cfg == nil {
		return LoadConfig()
	}
	return cfg
}

func splitCSV(s string) []string {
	var out []string
	cur := ""
	for _, r := range s {
		if r == ',' {
			if cur != "" {
				out = append(out, cur)
			}
			cur = ""
		} else {
			cur += string(r)
		}
	}
	if cur != "" {
		out = append(out, cur)
	}
	return out
}

// RandomString returns a URL-safe random string of n bytes (base64-encoded).
func RandomString(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

var _ = fmt.Sprintf

