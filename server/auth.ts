/**
 * Better Auth instance configuration.
 *
 * Centralizes authentication setup including the Drizzle adapter,
 * social OAuth providers, and session management.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { db } from "./db/drizzle.ts";
import * as schema from "./db/schema.ts";
import { config } from "./config.ts";

export const auth = betterAuth({
  baseURL: config.betterAuthUrl,
  basePath: "/api/auth",
  secret: config.betterAuthSecret,

  database: drizzleAdapter(db, {
    provider: "mysql",
    schema: {
      ...schema,
      user: schema.users,
      account: schema.accounts,
      session: schema.authSessions,
      verification: schema.verifications,
    },
  }),

  session: {
    modelName: "authSessions",
    expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    updateAge: 24 * 60 * 60, // refresh session every 24 hours
  },

  user: {
    modelName: "users",
    additionalFields: {
      themeMode: {
        type: "string",
        defaultValue: "SYSTEM",
        input: true,
        returned: true,
      },
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "discord", "github", "facebook", "apple", "microsoft"],
    },
  },

  socialProviders: {
    google: {
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
    },
    discord: {
      clientId: config.discordClientId,
      clientSecret: config.discordClientSecret,
    },
    github: {
      clientId: config.githubClientId,
      clientSecret: config.githubClientSecret,
    },
    facebook: {
      clientId: config.facebookClientId,
      clientSecret: config.facebookClientSecret,
    },
    apple: {
      clientId: config.appleClientId,
      clientSecret: config.appleClientSecret,
    },
    microsoft: {
      clientId: config.microsoftClientId,
      clientSecret: config.microsoftClientSecret,
    },
  },

  advanced: {
    useSecureCookies: config.cookieSecure,
  },
});

export type Auth = typeof auth;
