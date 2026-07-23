package dingtalk

import "os"

type Config struct {
	AppKey    string
	AppSecret string
	AgentID   string
}

func NewConfig() *Config {
	return &Config{
		AppKey:    os.Getenv("DINGTALK_APP_KEY"),
		AppSecret: os.Getenv("DINGTALK_APP_SECRET"),
		AgentID:   os.Getenv("DINGTALK_AGENT_ID"),
	}
}

type BotConfig struct {
	WebhookURL string
}

func NewBotConfig() *BotConfig {
	return &BotConfig{
		WebhookURL: os.Getenv("DINGTALK_BOT_WEBHOOK"),
	}
}
