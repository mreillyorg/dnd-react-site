# Implementation Plan: OAuth Migration

## Overview

Migrate the existing email/password authentication system to an OAuth-only model using the `arctic` library for provider handling, server-side sessions stored in Prisma (AuthSession model), and secure HTTP-only cookies. This removes bcrypt/JWT dependencies, rewrites the auth resolvers and frontend auth flow, and introduces OAuth callback endpoints as Express routes.

## Tasks

- [x] 1. Install dependencies and update Prisma schema
  - [x] 1.1 Install new dependencies and remove old ones
    - Install `arctic` and `cookie-parser` (+ `@types/cookie-parser`) packages
    - Remove `bcrypt`, `@types/bcrypt`, `jsonwebtoken`, and `@types/jsonwebtoken` packages
    - _Requirements: 1.4, 1.5, 2.1_

  - [x] 1.2 Update Prisma schema with OAuthIdentity and AuthSession models
    - Remove `passwordHash` field from `User` model
    - Add `OAuthIdentity` model with id, provider, providerUserId, userId (FK), createdAt, unique constraint on [provider, providerUserId], index on userId, onDelete Cascade
    - Add `AuthSession` model with id, token (unique), userId (FK), expiresAt, createdAt, indexes on token and userId, onDelete Cascade
    - Add `oauthIdentities OAuthIdentity[]` and `authSessions AuthSession[]` relations to User model
    - Generate and apply Prisma migration
    - _Requirements: 1.6, 1.7, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 1.3 Add OAuth environment variables to .env.example and config
    - Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET, APPLE_CLIENT_ID, APPLE_CLIENT_SECRET, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, OAUTH_REDIRECT_BASE_URL to `.env.example`
    - Update `server/config.ts` to export OAuth-related config values (oauthRedirectBaseUrl, cookie secure flag based on NODE_ENV)
    - _Requirements: 2.6_

- [x] 2. Implement OAuth provider registry and service
  - [x] 2.1 Create OAuth provider registry (`server/services/oauthProviders.ts`)
    - Import `arctic` and create lazy-initialized provider instances for google, discord, github, facebook, apple, microsoft
    - Define PROVIDER_SCOPES map with correct scopes per provider
    - Export `getProvider(name)` function that returns the arctic provider instance or throws for unsupported providers
    - Export `SUPPORTED_PROVIDERS` list for validation
    - _Requirements: 2.1, 2.2, 2.6_

  - [x] 2.2 Create session cookie utilities (`server/services/sessionCookie.ts`)
    - Implement `setSessionCookie(res, token)` — sets HttpOnly, Secure (in production), SameSite=Lax, Path=/, Max-Age=7 days
    - Implement `clearSessionCookie(res)` — clears the session cookie
    - Implement `getSessionToken(req)` — extracts session token from parsed cookies
    - Define SESSION_COOKIE_NAME constant ("session") and SESSION_MAX_AGE_SECONDS (7 days)
    - _Requirements: 5.3, 5.5_

  - [x] 2.3 Create OAuth service (`server/services/oauthService.ts`)
    - Implement `createAuthorizationURL(provider)` — generates auth URL with state, code verifier (for Google PKCE), and correct scopes
    - Implement `exchangeCode(provider, code, codeVerifier?)` — exchanges authorization code for tokens, extracts email/name/providerUserId into OAuthProfile
    - Implement `resolveOrCreateUser(deps, profile)` — finds user by email or creates new one with themeMode="SYSTEM", creates/links OAuthIdentity, handles identity conflict errors
    - Implement `createSession(deps, userId)` — generates 32-byte random hex token, stores AuthSession with 7-day expiration via queue
    - Implement `validateSession(deps, token)` — looks up session by token, checks expiration, returns AuthUser or null, deletes expired sessions
    - Implement `invalidateSession(deps, token)` — deletes session from database via queue
    - Use ServiceDeps pattern (prisma + queue) consistent with existing services
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.4, 5.5, 5.6_

  - [x] 2.4 Write property tests for OAuth URL generation (Property 1)
    - **Property 1: Authorization URL generation produces valid provider URLs**
    - For any supported provider name, verify the returned URL contains the provider's authorization endpoint, client ID, redirect URI, and required scopes
    - Use fast-check to generate from supported provider names
    - **Validates: Requirements 2.1, 2.2, 9.1**

  - [x] 2.5 Write property tests for user resolution logic (Properties 4, 5, 6)
    - **Property 4: New user creation completeness** — For any profile with no matching email, verify user + OAuthIdentity are created atomically with themeMode="SYSTEM"
    - **Property 5: Existing user identity linking without duplication** — For any profile matching an existing user, verify identity is linked without creating a duplicate user
    - **Property 6: Duplicate identity rejection** — For any attempt to link an identity already belonging to a different user, verify error is returned
    - Use fast-check to generate random OAuthProfile objects
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.2**

  - [x] 2.6 Write property tests for session token lifecycle (Properties 8, 10, 11)
    - **Property 8: Session token entropy and persistence** — For any createSession call, verify token is 32 bytes hex and persisted with correct userId and future expiresAt
    - **Property 10: Session-based user resolution round-trip** — For any valid non-expired session, verify validateSession returns the associated user
    - **Property 11: Session invalidation** — For any valid session, after invalidateSession the token resolves to null; expired sessions also resolve to null
    - Use fast-check to generate user IDs and test lifecycle
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.5, 5.6**

