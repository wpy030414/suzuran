package dingtalk

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type BotClient struct {
	config *BotConfig
}

func NewBotClient(config *BotConfig) *BotClient {
	return &BotClient{config: config}
}

// SendMarkdown sends a markdown message to DingTalk bot
func (c *BotClient) SendMarkdown(title, text string) error {
	msg := map[string]interface{}{
		"msgtype": "markdown",
		"markdown": map[string]string{
			"title": title,
			"text":  text,
		},
	}

	data, _ := json.Marshal(msg)

	resp, err := http.Post(c.config.WebhookURL, "application/json", bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)

	if errmsg, ok := result["errmsg"].(string); ok && errmsg == "ok" {
		return nil
	}

	return fmt.Errorf("failed to send markdown: %v", result)
}
