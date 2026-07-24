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

const databaseProvider = process.env.DATABASE_PROVIDER ?? 'sqlite';

const dbQueueMaxDepth = Number(process.env.DB_QUEUE_MAX_DEPTH ?? '100');
const dbQueueWarnMs = Number(process.env.DB_QUEUE_WARN_MS ?? '500');

const graphqlIntrospectionRaw = process.env.GRAPHQL_INTROSPECTION;
const graphqlIntrospection =
  graphqlIntrospectionRaw !== undefined
    ? graphqlIntrospectionRaw === 'true'
    : isDev;

export interface AppConfig {
  readonly nodeEnv: string;
  readonly databaseUrl: string;
  readonly databaseProvider: string;
  readonly dbQueueMaxDepth: number;
  readonly dbQueueWarnMs: number;
  readonly graphqlIntrospection: boolean;
}

export const config: AppConfig = Object.freeze({
  nodeEnv,
  databaseUrl,
  databaseProvider,
  dbQueueMaxDepth,
  dbQueueWarnMs,
  graphqlIntrospection,
});