- [x] 3. Implement auth routes and update Express app
  - [x] 3.1 Create auth routes (`server/routes/authRoutes.ts`)
    - Implement GET `/auth/initiate/:provider` — validates provider name, generates auth URL + state, stores state in a short-lived cookie, redirects to provider
    - Implement GET `/auth/callback/:provider` — validates state cookie against state query param (CSRF), exchanges code for tokens, resolves/creates user, creates session, sets session cookie, redirects to stored return URL (default `/`)
    - Handle error cases: unsupported provider, state mismatch, token exchange failure, identity conflict — redirect to `/login?error=<code>`
    - _Requirements: 2.2, 2.3, 2.5, 3.1, 3.4, 3.5, 5.1, 5.3, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 3.2 Update Express app (`server/app.ts`) to mount auth routes and cookie-parser
    - Add `cookie-parser` middleware before routes
    - Mount `authRouter` at root level (routes already prefixed with `/auth/`)
    - Pass prisma and queue to authRouter (or import directly)
    - _Requirements: 10.1_

  - [x] 3.3 Write property test for CSRF state validation (Property 12)
    - **Property 12: CSRF state validation** — For any callback request where state param does not match state cookie, verify request is rejected without creating a session
    - Use fast-check to generate random state strings and mismatches
    - **Validates: Requirements 10.4**

