package repository

import (
	"context"

	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

// WebAuthnCredentialRepository manages WebAuthn credential persistence.
type WebAuthnCredentialRepository struct {
	db *gorm.DB
}

func NewWebAuthnCredentialRepository(db *gorm.DB) *WebAuthnCredentialRepository {
	return &WebAuthnCredentialRepository{db: db}
}

func (r *WebAuthnCredentialRepository) Create(ctx context.Context, c *model.WebAuthnCredential) error {
	return r.db.WithContext(ctx).Create(c).Error
}

func (r *WebAuthnCredentialRepository) GetByCredentialID(ctx context.Context, credentialID []byte) (*model.WebAuthnCredential, error) {
	var c model.WebAuthnCredential
	err := r.db.WithContext(ctx).Where("credential_id = ?", credentialID).First(&c).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &c, err
}

func (r *WebAuthnCredentialRepository) ListByUserID(ctx context.Context, userID int) ([]model.WebAuthnCredential, error) {
	var creds []model.WebAuthnCredential
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Find(&creds).Error
	return creds, err
}

func (r *WebAuthnCredentialRepository) Update(ctx context.Context, c *model.WebAuthnCredential) error {
	return r.db.WithContext(ctx).Save(c).Error
}

func (r *WebAuthnCredentialRepository) Delete(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&model.WebAuthnCredential{}, id).Error
}
