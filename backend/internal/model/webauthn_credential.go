package model

import "time"

// WebAuthnCredential stores a registered WebAuthn (Passkey) credential.
type WebAuthnCredential struct {
	ID              int        `gorm:"primaryKey" json:"id"`
	UserID          int        `gorm:"index;not null" json:"userId"`
	CredentialID    []byte     `gorm:"uniqueIndex;not null" json:"-"`
	PublicKey       []byte     `gorm:"not null" json:"-"`
	AttestationType string     `json:"attestationType,omitempty"`
	AAGUID          string     `gorm:"column:aaguid" json:"aaguid,omitempty"`
	SignCount       uint32     `gorm:"default:0" json:"-"`
	Transports      JSONB      `gorm:"type:jsonb" json:"transports,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	LastUsedAt      *time.Time `json:"lastUsedAt,omitempty"`
	// UserIDBytes is the WebAuthn user handle stored alongside the int UserID,
	// so login sessions can resolve the user by the handle returned by the authenticator.
	UserIDBytes     []byte     `gorm:"column:user_id_bytes;index" json:"-"`
}

// TableName overrides the table name.
func (WebAuthnCredential) TableName() string {
	return "webauthn_credentials"
}
