package dingtalk

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	config *Config
	token  string
}

func NewClient(config *Config) *Client {
	return &Client{config: config}
}

// GetAccessToken retrieves a temporary access token from DingTalk
func (c *Client) GetAccessToken() (string, error) {
	url := fmt.Sprintf("https://oapi.dingtalk.com/gettoken?appkey=%s&appsecret=%s", c.config.AppKey, c.config.AppSecret)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)

	if accessToken, ok := result["access_token"].(string); ok {
		c.token = accessToken
		return accessToken, nil
	}

	return "", fmt.Errorf("failed to get access token")
}

// GetUserByCode gets user info by auth code
func (c *Client) GetUserByCode(code string) (map[string]interface{}, error) {
	accessToken, err := c.GetAccessToken()
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("https://oapi.dingtalk.com/user/getuserinfo?access_token=%s&code=%s", accessToken, code)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)

	return result, nil
}

// ListDepartments lists all departments
func (c *Client) ListDepartments() ([]map[string]interface{}, error) {
	accessToken, err := c.GetAccessToken()
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("https://oapi.dingtalk.com/department/list?access_token=%s", accessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)

	if departments, ok := result["department"].([]interface{}); ok {
		depts := make([]map[string]interface{}, len(departments))
		for i, d := range departments {
			if deptMap, ok := d.(map[string]interface{}); ok {
				depts[i] = deptMap
			}
		}
		return depts, nil
	}

	return []map[string]interface{}{}, nil
}

// ListUsersByDept lists users in a department
func (c *Client) ListUsersByDept(deptID int) ([]map[string]interface{}, error) {
	accessToken, err := c.GetAccessToken()
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("https://oapi.dingtalk.com/user/simplelist?access_token=%s&department_id=%d", accessToken, deptID)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)

	if userList, ok := result["userlist"].([]interface{}); ok {
		users := make([]map[string]interface{}, len(userList))
		for i, u := range userList {
			if userMap, ok := u.(map[string]interface{}); ok {
				users[i] = userMap
			}
		}
		return users, nil
	}

	return []map[string]interface{}{}, nil
}
