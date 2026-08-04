package jwt_test

import (
	"testing"

	jwt "github.com/xrl/suzuran-cloud/internal/pkg/jwt"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	testIssuer    = "https://suzuran.test"
	testTTLSeconds = 900
)

func TestGenerateToken_ReturnsNonEmptyString(t *testing.T) {
	token, err := jwt.GenerateToken(1, 10, "user", nil, testIssuer, testTTLSeconds)
	require.NoError(t, err)
	assert.NotEmpty(t, token)
}

func TestVerifyToken_ValidToken(t *testing.T) {
	token, err := jwt.GenerateToken(42, 7, "provider", nil, testIssuer, testTTLSeconds)
	require.NoError(t, err)

	claims, err := jwt.VerifyToken(token)
	require.NoError(t, err)
	assert.Equal(t, 42, claims.UserID)
	assert.Equal(t, 7, claims.OrgID)
	assert.Equal(t, "provider", claims.Role)
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
	token, err := jwt.GenerateToken(1, 1, "user", nil, testIssuer, testTTLSeconds)
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
		scopes []string
	}{
		{"provider admin", 100, 200, "provider", []string{"org.read", "org.write"}},
		{"tenant admin", 101, 201, "tenant_admin", []string{"org.read"}},
		{"regular user", 102, 202, "user", []string{"data.read"}},
		{"zero values", 0, 0, "user", nil},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			token, err := jwt.GenerateToken(tc.userID, tc.orgID, tc.role, tc.scopes, testIssuer, testTTLSeconds)
			require.NoError(t, err)

			claims, err := jwt.VerifyToken(token)
			require.NoError(t, err)
			assert.Equal(t, tc.userID, claims.UserID)
			assert.Equal(t, tc.orgID, claims.OrgID)
			assert.Equal(t, tc.role, claims.Role)
			if tc.scopes != nil {
				assert.Equal(t, tc.scopes, claims.Scopes)
			}
		})
	}
}

func TestVerifyToken_EmptyString(t *testing.T) {
	claims, err := jwt.VerifyToken("")
	assert.Error(t, err)
	assert.Nil(t, claims)
}
