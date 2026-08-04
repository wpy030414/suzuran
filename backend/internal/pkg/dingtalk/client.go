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

// Department is the strongly-typed DingTalk department record.
type Department struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	ParentID int64  `json:"parentid"` // 0 for root
}

// DeptUser is the strongly-typed DingTalk department user record.
type DeptUser struct {
	UserID    string `json:"userid"`
	UnionID   string `json:"unionid"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Mobile    string `json:"mobile"`
	AvatarURL string `json:"avatar"`
	JobNumber string `json:"jobnumber"`
	Title     string `json:"title"`
}

// ListDepartments lists all departments as strongly-typed records.
func (c *Client) ListDepartments() ([]Department, error) {
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

	if err := dingtalkError(result); err != nil {
		return nil, err
	}

	rawDepts, _ := result["department"].([]interface{})
	depts := make([]Department, 0, len(rawDepts))
	for _, d := range rawDepts {
		deptMap, ok := d.(map[string]interface{})
		if !ok {
			continue
		}
		depts = append(depts, Department{
			ID:       toInt64(deptMap["id"]),
			Name:     toString(deptMap["name"]),
			ParentID: toInt64(deptMap["parentid"]),
		})
	}
	return depts, nil
}

// ListUsersByDept lists users in a department as strongly-typed records.
func (c *Client) ListUsersByDept(deptID int) ([]DeptUser, error) {
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

	if err := dingtalkError(result); err != nil {
		return nil, err
	}

	rawUsers, _ := result["userlist"].([]interface{})
	users := make([]DeptUser, 0, len(rawUsers))
	for _, u := range rawUsers {
		um, ok := u.(map[string]interface{})
		if !ok {
			continue
		}
		users = append(users, DeptUser{
			UserID:    toString(um["userid"]),
			UnionID:   toString(um["unionid"]),
			Name:      toString(um["name"]),
			Email:     toString(um["email"]),
			Mobile:    toString(um["mobile"]),
			AvatarURL: toString(um["avatar"]),
			JobNumber: toString(um["jobnumber"]),
			Title:     toString(um["title"]),
		})
	}
	return users, nil
}

// dingtalkError returns an error if the DingTalk API response carries an errcode.
func dingtalkError(result map[string]interface{}) error {
	if result == nil {
		return nil
	}
	if code, ok := result["errcode"].(float64); ok && code != 0 {
		msg := toString(result["errmsg"])
		if msg == "" {
			msg = "unknown dingtalk error"
		}
		return fmt.Errorf("dingtalk api error %v: %s", code, msg)
	}
	return nil
}

func toInt64(v interface{}) int64 {
	if f, ok := v.(float64); ok {
		return int64(f)
	}
	return 0
}

func toString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
