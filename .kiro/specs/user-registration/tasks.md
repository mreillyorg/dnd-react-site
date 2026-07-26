# Implementation Plan: User Registration & Authentication

## Overview

Implement secure user registration and authentication using JWT tokens, bcrypt password hashing, and GraphQL mutations. The system includes input validation, session management, and integration with the React frontend through an Auth Context. All implementations must include comprehensive tests with 80% minimum coverage.

---

## Tasks

- [x] 1. Install authentication dependencies and configure test infrastructure
  - Install backend packages: `bcrypt`, `@types/bcrypt`, `jsonwebtoken`, `@types/jsonwebtoken`, `zod`
  - Verify Vitest is configured with 80% coverage thresholds
  - Add JWT_SECRET to `.env.example` and `.env` files
  - Generate a secure 256-bit secret for JWT_SECRET in development
  - Document that JWT_SECRET must be changed in production
  - _Requirements: All security requirements_
  - **TESTING REQUIRED: Verify test infrastructure is ready**

- [x] 2. Implement AuthService with password hashing and validation
  - [x] 2.1 Create `src/services/authService.ts`
    - Implement password validation schemas using Zod (min 8 chars, uppercase, lowercase, number)
    - Implement email validation schema
    - Implement `register()` method: validate input, check for existing user, hash password with bcrypt (12 rounds), create user, generate JWT
    - Implement `login()` method: find user, verify password with bcrypt.compare, generate JWT
    - Implement `verifyToken()` method: verify JWT and return userId
    - Implement `generateToken()` private method: sign JWT with 7-day expiration
    - Implement `changePassword()` method: verify current password, validate new password, hash and update
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 2.2 Write unit tests for AuthService (**REQUIRED**)
    - **Test register() success case**: assert user created, password hashed, token generated
    - **Test register() duplicate email**: assert throws error
    - **Test register() email validation**: assert rejects invalid emails
    - **Test register() password validation**: assert rejects weak passwords (no uppercase, no lowercase, no number, too short)
    - **Test login() success case**: assert token generated for correct credentials
    - **Test login() invalid email**: assert throws error
    - **Test login() invalid password**: assert throws error
    - **Test verifyToken() valid token**: assert returns userId
    - **Test verifyToken() invalid token**: assert throws error
    - **Test verifyToken() expired token**: assert throws error (mock jwt.verify)
    - **Test changePassword() success**: assert password updated, can login with new password
    - **Test changePassword() wrong current password**: assert throws error
    - **Test changePassword() weak new password**: assert throws error
    - **Test password hashing**: assert password hash does not equal plaintext, matches bcrypt pattern
    - **All tests must pass before proceeding to task 3**
    - **Minimum 80% coverage required**
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Implement GraphQL authentication schema
  - [x] 3.1 Create GraphQL types in `src/graphql/types/Auth.ts`
    - Define `AuthPayload` type with `token: String!` and `user: User!` fields
    - Implement `register` mutation with email, password, name arguments
    - Implement `login` mutation with email, password arguments
    - Implement `changePassword` mutation with currentPassword, newPassword arguments (requires authentication)
    - Implement `me` query returning current User (nullable, returns null if not authenticated)
    - Wire all resolvers to AuthService methods
    - Handle errors and throw GraphQL errors with proper error codes
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 3.2 Write unit tests for Auth resolvers (**REQUIRED**)
    - **Mock AuthService for all tests**
    - **Test register resolver**: assert calls AuthService.register with correct args
    - **Test register resolver error handling**: assert GraphQL error thrown when service throws
    - **Test login resolver**: assert calls AuthService.login with correct args
    - **Test login resolver error handling**: assert GraphQL error thrown for invalid credentials
    - **Test changePassword resolver auth check**: assert throws error when ctx.userId is null
    - **Test changePassword resolver success**: assert calls AuthService.changePassword
    - **Test me query with auth**: assert returns user when ctx.userId is set
    - **Test me query without auth**: assert returns null when ctx.userId is null
    - **All tests must pass before proceeding to task 4**
    - **Minimum 80% coverage required**
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Update GraphQL context to extract JWT from Authorization header
  - [x] 4.1 Update `src/graphql/server.ts`
    - Implement `getUserIdFromRequest()` function: extract Bearer token from Authorization header, verify with AuthService, return userId or undefined
    - Update context builder to include userId from token
    - Handle token verification errors gracefully (log and return undefined, don't throw)
    - _Requirements: 3.1, 3.2_
  - [x] 4.2 Write unit tests for context builder (**REQUIRED**)
    - **Test context with valid token**: assert ctx.userId is set correctly
    - **Test context with invalid token**: assert ctx.userId is undefined
    - **Test context with missing Authorization header**: assert ctx.userId is undefined
    - **Test context with malformed Authorization header**: assert ctx.userId is undefined (no "Bearer" prefix)
    - **Test error logging**: assert errors are logged but don't throw
    - **All tests must pass before proceeding to task 5**
    - **Minimum 80% coverage required**
    - _Requirements: 3.1, 3.2_

- [x] 5. Checkpoint — Backend authentication complete
  - **GATE: All backend tests must pass with 80%+ coverage**
  - Run `npm run test:coverage` for backend
  - Verify all AuthService tests pass
  - Verify all Auth resolver tests pass
  - Verify all context builder tests pass
  - Verify coverage meets 80% threshold
  - **DO NOT PROCEED without passing tests**
  - Ask user if questions arise

- [x] 6. Implement React AuthContext and session management
  - [x] 6.1 Create `src/contexts/AuthContext.tsx`
    - Define `AuthContext` interface with user, token, isLoading, login, register, logout
    - Implement `AuthProvider` component
    - Load token from localStorage on mount
    - Implement `fetchCurrentUser()` to query `me` GraphQL query
    - Implement `login()` function: call login mutation, store token in localStorage, update state
    - Implement `register()` function: call register mutation, store token in localStorage, update state
    - Implement `logout()` function: remove token from localStorage, clear state, navigate to /login
    - Export `useAuth()` hook with context validation
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 6.2 Write unit tests for AuthContext (**REQUIRED**)
    - **Mock fetch for all GraphQL calls**
    - **Test token loading from localStorage**: assert fetchCurrentUser called with stored token
    - **Test login success**: assert token stored, user state updated, navigate called
    - **Test login failure**: assert error thrown, no state change
    - **Test register success**: assert token stored, user state updated, navigate called
    - **Test register failure**: assert error thrown, no state change
    - **Test logout**: assert token removed from localStorage, state cleared, navigate to /login
    - **Test invalid stored token**: assert token removed, user set to null
    - **Test useAuth outside provider**: assert throws error
    - **All tests must pass before proceeding to task 7**
    - **Minimum 80% coverage required**
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. Implement Login page component
  - [x] 7.1 Create `src/pages/LoginPage.tsx`
    - Implement form with email and password inputs using daisyUI components
    - Add form validation (required fields)
    - Call `useAuth().login()` on form submit
    - Display error messages from login failures
    - Show loading state during login
    - Add link to register page
    - Use proper autocomplete attributes (email, current-password)
    - _Requirements: 5.1, 5.2_
  - [x] 7.2 Write component tests for LoginPage (**REQUIRED**)
    - **Mock useAuth hook**
    - **Test form rendering**: assert email and password inputs present
    - **Test form submission**: assert login called with correct values
    - **Test error display**: assert error message shown when login fails
    - **Test loading state**: assert loading indicator shown during login
    - **Test navigation link**: assert link to register page present
    - **Test form validation**: assert form requires email and password
    - **Test accessibility**: assert proper labels and ARIA attributes
    - **All tests must pass before proceeding to task 8**
    - **Minimum 80% coverage required**
    - _Requirements: 5.1, 5.2_

- [x] 8. Implement Register page component
  - [x] 8.1 Create `src/pages/RegisterPage.tsx`
    - Implement form with name, email, password, confirmPassword inputs using daisyUI components
    - Add password strength indicator
    - Validate passwords match before submission
    - Call `useAuth().register()` on form submit
    - Display error messages from registration failures
    - Show loading state during registration
    - Add link to login page
    - Use proper autocomplete attributes (name, email, new-password)
    - _Requirements: 5.1, 5.2_
  - [x] 8.2 Write component tests for RegisterPage (**REQUIRED**)
    - **Mock useAuth hook**
    - **Test form rendering**: assert all input fields present
    - **Test password match validation**: assert error when passwords don't match
    - **Test form submission**: assert register called with correct values
    - **Test error display**: assert error message shown when registration fails
    - **Test loading state**: assert loading indicator shown during registration
    - **Test navigation link**: assert link to login page present
    - **Test password confirmation**: assert submission blocked if passwords don't match
    - **Test accessibility**: assert proper labels and ARIA attributes
    - **All tests must pass before proceeding to task 9**
    - **Minimum 80% coverage required**
    - _Requirements: 5.1, 5.2_

- [x] 9. Implement ProtectedRoute component
  - [x] 9.1 Create `src/components/ProtectedRoute.tsx`
    - Check authentication status with `useAuth()`
    - Show loading spinner while checking authentication
    - Redirect to /login if user is not authenticated
    - Render children if authenticated
    - _Requirements: 6.1_
  - [x] 9.2 Write component tests for ProtectedRoute (**REQUIRED**)
    - **Mock useAuth hook**
    - **Test loading state**: assert spinner shown while isLoading is true
    - **Test unauthenticated redirect**: assert Navigate to /login when user is null
    - **Test authenticated access**: assert children rendered when user is present
    - **Test route preservation**: assert redirects to intended route after login (use location state)
    - **All tests must pass before proceeding to task 10**
    - **Minimum 80% coverage required**
    - _Requirements: 6.1_

- [ ] 10. Implement GraphQL client helper
  - [ ] 10.1 Create `src/lib/graphqlClient.ts`
    - Implement `graphqlRequest<T>()` function: fetch from /graphql endpoint, include Authorization header with token from localStorage, parse response, throw on errors
    - Export typed request function for use throughout app
    - _Requirements: 7.1_
  - [ ] 10.2 Write unit tests for graphqlClient (**REQUIRED**)
    - **Mock fetch**
    - **Test successful request**: assert correct fetch params, Authorization header included
    - **Test request without token**: assert request works without Authorization header
    - **Test GraphQL errors**: assert throws error with correct message
    - **Test network errors**: assert throws error
    - **Test response parsing**: assert data correctly extracted from response
    - **All tests must pass before proceeding to task 11**
    - **Minimum 80% coverage required**
    - _Requirements: 7.1_

- [ ] 11. Integration testing — Full authentication flow
  - [ ] 11.1 Write end-to-end authentication flow tests (**REQUIRED**)
    - **Test full registration flow**: GraphQL mutation → database → JWT generation → localStorage
    - **Test full login flow**: GraphQL mutation → password verification → JWT generation → localStorage
    - **Test protected resource access**: valid token → userId in context → query succeeds
    - **Test invalid token rejection**: invalid token → no userId → query returns null/error
    - **Test token expiration**: expired token → query fails
    - **Test concurrent requests**: multiple requests with same token work correctly
    - **Use test database (in-memory SQLite)**
    - **All tests must pass before proceeding to task 12**
    - **Minimum 80% coverage for integration scenarios**
    - _Requirements: All requirements_

- [ ] 12. Update App.tsx routing and navigation
  - Add AuthProvider wrapper around app
  - Configure routes for /login and /register
  - Add ProtectedRoute wrapper for authenticated routes
  - Add navigation links
  - _Requirements: 8.1_

- [ ] 13. Final checkpoint — Complete test suite
  - **FINAL GATE: ALL tests must pass with 80%+ coverage**
  - Run full test suite: `npm run test:coverage`
  - Verify all unit tests pass (AuthService, resolvers, context, components)
  - Verify all integration tests pass
  - Verify coverage ≥ 80% on lines, functions, branches, statements
  - Test manually: register new user, login, access protected route, logout
  - **DO NOT PROCEED to production without passing all tests**
  - Ask user if questions arise

---

## Notes

- **TESTING IS MANDATORY**: Every implementation task includes corresponding tests that MUST pass before proceeding.
- **Coverage requirement**: Minimum 80% coverage on lines, functions, branches, and statements.
- **Security**: Use bcrypt with 12 rounds, JWT with 7-day expiration, validate all inputs with Zod.
- **Password requirements**: Min 8 chars, 1 uppercase, 1 lowercase, 1 number.
- **Token storage**: localStorage for web (consider httpOnly cookies for enhanced security in production).
- **Error handling**: Sanitize error messages sent to client, log full details server-side.
- **Gate checkpoints**: Tasks 5, 11, and 13 are explicit gates where all tests must pass before continuing.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2"] },
    { "id": 5, "tasks": ["4.1"] },
    { "id": 6, "tasks": ["4.2", "5"] },
    { "id": 7, "tasks": ["6.1"] },
    { "id": 8, "tasks": ["6.2"] },
    { "id": 9, "tasks": ["7.1", "8.1", "9.1", "10.1"] },
    { "id": 10, "tasks": ["7.2", "8.2", "9.2", "10.2"] },
    { "id": 11, "tasks": ["11.1"] },
    { "id": 12, "tasks": ["12"] },
    { "id": 13, "tasks": ["13"] }
  ]
}
```
