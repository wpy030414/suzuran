package oauth

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/xrl/suzuran-cloud/internal/pkg/redis"
)

// sessionTTLStore is the in-memory fallback when Redis is unavailable (tests/dev).
var sessionTTLStore = map[string]*sessionEntry{}

type sessionEntry struct {
	data      *webauthn.SessionData
	expiresAt time.Time
}

func storeSession(id string, data *webauthn.SessionData, ttl time.Duration) error {
	if redis.Client != nil {
		raw, err := json.Marshal(data)
		if err != nil {
			return err
		}
		return redis.Set(context.Background(), "wa_session:"+id, raw, ttl)
	}
	sessionTTLStore[id] = &sessionEntry{data: data, expiresAt: time.Now().Add(ttl)}
	return nil
}

func loadSession(id string) (*webauthn.SessionData, error) {
	if redis.Client != nil {
		val, err := redis.Get(context.Background(), "wa_session:"+id).Bytes()
		if err != nil || len(val) == 0 {
			return nil, errors.New("session not found")
		}
		var sd webauthn.SessionData
		if err := json.Unmarshal(val, &sd); err != nil {
			return nil, err
		}
		return &sd, nil
	}
	entry, ok := sessionTTLStore[id]
	if !ok || time.Now().After(entry.expiresAt) {
		delete(sessionTTLStore, id)
		return nil, errors.New("session not found")
	}
	return entry.data, nil
}

func deleteSession(id string) {
	if redis.Client != nil {
		_ = redis.Delete(context.Background(), "wa_session:"+id)
		return
	}
	delete(sessionTTLStore, id)
}
