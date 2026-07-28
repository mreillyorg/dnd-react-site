import {
  Google,
  Discord,
  GitHub,
  Facebook,
  Apple,
  MicrosoftEntraId,
} from 'arctic';
import { config } from '../config.js';

/**
 * Supported OAuth provider names.
 */
export const SUPPORTED_PROVIDERS = [
  'google',
  'discord',
  'github',
  'facebook',
  'apple',
  'microsoft',
] as const;

export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

/**
 * Scopes requested from each provider during authorization.
 */
export const PROVIDER_SCOPES: Record<SupportedProvider, string[]> = {
  google: ['openid', 'profile', 'email'],
  discord: ['identify', 'email'],
  github: ['user:email'],
  facebook: ['email', 'public_profile'],
  apple: ['name', 'email'],
  microsoft: ['openid', 'profile', 'email'],
};

// Lazy-initialized provider instances (created on first access)
let googleInstance: Google | null = null;
let discordInstance: Discord | null = null;
let githubInstance: GitHub | null = null;
let facebookInstance: Facebook | null = null;
let appleInstance: Apple | null = null;
let microsoftInstance: MicrosoftEntraId | null = null;

function buildRedirectUri(provider: string): string {
  return `${config.oauthRedirectBaseUrl}/auth/callback/${provider}`;
}

function getGoogle(): Google {
  if (!googleInstance) {
    googleInstance = new Google(
      config.googleClientId,
      config.googleClientSecret,
      buildRedirectUri('google'),
    );
  }
  return googleInstance;
}

function getDiscord(): Discord {
  if (!discordInstance) {
    discordInstance = new Discord(
      config.discordClientId,
      config.discordClientSecret,
      buildRedirectUri('discord'),
    );
  }
  return discordInstance;
}

function getGitHub(): GitHub {
  if (!githubInstance) {
    githubInstance = new GitHub(
      config.githubClientId,
      config.githubClientSecret,
      buildRedirectUri('github'),
    );
  }
  return githubInstance;
}

function getFacebook(): Facebook {
  if (!facebookInstance) {
    facebookInstance = new Facebook(
      config.facebookClientId,
      config.facebookClientSecret,
      buildRedirectUri('facebook'),
    );
  }
  return facebookInstance;
}

function getApple(): Apple {
  if (!appleInstance) {
    // Apple Sign In requires additional credentials beyond clientId/clientSecret:
    // - APPLE_TEAM_ID: The Apple Developer Team ID
    // - APPLE_KEY_ID: The Key ID for the Sign in with Apple private key
    // - appleClientSecret: The PEM-encoded PKCS#8 private key content
    const teamId = process.env.APPLE_TEAM_ID ?? '';
    const keyId = process.env.APPLE_KEY_ID ?? '';
    const pkcs8PrivateKey = new TextEncoder().encode(config.appleClientSecret);

    appleInstance = new Apple(
      config.appleClientId,
      teamId,
      keyId,
      pkcs8PrivateKey,
      buildRedirectUri('apple'),
    );
  }
  return appleInstance;
}

function getMicrosoft(): MicrosoftEntraId {
  if (!microsoftInstance) {
    // Use "common" tenant to allow any Microsoft account (personal + org)
    const tenant = process.env.MICROSOFT_TENANT_ID ?? 'common';
    microsoftInstance = new MicrosoftEntraId(
      tenant,
      config.microsoftClientId,
      config.microsoftClientSecret,
      buildRedirectUri('microsoft'),
    );
  }
  return microsoftInstance;
}

/**
 * Returns the arctic provider instance for a given provider name.
 * Throws an error if the provider is not supported.
 */
export function getProvider(
  name: string,
): Google | Discord | GitHub | Facebook | Apple | MicrosoftEntraId {
  switch (name) {
    case 'google':
      return getGoogle();
    case 'discord':
      return getDiscord();
    case 'github':
      return getGitHub();
    case 'facebook':
      return getFacebook();
    case 'apple':
      return getApple();
    case 'microsoft':
      return getMicrosoft();
    default:
      throw new Error(`Unsupported OAuth provider: ${name}`);
  }
}
