# Requirements Document

## Introduction

This document specifies the requirements for migrating the existing email/password authentication system to an OAuth-only authentication model. The current implementation uses bcrypt password hashing, JWT tokens, and email/password forms for login and registration. The target state replaces all password-based flows with OAuth provider authentication (Google, Discord, GitHub, Facebook, Apple, Microsoft) as defined in the user-registration spec. This migration touches the frontend login/register pages, the AuthContext, the server auth service, GraphQL resolvers, and the Prisma schema.

## Glossary

- **OAuth_Service**: The server-side component responsible for handling OAuth 2.0 flows, token exchange, and identity resolution with external providers
- **OAuth_Provider**: A third-party authentication service: Google OAuth 2.0, Discord OAuth 2.0, GitHub OAuth 2.0, Facebook Login, Sign in with Apple, or Microsoft Account (Azure AD OAuth 2.0)
- **OAuth_Identity**: A record linking a user account to a specific OAuth_Provider, storing the provider name and provider-specific user identifier
- **Auth_Context**: The client-side React context that manages authentication state, OAuth flow initiation, and session persistence
- **Login_Page**: The frontend page that presents OAuth provider buttons for authentication
- **Session_Token**: A cryptographically secure token (at least 256 bits of entropy) used to maintain authenticated sessions, stored as a secure HTTP-only cookie
- **Auth_Resolver**: The GraphQL resolver layer that exposes OAuth authentication mutations and session management
- **User_Model**: The Prisma schema model representing a registered user, updated to remove passwordHash and add OAuth identity relations
- **Callback_Handler**: The server-side endpoint that receives the authorization code from an OAuth_Provider after user consent and exchanges it for access tokens

## Requirements

### Requirement 1: Remove Password-Based Authentication

**User Story:** As a developer, I want to remove all password-based authentication code, so that the system has a single, consistent OAuth-only authentication path.

#### Acceptance Criteria

1. THE Auth_Resolver SHALL remove the `register` mutation that accepts email and password arguments
2. THE Auth_Resolver SHALL remove the `login` mutation that accepts email and password arguments
3. THE Auth_Resolver SHALL remove the `changePassword` mutation
4. THE OAuth_Service SHALL remove all bcrypt password hashing and comparison logic
5. THE OAuth_Service SHALL remove all JWT token generation and verification logic for password-based sessions
6. THE User_Model SHALL remove the `passwordHash` field from the Prisma schema
7. WHEN the Prisma schema is updated, THE OAuth_Service SHALL generate a migration that drops the `passwordHash` column from the User table

### Requirement 2: OAuth Provider Integration

**User Story:** As a user, I want to authenticate using my existing OAuth accounts, so that I can access the D&D companion site without creating a new password.

#### Acceptance Criteria

1. THE OAuth_Service SHALL support authentication via Google OAuth 2.0, Discord OAuth 2.0, GitHub OAuth 2.0, Facebook Login (OAuth 2.0), Sign in with Apple, and Microsoft Account (Azure AD OAuth 2.0)
2. WHEN a user initiates OAuth login for a given OAuth_Provider, THE OAuth_Service SHALL redirect the user to that provider's authorization endpoint with the appropriate client ID, redirect URI, and requested scopes (profile and email)
3. WHEN an OAuth_Provider redirects back with an authorization code, THE Callback_Handler SHALL exchange the code for access and ID tokens within 10 seconds
4. WHEN token exchange succeeds, THE OAuth_Service SHALL extract the user's email, name, and provider-specific identifier from the token response or userinfo endpoint
5. IF token exchange fails or the OAuth_Provider returns an error, THEN THE OAuth_Service SHALL return an authentication error to the client with a descriptive message
6. THE OAuth_Service SHALL store each provider's client ID and client secret as environment variables, not hard-coded in source

### Requirement 3: Account Creation via OAuth

**User Story:** As a new user, I want my account to be created automatically when I first authenticate with an OAuth provider, so that registration is seamless.

#### Acceptance Criteria

1. WHEN a user authenticates via OAuth for the first time (no existing user matches the email), THE OAuth_Service SHALL create a new User record with the email and name from the OAuth profile
2. WHEN a new user account is created via OAuth, THE OAuth_Service SHALL create an associated OAuth_Identity record linking the user to the provider and provider-specific identifier
3. WHEN a new user account is created, THE OAuth_Service SHALL set the user's `themeMode` to "SYSTEM" by default
4. WHEN a user authenticates via OAuth with an email matching an existing User record, THE OAuth_Service SHALL link the new OAuth_Identity to the existing account without creating a duplicate user
5. IF a user attempts to link an OAuth_Provider that is already linked to a different user account, THEN THE OAuth_Service SHALL return an error indicating the OAuth identity is already associated with another account

### Requirement 4: OAuth Identity Data Model

**User Story:** As a developer, I want a database model to store OAuth identity links, so that users can authenticate via multiple providers and the system can resolve identities correctly.

#### Acceptance Criteria

1. THE User_Model SHALL include a new `OAuthIdentity` model with fields: id, provider (string), providerUserId (string), userId (foreign key to User), and createdAt
2. THE User_Model SHALL enforce a unique constraint on the combination of provider and providerUserId in the OAuthIdentity model
3. THE User_Model SHALL define a one-to-many relation from User to OAuthIdentity (one user can have multiple OAuth identities)
4. THE User_Model SHALL set onDelete Cascade on the OAuthIdentity relation so that deleting a user removes associated OAuth identities
5. WHEN the Prisma schema is updated with the OAuthIdentity model, THE OAuth_Service SHALL generate a Prisma migration that creates the OAuthIdentity table

