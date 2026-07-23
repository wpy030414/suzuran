package dingtalk_test

import (
	"testing"

	"github.com/xrl/suzuran-cloud/internal/pkg/dingtalk"
	"github.com/stretchr/testify/assert"
)

func TestNewConfig_ReadsEnvVars(t *testing.T) {
	t.Setenv("DINGTALK_APP_KEY", "test-app-key")
	t.Setenv("DINGTALK_APP_SECRET", "test-app-secret")
	t.Setenv("DINGTALK_AGENT_ID", "12345")

	cfg := dingtalk.NewConfig()
	assert.Equal(t, "test-app-key", cfg.AppKey)
	assert.Equal(t, "test-app-secret", cfg.AppSecret)
	assert.Equal(t, "12345", cfg.AgentID)
}

func TestNewConfig_EmptyEnvVars(t *testing.T) {
	t.Setenv("DINGTALK_APP_KEY", "")
	t.Setenv("DINGTALK_APP_SECRET", "")
	t.Setenv("DINGTALK_AGENT_ID", "")

	cfg := dingtalk.NewConfig()
	assert.Equal(t, "", cfg.AppKey)
	assert.Equal(t, "", cfg.AppSecret)
	assert.Equal(t, "", cfg.AgentID)
}

func TestNewBotConfig_ReadsWebhook(t *testing.T) {
	t.Setenv("DINGTALK_BOT_WEBHOOK", "https://oapi.dingtalk.com/robot/send?access_token=test-token")

	cfg := dingtalk.NewBotConfig()
	assert.Equal(t, "https://oapi.dingtalk.com/robot/send?access_token=test-token", cfg.WebhookURL)
}

func TestNewBotConfig_EmptyEnv(t *testing.T) {
	t.Setenv("DINGTALK_BOT_WEBHOOK", "")

	cfg := dingtalk.NewBotConfig()
	assert.Equal(t, "", cfg.WebhookURL)
}
