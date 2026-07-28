import crypto from "node:crypto";
import {
  generateCodeVerifier,
  generateState,
  decodeIdToken,
} from "arctic";
import { eq, and } from "drizzle-orm";

import type { DrizzleDb } from "../db/drizzle.ts";
import type { OperationQueue } from "../db/operationQueue.ts";
import { users, oauthIdentities, authSessions } from "../db/schema.ts";
import {
  getProvider,
  PROVIDER_SCOPES,
  type SupportedProvider,
} from "./oauthProviders.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServiceDeps {
  db: DrizzleDb;
  queue: OperationQueue;
}

export interface OAuthProfile {
  email: string;
  name: string | null;
  providerUserId: string;
  provider: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Providers that require a PKCE code verifier for auth URL generation. */
const PKCE_PROVIDERS: ReadonlySet<string> = new Set([
  "google",
  "discord",
  "microsoft",
]);

const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ---------------------------------------------------------------------------
// OAuth URL Generation
// ---------------------------------------------------------------------------

/**
 * Generates an OAuth authorization URL for the given provider.
 * Returns the URL, a random state string for CSRF protection,
 * and optionally a code verifier (for providers that support PKCE).
 */
export function createAuthorizationURL(provider: SupportedProvider): {
  url: string;
  state: string;
  codeVerifier?: string;
} {
  const providerInstance = getProvider(provider);
  const state = generateState();
  const scopes = PROVIDER_SCOPES[provider];

  let codeVerifier: string | undefined;
  let url: URL;

  if (provider === "google") {
    codeVerifier = generateCodeVerifier();
    url = (providerInstance as import("arctic").Google).createAuthorizationURL(
      state,
      codeVerifier,
      scopes,
    );
  } else if (provider === "microsoft") {
    codeVerifier = generateCodeVerifier();
    url = (providerInstance as import("arctic").MicrosoftEntraId).createAuthorizationURL(
      state,
      codeVerifier,
      scopes,
    );
  } else if (provider === "discord") {
    codeVerifier = generateCodeVerifier();
    url = (providerInstance as import("arctic").Discord).createAuthorizationURL(
      state,
      codeVerifier,
      scopes,
    );
  } else if (provider === "github") {
    url = (providerInstance as import("arctic").GitHub).createAuthorizationURL(
      state,
      scopes,
    );
  } else if (provider === "facebook") {
    url = (providerInstance as import("arctic").Facebook).createAuthorizationURL(
      state,
      scopes,
    );
  } else {
    // apple
    url = (providerInstance as import("arctic").Apple).createAuthorizationURL(
      state,
      scopes,
    );
  }

  return {
    url: url.toString(),
    state,
    ...(codeVerifier !== undefined && { codeVerifier }),
  };
}

// ---------------------------------------------------------------------------
// Code Exchange + Profile Extraction
// ---------------------------------------------------------------------------

/**
 * Exchanges an authorization code for tokens and extracts user profile info.
 * The returned OAuthProfile contains the email, name, providerUserId, and provider.
 */
export async function exchangeCode(
  provider: SupportedProvider,
  code: string,
  codeVerifier?: string,
): Promise<OAuthProfile> {
  const providerInstance = getProvider(provider);
  let tokens;

  if (provider === "google") {
    if (!codeVerifier) {
      throw new Error("Code verifier is required for Google OAuth");
    }
    tokens = await (providerInstance as import("arctic").Google).validateAuthorizationCode(
      code,
      codeVerifier,
    );
  } else if (provider === "microsoft") {
    if (!codeVerifier) {
      throw new Error("Code verifier is required for Microsoft OAuth");
    }
    tokens = await (providerInstance as import("arctic").MicrosoftEntraId).validateAuthorizationCode(
      code,
      codeVerifier,
    );
  } else if (provider === "discord") {
    tokens = await (providerInstance as import("arctic").Discord).validateAuthorizationCode(
      code,
      codeVerifier ?? null,
    );
  } else if (provider === "github") {
    tokens = await (providerInstance as import("arctic").GitHub).validateAuthorizationCode(code);
  } else if (provider === "facebook") {
    tokens = await (providerInstance as import("arctic").Facebook).validateAuthorizationCode(code);
  } else {
    // apple
    tokens = await (providerInstance as import("arctic").Apple).validateAuthorizationCode(code);
  }

  return extractProfile(provider, tokens);
}

/**
 * Extracts user profile information from OAuth tokens.
 */
async function extractProfile(
  provider: SupportedProvider,
  tokens: import("arctic").OAuth2Tokens,
): Promise<OAuthProfile> {
  switch (provider) {
    case "google":
    case "microsoft":
    case "apple": {
      const idToken = tokens.idToken();
      const claims = decodeIdToken(idToken) as Record<string, unknown>;
      return {
        email: (claims.email as string) ?? "",
        name: (claims.name as string) ?? null,
        providerUserId: (claims.sub as string) ?? "",
        provider,
      };
    }

    case "discord": {
      const accessToken = tokens.accessToken();
      const response = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch Discord user profile");
      }
      const user = (await response.json()) as Record<string, unknown>;
      return {
        email: (user.email as string) ?? "",
        name: (user.username as string) ?? null,
        providerUserId: (user.id as string) ?? "",
        provider,
      };
    }

    case "github": {
      const accessToken = tokens.accessToken();
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      });
      if (!userResponse.ok) {
        throw new Error("Failed to fetch GitHub user profile");
      }
      const user = (await userResponse.json()) as Record<string, unknown>;

