package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/pkg/jwt"
	"github.com/xrl/suzuran-cloud/internal/pkg/redis"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

// AuthService handles authentication and authorization
type AuthService struct {
	userRepo *repository.UserRepository
	bondRepo *repository.OrgUserBondRepository
	orgRepo  *repository.OrgRepository
}

// NewAuthService creates a new auth service
func NewAuthService(userRepo *repository.UserRepository, bondRepo *repository.OrgUserBondRepository, orgRepo *repository.OrgRepository) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		bondRepo: bondRepo,
		orgRepo:  orgRepo,
	}
}

// LoginRequest represents a login request
type LoginRequest struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	PreToken string      `json:"preToken"`
	User     *model.User `json:"user"`
	Orgs     []OrgInfo   `json:"orgs"`
}

// OrgInfo represents organization information for login response
type OrgInfo struct {
	OrgID      int    `json:"orgId"`
	OrgName    string `json:"orgName"`
	IsAdmin    bool   `json:"isAdmin"`
	Department string `json:"department,omitempty"`
}

// verifyPassword verifies a password against the stored hash
func verifyPassword(password, hash string) bool {
	// Simple SHA256 verification (in production, use bcrypt or argon2)
	h := sha256.Sum256([]byte(password))
	return hex.EncodeToString(h[:]) == hash
}

// Login authenticates a user and returns available organizations
func (s *AuthService) Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error) {
	user, err := s.userRepo.GetByPhone(ctx, req.Phone)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}
	if user == nil {
		return nil, errors.New("invalid credentials")
	}

	if !verifyPassword(req.Password, user.PasswordHash) {
		return nil, errors.New("invalid credentials")
	}

	bonds, err := s.bondRepo.GetByUserID(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	var orgs []OrgInfo
	for _, bond := range bonds {
		org, _ := s.orgRepo.GetByID(ctx, bond.OrgID)
		orgName := ""
		if org != nil {
			orgName = org.Name
		}
		orgs = append(orgs, OrgInfo{
			OrgID:   bond.OrgID,
			OrgName: orgName,
			IsAdmin: bond.IsAdmin,
		})
	}

	preToken := fmt.Sprintf("pre_%d", user.ID)

	// Store pre-token in Redis for validation (5 minutes expiry)
	if redis.Client != nil {
		redisKey := fmt.Sprintf("pre_token:%s", preToken)
		err := redis.Set(ctx, redisKey, user.ID, 5*time.Minute)
		if err != nil {
			fmt.Printf("Warning: Failed to store pre-token in Redis: %v\n", err)
		}
	}

	return &LoginResponse{
		PreToken: preToken,
		User:     user,
		Orgs:     orgs,
	}, nil
}

// SelectOrgRequest represents an organization selection request
type SelectOrgRequest struct {
	PreToken string `json:"preToken"` // Support both camelCase and snake_case
	OrgID    int    `json:"orgId"`
}

// SelectOrgResponse represents an organization selection response
type UserInfoWithRole struct {
	ID        int       `json:"id"`
	Phone     string    `json:"phone"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	OrgID     int       `json:"orgId"`
}

type SelectOrgResponse struct {
	Token string           `json:"token"`
	OrgID int              `json:"orgId"`
	Role  string           `json:"role"`
	User  *UserInfoWithRole `json:"user"`
}

// SelectOrg selects an organization and generates an access token
func (s *AuthService) SelectOrg(ctx context.Context, req *SelectOrgRequest) (*SelectOrgResponse, error) {
	// Validate pre-token from Redis
	var userID int
	if redis.Client != nil {
		redisKey := fmt.Sprintf("pre_token:%s", req.PreToken)
		val, err := redis.Get(ctx, redisKey).Result()
		if err != nil {
			return nil, errors.New("invalid or expired pre-token")
		}
		fmt.Sscanf(val, "%d", &userID)
		// Delete pre-token after use (one-time use)
		redis.Client.Del(ctx, redisKey)
	} else {
		// Fallback: parse user ID from pre-token format (for development without Redis)
		_, err := fmt.Sscanf(req.PreToken, "pre_%d", &userID)
		if err != nil || userID == 0 {
			return nil, errors.New("invalid or expired pre-token")
		}
	}

	bond, err := s.bondRepo.GetByOrgAndUser(ctx, req.OrgID, userID)
	if err != nil {
		return nil, errors.New("user not in this organization")
	}
	if bond == nil {
		return nil, errors.New("user not in this organization")
	}

	role := "user"
	if bond.IsAdmin {
		// Map admin role to match frontend expectations
		// Check if this is a provider org (org ID 1 is the demo provider)
		if req.OrgID == 1 {
			role = "provider"
		} else {
			role = "tenant_admin"
		}
	}

	// Get user info
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil || user == nil {
		return nil, errors.New("user not found")
	}

	token, err := jwt.GenerateToken(userID, req.OrgID, role)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	// Create user info with role
	userWithRole := &UserInfoWithRole{
		ID:    userID,
		Phone: user.Phone,
		Name:  user.Name,
		Role:  role,
		OrgID: req.OrgID,
	}

	return &SelectOrgResponse{
		Token: token,
		OrgID: req.OrgID,
		Role:  role,
		User:  userWithRole,
	}, nil
}
