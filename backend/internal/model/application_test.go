package model

import (
	"regexp"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestApplication_VersionFormat(t *testing.T) {
	// Test the documented example: 26.7.24+1626-hf7z
	// Construct a time that maps to this: 2026-07-24 16:26
	exampleTime := time.Date(2026, 7, 24, 16, 26, 0, 0, time.UTC)
	v := FormatVersion(exampleTime, "hf7z")
	assert.Equal(t, "26.7.24+1626-hf7z", v)
}

func TestApplication_VersionRegex(t *testing.T) {
	// Version format: yy.M.d+Hmm-meta
	// yy = 2-digit year, M = month (no leading zero), d = day (no leading zero)
	// Hmm = hour (no leading zero) + 2-digit minute (leading zero)
	// meta = custom string
	re := regexp.MustCompile(`^\d{1,2}\.\d{1,2}\.\d{1,2}\+\d{1,2}\d{2}-.+$`)

	cases := []string{
		"26.7.24+1626-hf7z",
		"26.12.1+830-initial",
		"25.10.5+905-abc123",
	}
	for _, c := range cases {
		assert.True(t, re.MatchString(c), "expected %q to match version format", c)
	}

	// Invalid cases
	invalidCases := []string{
		"1.0.0",            // missing +Hmm-meta
		"invalid",
		"26.7.24+1626",     // missing -meta
	}
	for _, c := range invalidCases {
		assert.False(t, re.MatchString(c), "expected %q to NOT match version format", c)
	}
}

func TestApplication_SetVersion(t *testing.T) {
	app := &Application{}
	app.GenerateUUID()
	require.NotEmpty(t, app.UUID)

	// Set version with fixed time
	t1 := time.Date(2026, 7, 24, 16, 26, 0, 0, time.UTC)
	app.SetVersion(t1, "hf7z")
	assert.Equal(t, "26.7.24+1626-hf7z", app.Version)
}

func TestApplication_SetInitialVersion(t *testing.T) {
	app := &Application{}
	app.SetInitialVersion()
	assert.NotEmpty(t, app.Version)
	// Should match the format yy.M.d+Hmm-meta
	re := regexp.MustCompile(`^\d{1,2}\.\d{1,2}\.\d{1,2}\+\d{1,2}\d{2}-.+$`)
	assert.True(t, re.MatchString(app.Version), "initial version %q should match format", app.Version)
}

func TestApplication_UUIDGeneration(t *testing.T) {
	app1 := &Application{}
	app1.GenerateUUID()
	assert.NotEmpty(t, app1.UUID)

	app2 := &Application{}
	app2.GenerateUUID()
	assert.NotEqual(t, app1.UUID, app2.UUID)
}

func TestApplication_NoLeadingZerosInDate(t *testing.T) {
	// Month 7, day 4 should NOT have leading zeros: 26.7.4
	t1 := time.Date(2026, 7, 4, 8, 5, 0, 0, time.UTC)
	v := FormatVersion(t1, "abc")
	// year 26, month 7, day 4, hour 8, minute 05 -> 26.7.4+805-abc
	assert.Equal(t, "26.7.4+805-abc", v)
}
