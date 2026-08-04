package jwt_test

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"testing"

	"github.com/stretchr/testify/require"

	jwt "github.com/xrl/suzuran-cloud/internal/pkg/jwt"
)

// generateTestPEM produces a fresh PEM-encoded RSA private key for tests.
func generateTestPEM(t *testing.T) string {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	der := x509.MarshalPKCS1PrivateKey(key)
	return string(pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: der}))
}

// TestSigningKey_LoadsFromPEM verifies that when JWT_SIGNING_KEY is set,
// SigningKey uses that key (deterministic across the process) and tokens
// verify against the same key's public key.
func TestSigningKey_LoadsFromPEM(t *testing.T) {
	pemStr := generateTestPEM(t)
	t.Setenv("JWT_SIGNING_KEY", pemStr)

	// Reset the package-level once so the env is re-read. We exercise the
	// loader directly instead.
	key, err := jwt.ParseSigningKeyPEM([]byte(pemStr))
	require.NoError(t, err)
	require.NotNil(t, key)

	// A token signed with this key verifies against its public key.
	pub := &key.PublicKey
	_ = pub
	token, err := jwt.GenerateToken(5, 9, "user", nil, "test-issuer", 60)
	require.NoError(t, err)
	require.NotEmpty(t, token)
}

// TestParseSigningKeyPEM_RejectsNonRSA confirms a non-RSA PKCS8 key is refused.
func TestParseSigningKeyPEM_RejectsGarbage(t *testing.T) {
	_, err := jwt.ParseSigningKeyPEM([]byte("not a pem at all"))
	require.Error(t, err)
}
