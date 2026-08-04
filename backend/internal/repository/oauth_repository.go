package repository

import (
	"context"
	"time"

	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

// OAuthClientRepository manages OAuth2 client persistence.
type OAuthClientRepository struct {
	db *gorm.DB
}

func NewOAuthClientRepository(db *gorm.DB) *OAuthClientRepository {
	return &OAuthClientRepository{db: db}
}

func (r *OAuthClientRepository) Create(ctx context.Context, c *model.OAuthClient) error {
	return r.db.WithContext(ctx).Create(c).Error
}

func (r *OAuthClientRepository) GetByID(ctx context.Context, id string) (*model.OAuthClient, error) {
	var c model.OAuthClient
	err := r.db.WithContext(ctx).First(&c, "id = ?", id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &c, err
}

func (r *OAuthClientRepository) ListByOrgID(ctx context.Context, orgID int) ([]*model.OAuthClient, error) {
	var clients []*model.OAuthClient
	err := r.db.WithContext(ctx).Where("org_id = ?", orgID).Find(&clients).Error
	return clients, err
}

func (r *OAuthClientRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&model.OAuthClient{}, "id = ?", id).Error
}

// OAuthTokenRepository manages issued OAuth2 tokens.
type OAuthTokenRepository struct {
	db *gorm.DB
}

func NewOAuthTokenRepository(db *gorm.DB) *OAuthTokenRepository {
	return &OAuthTokenRepository{db: db}
}

func (r *OAuthTokenRepository) Create(ctx context.Context, t *model.OAuthToken) error {
	return r.db.WithContext(ctx).Create(t).Error
}

func (r *OAuthTokenRepository) GetByRefreshTokenHash(ctx context.Context, hash string) (*model.OAuthToken, error) {
	var t model.OAuthToken
	err := r.db.WithContext(ctx).Where("refresh_token_hash = ? AND revoked_at IS NULL", hash).First(&t).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &t, err
}

func (r *OAuthTokenRepository) Revoke(ctx context.Context, id string) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&model.OAuthToken{}).Where("id = ?", id).Update("revoked_at", now).Error
}

func (r *OAuthTokenRepository) RevokeByClientID(ctx context.Context, clientID string) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&model.OAuthToken{}).Where("client_id = ? AND revoked_at IS NULL", clientID).Update("revoked_at", now).Error
}

// OAuthSessionRepository manages authorization-code sessions.
type OAuthSessionRepository struct {
	db *gorm.DB
}

func NewOAuthSessionRepository(db *gorm.DB) *OAuthSessionRepository {
	return &OAuthSessionRepository{db: db}
}

func (r *OAuthSessionRepository) Create(ctx context.Context, s *model.OAuthSession) error {
	return r.db.WithContext(ctx).Create(s).Error
}

func (r *OAuthSessionRepository) GetByCode(ctx context.Context, code string) (*model.OAuthSession, error) {
	var s model.OAuthSession
	err := r.db.WithContext(ctx).Where("code = ? AND used_at IS NULL", code).First(&s).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &s, err
}

func (r *OAuthSessionRepository) MarkUsed(ctx context.Context, code string) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&model.OAuthSession{}).Where("code = ?", code).Update("used_at", now).Error
}

func (r *OAuthSessionRepository) DeleteExpired(ctx context.Context) error {
	return r.db.WithContext(ctx).Where("expires_at < ?", time.Now()).Delete(&model.OAuthSession{}).Error
}
