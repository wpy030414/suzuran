package model

import "time"

// OAuthClient represents an application that acts as an OAuth2 client.
type OAuthClient struct {
	ID           string    `gorm:"primaryKey" json:"id"`
	OrgID        int       `gorm:"index" json:"orgId,omitempty"`
	Name         string    `gorm:"not null" json:"name"`
	ClientSecret string    `gorm:"column:client_secret;not null" json:"-"`
	RedirectURIs JSONB     `gorm:"type:jsonb" json:"redirectUris,omitempty"`
	Scopes       JSONB     `gorm:"type:jsonb" json:"scopes,omitempty"`
	Confidential bool      `gorm:"default:false" json:"confidential,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// TableName overrides the table name.
func (OAuthClient) TableName() string {
	return "oauth_clients"
}

// OAuthToken represents an issued OAuth2 token (access + refresh).
type OAuthToken struct {
	ID               string     `gorm:"primaryKey" json:"id"`
	UserID           int        `gorm:"index" json:"userId"`
	OrgID            int        `gorm:"index" json:"orgId,omitempty"`
	ClientID         string     `gorm:"index" json:"clientId"`
	Scope            string     `json:"scope,omitempty"`
	RefreshTokenHash string     `gorm:"column:refresh_token_hash;index" json:"-"`
	ExpiresAt        time.Time `json:"expiresAt"`
	RevokedAt        *time.Time `json:"revokedAt,omitempty"`
	CreatedAt        time.Time `json:"createdAt"`
}

// TableName overrides the table name.
func (OAuthToken) TableName() string {
	return "oauth_tokens"
}

// OAuthSession stores the authorization-code → session mapping for the
// authorization_code OAuth2 flow. Codes are short-lived (10 min) and one-time use.
type OAuthSession struct {
	ID               string    `gorm:"primaryKey" json:"id"`
	Code             string    `gorm:"uniqueIndex;not null" json:"-"`
	CodeChallenge    string    `json:"-"` // PKCE
	CodeChallengeMethod string  `json:"-"`
	UserID           int       `gorm:"index;not null" json:"userId"`
	OrgID            int       `json:"orgId,omitempty"`
	ClientID         string    `gorm:"index;not null" json:"clientId"`
	RedirectURI      string    `json:"redirectUri,omitempty"`
	Scope            string    `json:"scope,omitempty"`
	ExpiresAt        time.Time `json:"expiresAt"`
	UsedAt           *time.Time `json:"usedAt,omitempty"`
	CreatedAt        time.Time `json:"createdAt"`
}

// TableName overrides the table name.
func (OAuthSession) TableName() string {
	return "oauth_sessions"
}
