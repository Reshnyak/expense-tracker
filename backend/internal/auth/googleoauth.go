package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// GoogleProfile is the subset of the Google userinfo payload we consume.
// given_name/family_name are standard OIDC claims returned alongside `name`
// whenever the "profile" scope is granted (see NewGoogleAuthenticator).
type GoogleProfile struct {
	Sub        string `json:"sub"`
	Email      string `json:"email"`
	Name       string `json:"name"`
	GivenName  string `json:"given_name"`
	FamilyName string `json:"family_name"`
	Picture    string `json:"picture"`
}

// GoogleAuthenticator wraps the OAuth2 config for the "sign in with Google" flow.
type GoogleAuthenticator struct {
	cfg *oauth2.Config
}

func NewGoogleAuthenticator(clientID, clientSecret, redirectURL string) *GoogleAuthenticator {
	return &GoogleAuthenticator{
		cfg: &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			RedirectURL:  redirectURL,
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     google.Endpoint,
		},
	}
}

// AuthCodeURL returns the Google consent URL for the given anti-CSRF state.
func (g *GoogleAuthenticator) AuthCodeURL(state string) string {
	return g.cfg.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

// Exchange swaps an authorization code for the caller's Google profile.
func (g *GoogleAuthenticator) Exchange(ctx context.Context, code string) (*GoogleProfile, error) {
	token, err := g.cfg.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("exchange code: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://openidconnect.googleapis.com/v1/userinfo", nil)
	if err != nil {
		return nil, err
	}
	token.SetAuthHeader(req)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch userinfo: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("userinfo returned status %d", resp.StatusCode)
	}

	var profile GoogleProfile
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return nil, fmt.Errorf("decode userinfo: %w", err)
	}
	return &profile, nil
}
