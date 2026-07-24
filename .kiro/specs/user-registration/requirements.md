# Requirements Document

## Introduction

This document specifies the requirements for User Registration and Management in a web-based Dungeons & Dragons companion site. The system enables users to create accounts via OAuth providers (Google, Discord, GitHub, Facebook, Apple, Microsoft), authenticate securely, manage their profiles, and maintain session security. This functionality is foundational for all authenticated features including character management, campaign tracking, and session scheduling.

## Glossary

- **Registration_System**: The component responsible for creating new user accounts via OAuth providers
- **Authentication_System**: The component responsible for verifying user identity via OAuth and managing sessions
- **Profile_Manager**: The component responsible for managing user profile information
- **Email_Verifier**: The component responsible for sending and validating email verification tokens
- **Session_Manager**: The component responsible for managing user login sessions and tokens
- **OAuth_Provider**: Third-party authentication service (Google OAuth 2.0, Discord OAuth 2.0, GitHub OAuth 2.0, Facebook Login, Sign in with Apple, Microsoft Account/Azure AD OAuth 2.0)
- **User**: A person who has created an account or is attempting to access the system
- **Valid_Email**: An email address conforming to RFC 5322 format
- **Session_Token**: A cryptographically secure token used to maintain authenticated sessions
- **Verification_Token**: A time-limited token used for email verification
- **Security_Level**: A user's assigned permission level: Admin, DM, Player, or Spectator
- **Theme_Preference**: A user's selected visual theme choice that integrates with the Theme_System (dark, light, or system)
- **Message_System**: The component responsible for managing direct messages between users and delivering them through configured Message_Delivery_Channels
- **Direct_Message**: A private message sent from one user to another
- **Bulk_Message**: A message sent by an Admin to multiple users or all users simultaneously
- **Message_Inbox**: A user's collection of received messages within the internal system
- **Message_Status**: The read or unread state of a message
- **Message_Delivery_Channel**: A method for delivering messages to users: Internal (in-app Message_Inbox), Discord (Discord webhook or bot), or Email (email address)
- **Message_Preferences**: A user's selected configuration of Message_Delivery_Channels for receiving messages
- **Discord_Webhook**: An integration endpoint that forwards messages from the Message_System to a user's Discord account

## Requirements

### Requirement 1: OAuth Account Creation and Authentication

**User Story:** As a user, I want to log in using my OAuth account, so that I can securely access the D&D companion site without managing another password.

#### Acceptance Criteria

1. WHERE OAuth authentication is selected, WHEN a user completes OAuth flow with an OAuth_Provider, THE Authentication_System SHALL create or retrieve the user account associated with that OAuth identity
2. WHEN a user authenticates via OAuth for the first time, THE Registration_System SHALL create a new user account linked to their OAuth identity with a unique username based on their OAuth profile and Security_Level set to Player
3. WHERE an OAuth_Provider returns a verified email, THE Email_Verifier SHALL mark that email as verified automatically
4. WHEN a user authenticates via OAuth with an email matching an existing account, THE Authentication_System SHALL link the OAuth identity to the existing account without requiring additional verification
5. WHEN OAuth authentication succeeds, THE Session_Manager SHALL create a session with a default expiration of 7 days
6. THE Authentication_System SHALL support OAuth authentication via Google OAuth 2.0, Discord OAuth 2.0, GitHub OAuth 2.0, Facebook Login (OAuth 2.0), Sign in with Apple, and Microsoft Account (Azure AD OAuth 2.0) providers
7. WHEN a new user account is created, THE Registration_System SHALL set the user's Theme_Preference to system by default
8. WHEN a new user account is created, THE Registration_System SHALL set the user's Message_Preferences to internal-only delivery by default

### Requirement 2: Email Verification

**User Story:** As a user, I want to verify my email address when not provided by OAuth, so that I can confirm my account ownership and access all features.

#### Acceptance Criteria

1. WHERE an OAuth_Provider does not provide a verified email, WHEN an account is created, THE Email_Verifier SHALL send a verification email containing a Verification_Token to the user's email address within 30 seconds
2. WHEN a user clicks a verification link containing a valid Verification_Token, THE Email_Verifier SHALL mark the user's email as verified
3. WHEN a user clicks a verification link containing an expired Verification_Token, THE Email_Verifier SHALL return an error message and offer to resend verification
4. WHEN a user clicks a verification link containing an invalid Verification_Token, THE Email_Verifier SHALL return an error message
5. WHILE a user's email is unverified, THE Authentication_System SHALL restrict access to core features beyond basic profile setup
6. THE Email_Verifier SHALL expire verification tokens after 24 hours of creation
7. WHEN a user requests a new verification email, THE Email_Verifier SHALL generate a new Verification_Token and invalidate previous tokens for that user