      let email = (user.email as string) ?? "";
      if (!email) {
        const emailResponse = await fetch(
          "https://api.github.com/user/emails",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/vnd.github+json",
            },
          },
        );
        if (emailResponse.ok) {
          const emails = (await emailResponse.json()) as Array<{
            email: string;
            primary: boolean;
            verified: boolean;
          }>;
          const primary = emails.find((e) => e.primary && e.verified);
          email = primary?.email ?? emails[0]?.email ?? "";
        }
      }

      return {
        email,
        name: (user.name as string) ?? (user.login as string) ?? null,
        providerUserId: String(user.id ?? ""),
        provider,
      };
    }

    case "facebook": {
      const accessToken = tokens.accessToken();
      const response = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${accessToken}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch Facebook user profile");
      }
      const user = (await response.json()) as Record<string, unknown>;
      return {
        email: (user.email as string) ?? "",
        name: (user.name as string) ?? null,
        providerUserId: (user.id as string) ?? "",
        provider,
      };
    }

    default:
      throw new Error(`Unsupported provider for profile extraction: ${provider}`);
  }
}

// ---------------------------------------------------------------------------
// User Resolution
// ---------------------------------------------------------------------------

/**
 * Resolves an existing user or creates a new one based on the OAuth profile.
 */
export async function resolveOrCreateUser(
  deps: ServiceDeps,
  profile: OAuthProfile,
): Promise<{ id: string; email: string; name: string | null }> {
  // Check if this provider+providerUserId is already linked
  const existingIdentity = await deps.db.query.oauthIdentities.findFirst({
    where: and(
      eq(oauthIdentities.provider, profile.provider),
      eq(oauthIdentities.providerUserId, profile.providerUserId),
    ),
    with: { user: true },
  });

  if (existingIdentity) {
    if (existingIdentity.user.email !== profile.email) {
      throw new Error(
        "This OAuth identity is already associated with another account",
      );
    }
    return {
      id: existingIdentity.user.id,
      email: existingIdentity.user.email,
      name: existingIdentity.user.name,
    };
  }

  // Look up user by email
  const existingUser = await deps.db.query.users.findFirst({
    where: eq(users.email, profile.email),
  });

  if (existingUser) {
    // Link the new OAuth identity to the existing user
    await deps.queue.enqueue(() => {
      deps.db.insert(oauthIdentities).values({
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        userId: existingUser.id,
      }).run();
      return Promise.resolve();
    });
    return {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
    };
  }

  // Create a new user + OAuthIdentity atomically via the queue
  // better-sqlite3 transactions are synchronous, so we use db.transaction()
  const newUser = await deps.queue.enqueue(() => {
    const result = deps.db.transaction((tx) => {
      const [user] = tx.insert(users).values({
        email: profile.email,
        name: profile.name,
        themeMode: "SYSTEM",
      }).returning().all();

      tx.insert(oauthIdentities).values({
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        userId: user.id,
      }).run();

      return user;
    });
    return Promise.resolve(result);
  });

  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
  };
}

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

/**
 * Creates a new session for the given user.
 * Generates a 32-byte random hex token (256 bits of entropy),
 * stores it in the database with a 7-day expiration, and returns the token.
 */
export async function createSession(
  deps: ServiceDeps,
  userId: string,
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  await deps.queue.enqueue(() => {
    deps.db.insert(authSessions).values({
      token,
      userId,
      expiresAt,
    }).run();
    return Promise.resolve();
  });

  return token;
}

/**
 * Validates a session token.
 * Returns the associated user's { id, email } if the session is valid and not expired.
 * Returns null if the session is not found or expired.
 */
export async function validateSession(
  deps: ServiceDeps,
  token: string,
): Promise<AuthUser | null> {
  const session = await deps.db.query.authSessions.findFirst({
    where: eq(authSessions.token, token),
    with: { user: true },
  });

  if (!session) {
    return null;
  }

  // Check if expired
  if (session.expiresAt <= new Date()) {
    // Clean up the expired session (best effort)
    deps.queue.enqueue(() => {
      deps.db.delete(authSessions).where(eq(authSessions.id, session.id)).run();
      return Promise.resolve();
    }).catch(() => {
      // Swallow cleanup errors
    });
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
  };
}

/**
 * Invalidates (deletes) a session by its token.
 * The deletion is routed through the operation queue.
 */
export async function invalidateSession(
  deps: ServiceDeps,
  token: string,
): Promise<void> {
  await deps.queue.enqueue(() => {
    deps.db.delete(authSessions).where(eq(authSessions.token, token)).run();
    return Promise.resolve();
  });
}
