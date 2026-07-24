package model

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Application represents a multi-form application with versioning
type Application struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	UUID        string    `gorm:"type:uuid;not null;uniqueIndex" json:"uuid"`
	PackageName string    `gorm:"not null;index:idx_package" json:"packageName"`
	Version     string    `gorm:"not null" json:"version"`
	Name        string    `gorm:"not null" json:"name"`
	Description string    `json:"description"`
	OrgID       int       `gorm:"not null;index:idx_org" json:"orgId"`
	Schema      JSONB     `gorm:"type:jsonb" json:"schema"` // Application schema including forms, views, workflows
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func (Application) TableName() string {
	return "applications"
}

// GenerateUUID generates a new UUID for the application
func (a *Application) GenerateUUID() {
	a.UUID = uuid.New().String()
}

// FormatVersion returns the formatted version string for the given time.
// Version format: yy.M.d+Hmm-metabase
// Example: 26.7.24+1626-hf7z
//
//   yy     = 2-digit year (no leading zero)
//   M      = month without leading zero
//   d      = day without leading zero
//   Hmm    = hour (24h, no leading zero) + 2-digit minute (with leading zero)
//   metabase = custom string (alphanumeric)
func FormatVersion(t time.Time, meta string) string {
	yy := t.Year() % 100
	month := int(t.Month())
	day := t.Day()
	hour := t.Hour()
	minute := t.Minute()
	return fmt.Sprintf("%d.%d.%d+%d%02d-%s", yy, month, day, hour, minute, meta)
}

// SetInitialVersion sets the version based on current time with default metadata.
// meta defaults to a short random-ish string derived from the UUID.
func (a *Application) SetInitialVersion() {
	meta := "initial"
	if a.UUID == "" {
		a.GenerateUUID()
	}
	// Use first 4 chars of UUID as the meta string for uniqueness
	if len(a.UUID) >= 4 {
		meta = a.UUID[:4]
	}
	a.Version = FormatVersion(time.Now(), meta)
}

// SetVersion sets the version using the provided time and metadata string.
func (a *Application) SetVersion(t time.Time, meta string) {
	a.Version = FormatVersion(t, meta)
}