### Requirement 3: Session Management

**User Story:** As a logged-in user, I want my session to persist across browser sessions, so that I don't need to log in repeatedly.

#### Acceptance Criteria

1. THE Session_Manager SHALL generate cryptographically secure Session_Tokens with at least 256 bits of entropy
2. WHEN a user logs out, THE Session_Manager SHALL invalidate their current Session_Token immediately
3. WHEN a Session_Token expires, THE Authentication_System SHALL require the user to re-authenticate via OAuth
4. WHILE a valid Session_Token is present, THE Authentication_System SHALL authenticate API requests without requiring re-authentication
5. THE Session_Manager SHALL support a "remember me" option that extends session expiration to 30 days
6. WHEN a user revokes OAuth access via their OAuth_Provider, THE Session_Manager SHALL invalidate all existing sessions for that user

### Requirement 4: Profile Management

**User Story:** As a logged-in user, I want to view and update my profile information, so that I can keep my account details current.

#### Acceptance Criteria

1. WHILE authenticated, THE Profile_Manager SHALL allow users to view their current email, username, linked OAuth providers, account creation date, Security_Level, Theme_Preference, and Message_Preferences
2. WHILE authenticated, THE Profile_Manager SHALL allow users to update their username to a unique value between 3 and 30 characters
3. WHEN a user attempts to update their username to one already in use, THE Profile_Manager SHALL return an error message
4. WHEN a user changes their email address manually, THE Email_Verifier SHALL send a verification email to the new address and mark the email as unverified
5. WHILE authenticated, THE Profile_Manager SHALL allow users to link additional OAuth_Provider accounts to their profile
6. WHEN a user attempts to link an OAuth_Provider already linked to another account, THE Profile_Manager SHALL return an error message
7. WHILE authenticated, THE Profile_Manager SHALL allow users to update their Theme_Preference to dark, light, or system
8. WHEN a user updates their Theme_Preference, THE Profile_Manager SHALL store the preference and notify the Theme_System within 2 seconds
9. WHILE authenticated, THE Profile_Manager SHALL allow users to view and update their Message_Preferences to select any combination of internal, Discord, and email Message_Delivery_Channels
10. WHEN a user enables the Discord Message_Delivery_Channel, THE Profile_Manager SHALL verify that the user has linked Discord OAuth to their account
11. IF a user attempts to enable the Discord Message_Delivery_Channel without linked Discord OAuth, THEN THE Profile_Manager SHALL return an error message requiring Discord OAuth linkage
12. WHEN a user updates their Message_Preferences, THE Profile_Manager SHALL store the new preferences immediately

### Requirement 5: User Security Levels and Permissions

**User Story:** As a site administrator, I want to assign security levels to users, so that I can control access to different features based on user roles.

#### Acceptance Criteria

1. THE Authentication_System SHALL support four Security_Level values: Admin, DM, Player, and Spectator
2. WHERE a user has Security_Level Admin, THE Authentication_System SHALL grant access to all system features including user management and content moderation
3. WHERE a user has Security_Level DM, THE Authentication_System SHALL grant access to campaign creation, encounter management, and session scheduling features
4. WHERE a user has Security_Level Player, THE Authentication_System SHALL grant access to character creation and campaign participation features
5. WHERE a user has Security_Level Spectator, THE Authentication_System SHALL grant read-only access to public content without creation or editing capabilities
6. WHERE a user has Security_Level Admin, THE Profile_Manager SHALL allow that user to change the Security_Level of other users to any valid value
7. WHEN a non-Admin user attempts to change their own or another user's Security_Level, THE Profile_Manager SHALL reject the request with an error message
8. THE Profile_Manager SHALL maintain an audit log recording all Security_Level changes including the Admin who made the change, the affected user, the previous level, the new level, and timestamp

### Requirement 6: Multi-Channel User Messaging System

**User Story:** As a user, I want to send and receive direct messages to other users through my preferred channels (in-app, Discord, or email), so that I can communicate privately about campaigns and game sessions in a way that suits my workflow.

#### Acceptance Criteria

