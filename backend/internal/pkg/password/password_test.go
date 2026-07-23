package password_test

import (
	"testing"

	password "github.com/xrl/suzuran-cloud/internal/pkg/password"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHash_ReturnsNonEmpty(t *testing.T) {
	hash, err := password.Hash("secret123")
	require.NoError(t, err)
	assert.NotEmpty(t, hash)
}

func TestHash_DifferentHashesForSamePassword(t *testing.T) {
	hash1, err := password.Hash("my-password")
	require.NoError(t, err)

	hash2, err := password.Hash("my-password")
	require.NoError(t, err)

	// bcrypt uses random salt, so hashes must differ
	assert.NotEqual(t, hash1, hash2)
}

func TestVerify_CorrectPassword(t *testing.T) {
	hash, err := password.Hash("correct-horse-battery-staple")
	require.NoError(t, err)

	assert.True(t, password.Verify("correct-horse-battery-staple", hash))
}

func TestVerify_WrongPassword(t *testing.T) {
	hash, err := password.Hash("the-real-password")
	require.NoError(t, err)

	assert.False(t, password.Verify("wrong-password", hash))
}

func TestVerify_EmptyString(t *testing.T) {
	hash, err := password.Hash("something")
	require.NoError(t, err)

	assert.False(t, password.Verify("", hash))
}

func TestHashVerify_RoundTrip(t *testing.T) {
	passwords := []string{
		"",
		"a",
		"password",
		"P@ssw0rd!",
		"a-very-long-password-with-many-characters-1234567890",
	}

	for _, pw := range passwords {
		t.Run(pw, func(t *testing.T) {
			hash, err := password.Hash(pw)
			require.NoError(t, err)
			assert.True(t, password.Verify(pw, hash))
		})
	}
}