### Requirement 5: Session Management via Secure Cookies

**User Story:** As an authenticated user, I want my session to persist securely across browser sessions using cookies, so that I remain logged in without exposing tokens to JavaScript.

#### Acceptance Criteria

1. WHEN OAuth authentication succeeds, THE OAuth_Service SHALL generate a Session_Token with at least 256 bits of cryptographic entropy
2. WHEN a Session_Token is generated, THE OAuth_Service SHALL store it server-side associated with the user ID and an expiration timestamp
3. WHEN a session is created, THE OAuth_Service SHALL set the Session_Token in a secure, HTTP-only, SameSite=Lax cookie with a default expiration of 7 days
4. WHILE a valid Session_Token cookie is present in a request, THE Auth_Resolver SHALL authenticate the request by resolving the associated user from the server-side session store
5. WHEN a user logs out, THE OAuth_Service SHALL invalidate the Session_Token server-side and clear the session cookie
6. WHEN a Session_Token has expired, THE Auth_Resolver SHALL reject the request as unauthenticated and clear the expired cookie
7. THE OAuth_Service SHALL remove all localStorage-based token storage from the client

### Requirement 6: Frontend OAuth Login Flow

**User Story:** As a user, I want to see OAuth provider buttons on the login page instead of an email/password form, so that I can authenticate with a single click.

#### Acceptance Criteria

1. THE Login_Page SHALL display a button for each supported OAuth_Provider: Google, Discord, GitHub, Facebook, Apple, and Microsoft
2. WHEN a user clicks an OAuth_Provider button, THE Login_Page SHALL redirect the browser to the server's OAuth initiation endpoint for that provider
3. THE Login_Page SHALL remove the email input field, password input field, and form submission logic
4. THE Login_Page SHALL remove the link to the registration page (registration happens implicitly via first OAuth login)
5. IF OAuth authentication fails and the user is redirected back with an error, THEN THE Login_Page SHALL display an error message describing the failure
6. WHILE OAuth redirect is in progress, THE Login_Page SHALL display a loading indicator

### Requirement 7: Frontend Auth Context Migration

**User Story:** As a developer, I want the AuthContext to use cookie-based sessions and OAuth flows instead of localStorage JWT tokens, so that the client authentication state is consistent with the new server model.

#### Acceptance Criteria

1. THE Auth_Context SHALL remove the `login(email, password)` function
2. THE Auth_Context SHALL remove the `register(email, password, name)` function
3. THE Auth_Context SHALL remove all localStorage read and write operations for token storage
4. THE Auth_Context SHALL determine authentication state by calling a `me` query that relies on the session cookie (credentials: include) rather than an Authorization header
5. WHEN the `me` query returns a valid user, THE Auth_Context SHALL set the authenticated user state
6. WHEN the `me` query returns unauthenticated, THE Auth_Context SHALL set the user state to null
7. THE Auth_Context SHALL expose a `logout` function that calls a server logout mutation (to invalidate the session) and then clears the local user state
8. THE Auth_Context SHALL expose an `initiateOAuth(provider)` function that redirects the browser to the server's OAuth initiation endpoint for the specified provider

### Requirement 8: Remove Registration Page

**User Story:** As a user, I want a single authentication entry point via OAuth, so that there is no confusion between login and registration flows.

#### Acceptance Criteria

1. THE Login_Page SHALL serve as the single entry point for both new and returning users
2. THE Auth_Context SHALL remove the route definition for the `/register` path
3. WHEN a user navigates to `/register`, THE application SHALL redirect to `/login`
4. THE application SHALL remove the RegisterPage component file from the codebase

### Requirement 9: GraphQL Schema Updates for OAuth

**User Story:** As a developer, I want the GraphQL schema to expose OAuth-specific mutations and remove password-based mutations, so that the API surface matches the OAuth-only model.

#### Acceptance Criteria

1. THE Auth_Resolver SHALL expose an `initiateOAuth(provider: String!)` query that returns the OAuth authorization URL for the specified provider
2. THE Auth_Resolver SHALL expose a `logout` mutation that invalidates the current session and returns a success boolean
3. THE Auth_Resolver SHALL expose a `me` query that returns the current authenticated user or null based on the session cookie
4. WHEN the `initiateOAuth` query receives an unsupported provider name, THE Auth_Resolver SHALL return an error with code BAD_USER_INPUT
5. THE Auth_Resolver SHALL expose a `linkedProviders` query that returns the list of OAuth_Provider names linked to the current authenticated user

### Requirement 10: OAuth Callback Server Endpoint

**User Story:** As a developer, I want a server endpoint to handle OAuth callbacks, so that authorization codes can be exchanged for tokens and sessions created outside the GraphQL layer.

#### Acceptance Criteria

1. THE Callback_Handler SHALL expose an HTTP GET endpoint at `/auth/callback/:provider` to receive OAuth authorization codes
2. WHEN the Callback_Handler receives a valid authorization code, THE Callback_Handler SHALL exchange it for tokens, resolve or create the user, generate a Session_Token, set the session cookie, and redirect the browser to the application home page
3. IF the Callback_Handler receives an error parameter from the OAuth_Provider, THEN THE Callback_Handler SHALL redirect the browser to the Login_Page with an error query parameter describing the failure
4. THE Callback_Handler SHALL validate the `state` parameter to prevent CSRF attacks during the OAuth flow
5. WHEN the OAuth flow completes, THE Callback_Handler SHALL redirect to the URL stored in the session state (defaulting to `/`) rather than always redirecting to home
