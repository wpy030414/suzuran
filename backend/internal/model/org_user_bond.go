package model

import "time"

type OrgUserBondWithUser struct {
	OrgUserBond
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

type OrgUserBond struct {
	ID                  int       `gorm:"primaryKey" json:"id"`
	OrgID               int       `gorm:"not null;uniqueIndex:idx_org_user_unique" json:"orgId"`
	UserID              int       `gorm:"not null;uniqueIndex:idx_org_user_unique" json:"userId"`
	DepartmentID        *int      `json:"departmentId"`
	IsAdmin             bool      `gorm:"default:false" json:"isAdmin"`
	IsDepartmentManager bool      `gorm:"default:false" json:"isDepartmentManager"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
	User                *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (OrgUserBond) TableName() string {
	return "org_user_bonds"
}
