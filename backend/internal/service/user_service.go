package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

// MemberView is the API-facing view of an organization member (user + bond fields).
type MemberView struct {
	UserID              int    `json:"userId"`
	Phone               string `json:"phone"`
	Name                string `json:"name"`
	Email               string `json:"email"`
	Position            string `json:"position"`
	BondID              int    `json:"bondId"`
	IsAdmin             bool   `json:"isAdmin"`
	IsDepartmentManager bool   `json:"isDepartmentManager"`
	DepartmentID        *int   `json:"departmentId"`
}

// UserService handles organization member operations.
type UserService struct {
	userRepo *repository.UserRepository
	bondRepo *repository.OrgUserBondRepository
}

// NewUserService creates a new UserService.
func NewUserService(userRepo *repository.UserRepository, bondRepo *repository.OrgUserBondRepository) *UserService {
	return &UserService{userRepo: userRepo, bondRepo: bondRepo}
}

// ListMembers returns all members of an organization.
func (s *UserService) ListMembers(ctx context.Context, orgID int) ([]MemberView, error) {
	bonds, err := s.bondRepo.GetByOrgIDWithUsers(ctx, orgID)
	if err != nil {
		return nil, err
	}
	var views []MemberView
	for _, b := range bonds {
		v := MemberView{
			UserID:              b.UserID,
			BondID:              b.ID,
			IsAdmin:             b.IsAdmin,
			IsDepartmentManager: b.IsDepartmentManager,
			DepartmentID:        b.DepartmentID,
		}
		if b.User != nil {
			v.Phone = b.User.Phone
			v.Name = b.User.Name
			v.Email = b.User.Email
			v.Position = b.User.Position
		}
		views = append(views, v)
	}
	return views, nil
}

// CreateMember creates a user (if new phone) and adds them to the organization.
func (s *UserService) CreateMember(ctx context.Context, orgID int, phone, name, password, email, position string, isAdmin bool, deptID *int, isDeptMgr bool) (*MemberView, error) {
	existing, err := s.userRepo.GetByPhone(ctx, phone)
	if err != nil {
		return nil, err
	}

	var user *model.User
	if existing != nil {
		// Phone already exists: check if already in this org
		bond, err := s.bondRepo.GetByOrgAndUser(ctx, orgID, existing.ID)
		if err != nil {
			return nil, err
		}
		if bond != nil {
			// Already a member, return existing
			return s.singleMemberView(ctx, bond, existing)
		}
		user = existing
	} else {
		// Create new user with sha256 hex password
		hash := sha256.Sum256([]byte(password))
		user = &model.User{
			Phone:        phone,
			Name:         name,
			Email:        email,
			Position:     position,
			PasswordHash: hex.EncodeToString(hash[:]),
			Salt:         "",
		}
		if err := s.userRepo.Create(ctx, user); err != nil {
			return nil, err
		}
	}

	bond := &model.OrgUserBond{
		OrgID:               orgID,
		UserID:              user.ID,
		DepartmentID:        deptID,
		IsAdmin:             isAdmin,
		IsDepartmentManager: isDeptMgr,
	}
	if err := s.bondRepo.Create(ctx, bond); err != nil {
		return nil, err
	}

	return s.singleMemberView(ctx, bond, user)
}

// UpdateMember updates user fields and/or bond fields for a member.
func (s *UserService) UpdateMember(ctx context.Context, orgID, userID int, name, email, position, password string, isAdmin *bool, deptID *int, isDeptMgr *bool) (*MemberView, error) {
	bond, err := s.bondRepo.GetByOrgAndUser(ctx, orgID, userID)
	if err != nil {
		return nil, err
	}
	if bond == nil {
		return nil, errors.New("member not found in this organization")
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	// Update user fields
	if name != "" {
		user.Name = name
	}
	if email != "" {
		user.Email = email
	}
	if position != "" {
		user.Position = position
	}
	if password != "" {
		hash := sha256.Sum256([]byte(password))
		user.PasswordHash = hex.EncodeToString(hash[:])
	}
	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	// Update bond fields
	if isAdmin != nil {
		bond.IsAdmin = *isAdmin
	}
	if isDeptMgr != nil {
		bond.IsDepartmentManager = *isDeptMgr
	}
	if deptID != nil {
		bond.DepartmentID = deptID
	}
	if err := s.bondRepo.Update(ctx, bond); err != nil {
		return nil, err
	}

	return s.singleMemberView(ctx, bond, user)
}

// RemoveMember removes a user from an organization (does not delete the global User).
func (s *UserService) RemoveMember(ctx context.Context, orgID, userID int) error {
	return s.bondRepo.DeleteByOrgAndUser(ctx, orgID, userID)
}

func (s *UserService) singleMemberView(_ context.Context, bond *model.OrgUserBond, user *model.User) (*MemberView, error) {
	return &MemberView{
		UserID:              user.ID,
		Phone:               user.Phone,
		Name:                user.Name,
		Email:               user.Email,
		Position:            user.Position,
		BondID:              bond.ID,
		IsAdmin:             bond.IsAdmin,
		IsDepartmentManager: bond.IsDepartmentManager,
		DepartmentID:        bond.DepartmentID,
	}, nil
}