- [x] 4. Checkpoint - Ensure all server-side tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update GraphQL layer for OAuth
  - [x] 5.1 Update GraphQL schema files
    - Rewrite `auth.graphql`: remove AuthPayload type, register/login/changePassword mutations; add OAuthURL type, `me` query, `initiateOAuth(provider: String!)` query, `linkedProviders` query, `logout` mutation
    - Update `user.graphql`: remove password from CreateUserInput if present
    - _Requirements: 1.1, 1.2, 1.3, 9.1, 9.2, 9.3, 9.5_

  - [x] 5.2 Rewrite auth resolvers (`server/graphql/resolvers/auth.resolver.ts`)
    - Implement `Query.me` — returns ctx.currentUser user data or null
    - Implement `Query.initiateOAuth(provider)` — calls createAuthorizationURL, returns { url, provider }, validates provider name (BAD_USER_INPUT for unsupported)
    - Implement `Query.linkedProviders` — requires auth, queries OAuthIdentity for current user's linked provider names
    - Implement `Mutation.logout` — requires session token from context, invalidates session, returns true
    - Remove register, login, changePassword mutations
    - _Requirements: 1.1, 1.2, 1.3, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 5.3 Update GraphQL context factory (`server/graphql/context.ts`)
    - Replace JWT-based authentication with cookie-session lookup
    - Import `getSessionToken` from sessionCookie utilities
    - Import `validateSession` from oauthService
    - Parse session token from request cookies (requires cookie-parser to have run)
    - Look up session in DB; if valid and non-expired, set currentUser; otherwise null
    - Remove import of `verifyToken` from old authService
    - Remove `extractBearerToken` helper
    - _Requirements: 5.4, 5.6, 7.4_

  - [x] 5.4 Write unit tests for auth resolvers
    - Test `initiateOAuth` returns error for unsupported provider
    - Test `me` returns null when unauthenticated
    - Test `linkedProviders` requires authentication
    - Test `logout` invalidates session
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 6. Checkpoint - Ensure all server tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update frontend auth layer
  - [x] 7.1 Rewrite AuthContext (`src/contexts/AuthContext.tsx`)
    - Remove `login(email, password)` and `register(email, password, name)` functions
    - Remove all localStorage read/write for TOKEN_KEY
    - Remove `token` state from context
    - Implement `initiateOAuth(provider)` — redirects browser to `/auth/initiate/:provider`
    - Update `fetchCurrentUser` to call `me` query with `credentials: "include"` (no Authorization header)
    - Implement `logout()` — calls GraphQL `logout` mutation with `credentials: "include"`, clears user state, navigates to /login
    - Export updated `AuthContextType` interface: { user, isLoading, initiateOAuth, logout }
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [x] 7.2 Rewrite LoginPage (`src/pages/LoginPage.tsx`)
    - Remove email/password form fields and submission logic
    - Display OAuth provider buttons: Google, Discord, GitHub, Facebook, Apple, Microsoft
    - Each button calls `initiateOAuth(providerName)` from AuthContext
    - Show loading indicator during redirect
    - Read `?error` query parameter and display user-friendly error message using ERROR_MESSAGES map from design
    - Remove link to registration page
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 7.3 Remove RegisterPage and update routing (`src/App.tsx`)
    - Delete `src/pages/RegisterPage.tsx`
    - Remove RegisterPage import and route from App.tsx
    - Add redirect from `/register` to `/login` using Navigate component
    - Remove "Register" link from Navbar
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 7.4 Write unit tests for LoginPage and AuthContext
    - Test LoginPage renders all 6 provider buttons
    - Test LoginPage displays error messages from query params
    - Test AuthContext calls `me` query with `credentials: "include"`
    - Test `/register` route redirects to `/login`
    - _Requirements: 6.1, 6.5, 7.4, 8.3_

- [x] 8. Remove old auth service and clean up
  - [x] 8.1 Delete old auth service and update imports
    - Delete `server/services/authService.ts`
    - Remove authService-related test files if they exist
    - Update `server/services/index.ts` if it re-exports authService
    - Ensure no remaining imports reference the deleted file
    - _Requirements: 1.4, 1.5_

  - [x] 8.2 Update existing auth-related tests
    - Remove or rewrite any existing tests that reference register/login/changePassword mutations
    - Update integration tests (`server/app.integration.test.ts`) to use cookie-based auth
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 8.3 Write integration tests for the full OAuth flow
    - Test complete OAuth callback flow with mocked provider (code exchange → session creation → cookie set → redirect)
    - Test GraphQL `me` query with valid session cookie returns user
    - Test GraphQL `me` query without cookie returns null
    - Test GraphQL `logout` mutation invalidates session and clears cookie
    - Test expired session token is rejected and cookie cleared
    - _Requirements: 5.4, 5.5, 5.6, 9.2, 9.3, 10.2_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `arctic` library handles provider-specific quirks (PKCE for Google, different token endpoints, etc.)
- All write operations to SQLite go through the existing operation queue pattern
- The session cookie approach means the frontend no longer needs to manage tokens — it just includes credentials with requests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["2.4", "2.5", "2.6", "3.1"] },
    { "id": 5, "tasks": ["3.2", "3.3"] },
    { "id": 6, "tasks": ["5.1"] },
    { "id": 7, "tasks": ["5.2", "5.3"] },
    { "id": 8, "tasks": ["5.4"] },
    { "id": 9, "tasks": ["7.1"] },
    { "id": 10, "tasks": ["7.2", "7.3"] },
    { "id": 11, "tasks": ["7.4", "8.1"] },
    { "id": 12, "tasks": ["8.2"] },
    { "id": 13, "tasks": ["8.3"] }
  ]
}
```
