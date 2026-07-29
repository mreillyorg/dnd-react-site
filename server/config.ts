// Server configuration loader
// Reads and validates all environment variables, failing fast on missing required values.

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isDev = nodeEnv !== 'production';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    'FATAL: DATABASE_URL environment variable is required but was not set. Exiting.',
  );
  process.exit(1);
}

const databaseProvider = process.env.DATABASE_PROVIDER ?? 'mysql';

const dbQueueMaxDepth = Number(process.env.DB_QUEUE_MAX_DEPTH ?? '100');
const dbQueueWarnMs = Number(process.env.DB_QUEUE_WARN_MS ?? '500');

const graphqlIntrospectionRaw = process.env.GRAPHQL_INTROSPECTION;
const graphqlIntrospection =
  graphqlIntrospectionRaw !== undefined
    ? graphqlIntrospectionRaw === 'true'
    : isDev;

// OAuth configuration
const oauthRedirectBaseUrl =
  process.env.OAUTH_REDIRECT_BASE_URL ?? 'http://localhost:5173';
const cookieSecure = nodeEnv === 'production';

// OAuth provider credentials
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
const discordClientId = process.env.DISCORD_CLIENT_ID ?? '';
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET ?? '';
const githubClientId = process.env.GITHUB_CLIENT_ID ?? '';
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET ?? '';
const facebookClientId = process.env.FACEBOOK_CLIENT_ID ?? '';
const facebookClientSecret = process.env.FACEBOOK_CLIENT_SECRET ?? '';
const appleClientId = process.env.APPLE_CLIENT_ID ?? '';
const appleClientSecret = process.env.APPLE_CLIENT_SECRET ?? '';
const microsoftClientId = process.env.MICROSOFT_CLIENT_ID ?? '';
const microsoftClientSecret = process.env.MICROSOFT_CLIENT_SECRET ?? '';

export interface AppConfig {
  readonly nodeEnv: string;
  readonly databaseUrl: string;
  readonly databaseProvider: string;
  readonly dbQueueMaxDepth: number;
  readonly dbQueueWarnMs: number;
  readonly graphqlIntrospection: boolean;
  readonly oauthRedirectBaseUrl: string;
  readonly cookieSecure: boolean;
  readonly googleClientId: string;
  readonly googleClientSecret: string;
  readonly discordClientId: string;
  readonly discordClientSecret: string;
  readonly githubClientId: string;
  readonly githubClientSecret: string;
  readonly facebookClientId: string;
  readonly facebookClientSecret: string;
  readonly appleClientId: string;
  readonly appleClientSecret: string;
  readonly microsoftClientId: string;
  readonly microsoftClientSecret: string;
}

export const config: AppConfig = Object.freeze({
  nodeEnv,
  databaseUrl,
  databaseProvider,
  dbQueueMaxDepth,
  dbQueueWarnMs,
  graphqlIntrospection,
  oauthRedirectBaseUrl,
  cookieSecure,
  googleClientId,
  googleClientSecret,
  discordClientId,
  discordClientSecret,
  githubClientId,
  githubClientSecret,
  facebookClientId,
  facebookClientSecret,
  appleClientId,
  appleClientSecret,
  microsoftClientId,
  microsoftClientSecret,
});
