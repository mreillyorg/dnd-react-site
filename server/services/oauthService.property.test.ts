/**
 * Property-based test for OAuth authorization URL generation.
 *
 * Feature: oauth-migration, Property 1: Authorization URL generation
 *
 * **Validates: Requirements 2.1, 2.2, 9.1**
 *
 * Property 1: Authorization URL generation produces valid provider URLs.
 * For any supported provider name, calling createAuthorizationURL(provider)
 * returns a URL that contains the provider's authorization endpoint,
 * the configured client ID, the configured redirect URI, and the required
 * scopes for that provider.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import * as fc from "fast-check";

// Mock config before importing modules that depend on it.
// The factory must be self-contained (no top-level variable references) because vi.mock is hoisted.
vi.mock("../config.ts", () => ({
  config: {
    oauthRedirectBaseUrl: "http://localhost:5173",
    cookieSecure: false,
    googleClientId: "test-google-client-id",
    googleClientSecret: "test-google-client-secret",
    discordClientId: "test-discord-client-id",
    discordClientSecret: "test-discord-client-secret",
    githubClientId: "test-github-client-id",
    githubClientSecret: "test-github-client-secret",
    facebookClientId: "test-facebook-client-id",
    facebookClientSecret: "test-facebook-client-secret",
    appleClientId: "test-apple-client-id",
    appleClientSecret: "test-apple-client-secret",
    microsoftClientId: "test-microsoft-client-id",
    microsoftClientSecret: "test-microsoft-client-secret",
  },
}));

/** Test config values mirroring the mock above for assertions. */
const TEST_CONFIG = {
  oauthRedirectBaseUrl: "http://localhost:5173",
  googleClientId: "test-google-client-id",
  discordClientId: "test-discord-client-id",
  githubClientId: "test-github-client-id",
  facebookClientId: "test-facebook-client-id",
  appleClientId: "test-apple-client-id",
  microsoftClientId: "test-microsoft-client-id",
};

// Set env vars needed by providers before they are lazily initialized
process.env.APPLE_TEAM_ID = "TEST_TEAM_ID";
process.env.APPLE_KEY_ID = "TEST_KEY_ID";
process.env.MICROSOFT_TENANT_ID = "common";

import { createAuthorizationURL } from "./oauthService.ts";
import {
  SUPPORTED_PROVIDERS,
  PROVIDER_SCOPES,
  type SupportedProvider,
} from "./oauthProviders.ts";

/**
 * Expected authorization endpoint base URLs per provider.
 */
const PROVIDER_AUTH_ENDPOINTS: Record<SupportedProvider, string> = {
  google: "https://accounts.google.com/o/oauth2/v2/auth",
  discord: "https://discord.com/oauth2/authorize",
  github: "https://github.com/login/oauth/authorize",
  facebook: "https://www.facebook.com/v",
  apple: "https://appleid.apple.com/auth/authorize",
  microsoft: "https://login.microsoftonline.com/",
};

/** Providers that use PKCE and should have a codeVerifier. */
const PKCE_PROVIDERS: ReadonlySet<string> = new Set([
  "google",
  "discord",
  "microsoft",
]);

describe("Feature: oauth-migration, Property 1: Authorization URL generation", () => {
  it("produces valid provider URLs with correct parameters for any supported provider", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_PROVIDERS),
        (provider: SupportedProvider) => {
          const result = createAuthorizationURL(provider);

          // 1. The returned URL should be a valid URL string
          const url = new URL(result.url);
          expect(url.protocol).toMatch(/^https?:$/);

          // 2. The URL should point to the provider's authorization endpoint
          const expectedEndpoint = PROVIDER_AUTH_ENDPOINTS[provider];
          expect(result.url).toContain(expectedEndpoint);

          // 3. The URL should contain the client_id parameter
          const clientIdKey = `${provider}ClientId` as keyof typeof TEST_CONFIG;
          expect(url.searchParams.get("client_id")).toBe(TEST_CONFIG[clientIdKey]);

          // 4. The URL should contain redirect_uri pointing to /auth/callback/{provider}
          const redirectUri = url.searchParams.get("redirect_uri");
          expect(redirectUri).toContain(`/auth/callback/${provider}`);
          expect(redirectUri).toContain(TEST_CONFIG.oauthRedirectBaseUrl);

          // 5. The URL should contain scope parameter with the expected scopes
          const scopeParam = url.searchParams.get("scope");
          expect(scopeParam).toBeTruthy();
          const expectedScopes = PROVIDER_SCOPES[provider];
          for (const scope of expectedScopes) {
            expect(scopeParam).toContain(scope);
          }

          // 6. The state should be a non-empty string
          expect(result.state).toBeTruthy();
          expect(result.state.length).toBeGreaterThan(0);

          // 7. PKCE: Google/Discord/Microsoft should have codeVerifier, others should not
          if (PKCE_PROVIDERS.has(provider)) {
            expect(result.codeVerifier).toBeDefined();
            expect(result.codeVerifier!.length).toBeGreaterThan(0);
          } else {
            expect(result.codeVerifier).toBeUndefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  }, 30_000);
});
