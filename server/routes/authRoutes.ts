import { Router } from "express";
import type { Request, Response } from "express";
import {
  SUPPORTED_PROVIDERS,
  type SupportedProvider,
} from "../services/oauthProviders.ts";
import {
  createAuthorizationURL,
  exchangeCode,
  resolveOrCreateUser,
  createSession,
  type ServiceDeps,
} from "../services/oauthService.ts";
import { setSessionCookie } from "../services/sessionCookie.ts";
import { config } from "../config.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATE_COOKIE_NAME = "oauth_state";
const CODE_VERIFIER_COOKIE_NAME = "oauth_code_verifier";
const STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates the OAuth auth router with access to ServiceDeps.
 * Routes:
 *   GET /auth/initiate/:provider — starts the OAuth flow
 *   GET /auth/callback/:provider — handles the OAuth callback
 */
export function createAuthRouter(deps: ServiceDeps): Router {
  const router = Router();

  // -------------------------------------------------------------------------
  // GET /auth/initiate/:provider
  // -------------------------------------------------------------------------
  router.get("/auth/initiate/:provider", (req: Request, res: Response) => {
    try {
      const { provider } = req.params;

      // Validate provider
      if (!SUPPORTED_PROVIDERS.includes(provider as SupportedProvider)) {
        res.redirect("/login?error=unsupported_provider");
        return;
      }

      // Generate authorization URL
      const { url, state, codeVerifier } = createAuthorizationURL(
        provider as SupportedProvider,
      );

      // Store state in a short-lived cookie for CSRF validation on callback
      res.cookie(STATE_COOKIE_NAME, state, {
        httpOnly: true,
        secure: config.cookieSecure,
        sameSite: "lax",
        path: "/",
        maxAge: STATE_COOKIE_MAX_AGE_MS,
      });

      // Store code verifier in a cookie if present (PKCE providers)
      if (codeVerifier) {
        res.cookie(CODE_VERIFIER_COOKIE_NAME, codeVerifier, {
          httpOnly: true,
          secure: config.cookieSecure,
          sameSite: "lax",
          path: "/",
          maxAge: STATE_COOKIE_MAX_AGE_MS,
        });
      }

      // Redirect to the provider's authorization page
      res.redirect(url);
    } catch {
      res.redirect("/login?error=auth_failed");
    }
  });

  // -------------------------------------------------------------------------
  // GET /auth/callback/:provider
  // -------------------------------------------------------------------------
  router.get(
    "/auth/callback/:provider",
    async (req: Request, res: Response) => {
      try {
        const { provider } = req.params;

        // Validate provider
        if (!SUPPORTED_PROVIDERS.includes(provider as SupportedProvider)) {
          res.redirect("/login?error=unsupported_provider");
          return;
        }

        // Read state from query params and cookie
        const stateParam = req.query.state as string | undefined;
        const stateCookie = req.cookies?.[STATE_COOKIE_NAME] as
          | string
          | undefined;

        // CSRF validation: state must match
        if (!stateParam || !stateCookie || stateParam !== stateCookie) {
          clearOAuthCookies(res);
          res.redirect("/login?error=invalid_state");
          return;
        }

        // Check for provider error response
        const errorParam = req.query.error as string | undefined;
        if (errorParam) {
          clearOAuthCookies(res);
          res.redirect("/login?error=provider_error");
          return;
        }

        // Read authorization code
        const code = req.query.code as string | undefined;
        if (!code) {
          clearOAuthCookies(res);
          res.redirect("/login?error=provider_error");
          return;
        }

        // Read code verifier from cookie (if present, for PKCE providers)
        const codeVerifier = req.cookies?.[CODE_VERIFIER_COOKIE_NAME] as
          | string
          | undefined;

        // Exchange authorization code for tokens and extract profile
        const profile = await exchangeCode(
          provider as SupportedProvider,
          code,
          codeVerifier,
        );

        // Validate that we have an email
        if (!profile.email) {
          clearOAuthCookies(res);
          res.redirect("/login?error=email_required");
          return;
        }

        // Resolve or create user
        const user = await resolveOrCreateUser(deps, profile);

        // Create session
        const sessionToken = await createSession(deps, user.id);

        // Set session cookie
        setSessionCookie(res, sessionToken);

        // Clear OAuth-related cookies
        clearOAuthCookies(res);

        // Redirect to the return URL (default /)
        res.redirect("/");
      } catch (error: unknown) {
        clearOAuthCookies(res);

        // Map known error messages to specific error codes
        const message =
          error instanceof Error ? error.message : "Unknown error";

        if (message.includes("already associated with another account")) {
          res.redirect("/login?error=identity_conflict");
          return;
        }

        res.redirect("/login?error=auth_failed");
      }
    },
  );

  return router;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Clears the OAuth state and code verifier cookies.
 */
function clearOAuthCookies(res: Response): void {
  res.clearCookie(STATE_COOKIE_NAME, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: "/",
  });
  res.clearCookie(CODE_VERIFIER_COOKIE_NAME, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: "/",
  });
}