1. WHILE authenticated, WHEN a user selects another user and composes a message, THE Message_System SHALL send a Direct_Message to the recipient within 2 seconds
2. WHEN a message is sent, THE Message_System SHALL deliver the message to the recipient's Message_Inbox regardless of the recipient's Message_Preferences
3. WHEN a message is sent, THE Message_System SHALL deliver the message through all Message_Delivery_Channels configured in the recipient's Message_Preferences
4. WHERE a recipient has configured Discord as a Message_Delivery_Channel, WHEN a message is sent to that recipient, THE Message_System SHALL forward the message to the recipient's Discord account via Discord_Webhook within 5 seconds
5. WHERE a recipient has configured email as a Message_Delivery_Channel, WHEN a message is sent to that recipient, THE Message_System SHALL forward the message to the recipient's email address within 30 seconds
6. IF Discord message delivery fails, THEN THE Message_System SHALL log the error and continue with delivery to other configured channels
7. IF email message delivery fails, THEN THE Message_System SHALL log the error and continue with delivery to other configured channels
8. WHILE authenticated, THE Message_System SHALL allow users to view their Message_Inbox showing all received messages with sender, subject, preview text, timestamp, and Message_Status
9. WHILE authenticated, THE Message_System SHALL allow users to view their sent messages showing recipient, subject, preview text, and timestamp
10. WHEN a user opens an unread Direct_Message, THE Message_System SHALL update the Message_Status to read immediately
11. WHILE authenticated, THE Message_System SHALL allow users to delete messages from their Message_Inbox or sent messages
12. WHERE a user has Security_Level Admin, THE Message_System SHALL provide a bulk messaging interface to compose and send Bulk_Messages
13. WHERE a user has Security_Level Admin, WHEN composing a Bulk_Message, THE Message_System SHALL allow selection of specific users by username or Security_Level, or all users
14. WHEN an Admin sends a Bulk_Message, THE Message_System SHALL deliver the message to all selected recipients through their configured Message_Delivery_Channels within 10 seconds
15. THE Message_System SHALL enforce a maximum message length of 5000 characters for Direct_Messages and Bulk_Messages
16. WHEN a user receives a new Direct_Message or Bulk_Message, THE Message_System SHALL display a notification indicator on the Message_Inbox icon
17. THE Message_System SHALL support searching messages by sender, subject, or content text
18. WHEN a user attempts to send a message to a non-existent user, THE Message_System SHALL return an error message
19. WHEN the Message_System forwards a message to Discord, THE Message_System SHALL format the message with sender name, subject, and message body
20. WHEN the Message_System forwards a message to email, THE Message_System SHALL format the email with sender name in the from field, subject in the email subject, and message body in the email body

### Requirement 7: Account Security Features

**User Story:** As a user, I want my account to be protected against common security threats, so that my data remains secure.

#### Acceptance Criteria

1. THE Authentication_System SHALL implement protection against Cross-Site Request Forgery (CSRF) attacks for all state-changing operations
2. THE Authentication_System SHALL implement protection against Cross-Site Scripting (XSS) by sanitizing all user inputs before storage and display
3. THE Session_Manager SHALL use secure, HTTP-only cookies for Session_Token storage when using cookie-based sessions
4. THE Session_Manager SHALL enforce HTTPS for all authentication-related requests in production environments
5. WHEN a user logs in from a new device or location, THE Authentication_System SHALL send a notification email to the user's registered email address
6. WHILE authenticated, THE Profile_Manager SHALL allow users to view all active sessions including device information and last access time
7. WHILE authenticated, THE Profile_Manager SHALL allow users to revoke individual sessions or all sessions except the current one

### Requirement 8: Account Deletion and Data Privacy

**User Story:** As a user, I want to permanently delete my account and data, so that I can exercise my right to data removal.

#### Acceptance Criteria

1. WHILE authenticated, WHEN a user requests account deletion and confirms the action, THE Profile_Manager SHALL permanently delete the user account
2. WHEN an account is deleted, THE Profile_Manager SHALL remove all personally identifiable information within 30 days
3. WHEN an account is deleted, THE Profile_Manager SHALL anonymize or remove all user-generated content including characters, campaigns, and notes
4. WHEN an account is deleted, THE Session_Manager SHALL immediately invalidate all sessions for that user
5. WHEN an account deletion is initiated, THE Profile_Manager SHALL send a confirmation email with a 7-day grace period to cancel the deletion
6. IF the user does not cancel within the grace period, THEN THE Profile_Manager SHALL complete the account deletion
7. WHEN an account is deleted, THE Message_System SHALL anonymize the sender name on all Direct_Messages and Bulk_Messages sent by that user to "Deleted User"
8. WHEN an account is deleted, THE Message_System SHALL remove all messages in that user's Message_Inbox
