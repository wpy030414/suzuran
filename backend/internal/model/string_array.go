package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

// StringArray is a JSONB-backed []string type that works with both
// PostgreSQL (jsonb column) and SQLite (text fallback).
type StringArray []string

// GormDataType returns the SQL data type for GORM AutoMigrate.
func (StringArray) GormDataType() string {
	return "text"
}

// Scan implements the sql.Scanner interface.
func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		// SQLite may return a string
		if str, ok := value.(string); ok {
			bytes = []byte(str)
		} else {
			return fmt.Errorf("failed to unmarshal StringArray value: %v", value)
		}
	}
	return json.Unmarshal(bytes, s)
}

// Value implements the driver.Valuer interface.
func (s StringArray) Value() (driver.Value, error) {
	if s == nil {
		return nil, nil
	}
	return json.Marshal(s)
}
