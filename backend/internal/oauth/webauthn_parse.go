package oauth

import (
	"bytes"
	"encoding/json"

	"github.com/go-webauthn/webauthn/protocol"
)

// parseCredentialResponse parses the browser's navigator.credentials.create() response
// into the library's ParsedCredentialCreationData.
func parseCredentialResponse(raw []byte) (*protocol.ParsedCredentialCreationData, error) {
	// protocol.ParseCredentialCreationResponseBody parses the full PublicKeyCredential JSON
	// and returns the structured creation data used by CreateRegistration.
	return protocol.ParseCredentialCreationResponseBody(bytes.NewReader(raw))
}

// parseAssertionResponse parses the browser's navigator.credentials.get() response
// into the library's ParsedCredentialAssertionData.
func parseAssertionResponse(raw []byte) (*protocol.ParsedCredentialAssertionData, error) {
	_ = json.Valid // keep encoding/json import referenced for clarity
	return protocol.ParseCredentialRequestResponseBody(bytes.NewReader(raw))
}
