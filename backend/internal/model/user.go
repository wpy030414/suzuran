package model

import "time"

// User represents a user account with DingTalk integration.
type User struct {
	ID           int       `gorm:"primaryKey" json:"id"`
	Phone        string    `gorm:"uniqueIndex;not null" json:"phone"`
	PasswordHash string    `gorm:"column:password_hash;not null" json:"-"`
	Salt         string    `gorm:"not null" json:"-"`
	Name         string    `json:"name"`
	AvatarURL    string    `gorm:"column:avatar_url" json:"avatarUrl,omitempty"`
	Email        string    `json:"email,omitempty"`
	Position     string    `json:"position,omitempty"`

	// DingTalk integration (pointers so unset values are NULL, avoiding unique-constraint collisions)
	DingtalkUserID  *string `gorm:"column:dingtalk_userid;uniqueIndex" json:"dingtalkUserId,omitempty"`
	DingtalkUnionID *string `gorm:"column:dingtalk_unionid;index" json:"dingtalkUnionId,omitempty"`
	DingtalkOpenID  *string `gorm:"column:dingtalk_openid" json:"dingtalkOpenId,omitempty"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// TableName overrides the table name.
func (User) TableName() string {
	return "users"
}
