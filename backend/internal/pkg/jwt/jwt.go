// Package jwt signs and verifies platform access tokens (RS256).
package jwt

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is the access-token payload.
type Claims struct {
	UserID int      `json:"userId"`
	OrgID  int      `json:"orgId"`
	Role   string   `json:"role"`
	Scopes []string `json:"scopes,omitempty"`
	jwt.RegisteredClaims
}

var (
	keyPairOnce sync.Once
	privKey     *rsa.PrivateKey
	loadErr     error
)

// SigningKey returns the RSA private key used to sign access tokens (RS256).
//
// The key is loaded once per process from the JWT_SIGNING_KEY environment
// variable (PEM-encoded PKCS1 or PKCS8 RSA private key). When unset, a
// 2048-bit key is generated in memory and a warning is logged — this is fine
// for local development but tokens will not survive a restart and will not
// validate across multiple instances. Production deployments must set
// JWT_SIGNING_KEY to a stable value (or back it by an HSM/KMS).
func SigningKey() *rsa.PrivateKey {
	keyPairOnce.Do(func() {
		privKey, loadErr = loadOrCreateKey()
		if loadErr != nil {
			// Fatal: a bad key PEM would silently break every token.
			log.Fatalf("jwt: failed to load signing key: %v", loadErr)
		}
	})
	return privKey
}

func loadOrCreateKey() (*rsa.PrivateKey, error) {
	if pemStr := os.Getenv("JWT_SIGNING_KEY"); pemStr != "" {
		key, err := parseRSAPrivateKey([]byte(pemStr))
		if err != nil {
			return nil, fmt.Errorf("invalid JWT_SIGNING_KEY (expected PEM RSA private key): %w", err)
		}
		log.Printf("jwt: loaded RSA signing key from JWT_SIGNING_KEY")
		return key, nil
	}

	log.Printf("Warning: JWT_SIGNING_KEY not set — generating an in-memory RSA key. Tokens will not survive restarts or validate across instances.")
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, fmt.Errorf("failed to generate RSA key: %w", err)
	}
	return key, nil
}

// ParseSigningKeyPEM parses a PEM block containing an RSA private key
// (PKCS1 "RSA PRIVATE KEY" or PKCS8 "PRIVATE KEY"). Exported so callers
// and tests can validate a key before it is loaded as the signing key.
func ParseSigningKeyPEM(pemBytes []byte) (*rsa.PrivateKey, error) {
	return parseRSAPrivateKey(pemBytes)
}

// parseRSAPrivateKey parses a PEM block containing an RSA private key
// (PKCS1 "RSA PRIVATE KEY" or PKCS8 "PRIVATE KEY").
func parseRSAPrivateKey(pemBytes []byte) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode(pemBytes)
	if block == nil {
		return nil, errors.New("no PEM block found")
	}

	// PKCS1 RSA private key.
	if key, err := x509.ParsePKCS1PrivateKey(block.Bytes); err == nil {
		return key, nil
	}

	// PKCS8 private key (may be RSA or other; we require RSA here).
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse private key: %w", err)
	}
	rsaKey, ok := key.(*rsa.PrivateKey)
	if !ok {
		return nil, errors.New("JWT_SIGNING_KEY is not an RSA private key")
	}
	return rsaKey, nil
}

// VerifyKey returns the RSA public key used to verify access tokens.
func VerifyKey() *rsa.PublicKey {
	return &SigningKey().PublicKey
}

// GenerateToken signs an access token (RS256) valid for ttl seconds,
// issued by issuer, for the given user/org/role/scopes.
func GenerateToken(userID, orgID int, role string, scopes []string, issuer string, ttlSeconds int) (string, error) {
	now := time.Now()
	ttl := time.Duration(ttlSeconds) * time.Second
	claims := Claims{
		UserID: userID,
		OrgID:  orgID,
		Role:   role,
		Scopes: scopes,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    issuer,
			Subject:   itoa(userID),
			ID:        randomJTI(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(SigningKey())
}

// VerifyToken validates an access token and returns its claims.
func VerifyToken(tokenString string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return VerifyKey(), nil
	})
	if err != nil {
		return nil, err
	}
	return claims, nil
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := false
	if n < 0 {
		neg = true
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}

func randomJTI() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return ""
	}
	return base64.RawURLEncoding.EncodeToString(b)
}
