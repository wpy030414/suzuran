// Package jwt signs and verifies platform access tokens (RS256).
package jwt

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"errors"
	"fmt"
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
)

// SigningKey returns the RSA private key used to sign access tokens (RS256).
// Generated on first call and kept in memory for the process lifetime.
// In production, load this from a persistent store / HSM so tokens stay
// valid across restarts and across instances.
func SigningKey() *rsa.PrivateKey {
	keyPairOnce.Do(func() {
		key, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			panic(fmt.Sprintf("failed to generate RSA key: %v", err))
		}
		privKey = key
	})
	return privKey
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
