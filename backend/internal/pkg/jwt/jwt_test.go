package jwt_test

import (
	"testing"

	jwt "github.com/xrl/suzuran-cloud/internal/pkg/jwt"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateToken_ReturnsNonEmptyString(t *testing.T) {
	token, err := jwt.GenerateToken(1, 10, "user")
	require.NoError(t, err)
	assert.NotEmpty(t, token)
}

func TestVerifyToken_ValidToken(t *testing.T) {
	token, err := jwt.GenerateToken(42, 7, "provider_admin")
	require.NoError(t, err)

	claims, err := jwt.VerifyToken(token)
	require.NoError(t, err)
	assert.Equal(t, 42, claims.UserID)
	assert.Equal(t, 7, claims.OrgID)
	assert.Equal(t, "provider_admin", claims.Role)
}

func TestVerifyToken_InvalidString(t *testing.T) {
	claims, err := jwt.VerifyToken("this-is-not-a-valid-jwt")
	assert.Error(t, err)
	assert.Nil(t, claims)
}

func TestVerifyToken_RandomString(t *testing.T) {
	claims, err := jwt.VerifyToken("abc.123.xyz")
	assert.Error(t, err)
	assert.Nil(t, claims)
}

func TestVerifyToken_TamperedToken(t *testing.T) {
	token, err := jwt.GenerateToken(1, 1, "user")
	require.NoError(t, err)

	// Replace the signature portion to make it invalid
	tampered := token[:len(token)-4] + "XXXX"
	claims, err := jwt.VerifyToken(tampered)
	assert.Error(t, err)
	assert.Nil(t, claims)
}

func TestTokenRoundTrip(t *testing.T) {
	testCases := []struct {
		name   string
		userID int
		orgID  int
		role   string
	}{
		{"provider admin", 100, 200, "provider_admin"},
		{"tenant admin", 101, 201, "tenant_admin"},
		{"regular user", 102, 202, "user"},
		{"zero values", 0, 0, "user"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			token, err := jwt.GenerateToken(tc.userID, tc.orgID, tc.role)
			require.NoError(t, err)

			claims, err := jwt.VerifyToken(token)
			require.NoError(t, err)
			assert.Equal(t, tc.userID, claims.UserID)
			assert.Equal(t, tc.orgID, claims.OrgID)
			assert.Equal(t, tc.role, claims.Role)
		})
	}
}

func TestVerifyToken_EmptyString(t *testing.T) {
	claims, err := jwt.VerifyToken("")
	assert.Error(t, err)
	assert.Nil(t, claims)
}
