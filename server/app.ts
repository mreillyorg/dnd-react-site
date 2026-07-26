/**
 * Express + Apollo Server application.
 *
 * Wires together configuration, Prisma, the write queue, GraphQL schema,
 * error formatting, the /health endpoint, and graceful shutdown handlers.
 *
 * The `createApp()` function is exported separately from server start so
 * that integration tests can import the Express app without binding to a port.
 */

import { execSync } from 'node:child_process';
import http from 'node:http';

import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express5';
import express from 'express';

import { config } from './config.ts';
import { createQueue } from './db/operationQueue.ts';
import type { OperationQueue } from './db/operationQueue.ts';
import { initializePrisma, prisma } from './db/prisma.ts';
import { formatGraphQLError } from './errors/formatGraphQLError.ts';
import { createContextFactory } from './graphql/context.ts';
import { schema } from './graphql/schema/index.ts';
import { gracefulShutdown } from './shutdown.ts';
import type { ShutdownDependencies } from './shutdown.ts';

// ---------------------------------------------------------------------------
// Migration runner
// ---------------------------------------------------------------------------

/**
 * Runs `prisma migrate deploy` synchronously before accepting requests.
 * If migrations fail, the process halts with exit code 1.
 */
function runMigrations(): void {
  try {
    console.log('[app] Running prisma migrate deploy...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: config.databaseUrl },
    });
    console.log('[app] Migrations applied successfully.');
  } catch (error) {
    console.error('[app] Migration failed — halting startup.', error);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

export interface AppComponents {
  app: express.Express;
  httpServer: http.Server;
  apolloServer: ApolloServer;
  queue: OperationQueue;
  shutdownDeps: ShutdownDependencies;
}

/**
 * Creates and configures the Express application with Apollo Server.
 *
 * Call `start()` on the returned `apolloServer` before listening.
 * The app is exported without starting so integration tests can
 * use supertest or similar without binding to a port.
 */
export async function createApp(): Promise<AppComponents> {
  // 1. Run migrations (fail fast)
  runMigrations();

  // 2. Initialise Prisma (connects + applies SQLite PRAGMAs)
  await initializePrisma();

  // 3. Create the Operation Queue
  const queue = createQueue(config);

  // 4. Create Express app and HTTP server
  const app = express();
  const httpServer = http.createServer(app);

  // 5. Build Apollo Server
  const apolloServer = new ApolloServer({
    schema,
    formatError: formatGraphQLError,
    introspection: config.graphqlIntrospection,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await apolloServer.start();

  // 6. Mount GraphQL middleware at POST /graphql
  const contextFactory = createContextFactory({ prisma, queue });

  app.use(
    '/graphql',
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => contextFactory({ req }),
    }),
  );

  // 7. Health endpoint
  app.get('/health', async (_req, res) => {
    try {
      // Short timeout: race the query against a 3s deadline
      const healthCheck = prisma.$queryRaw`SELECT 1` as Promise<unknown>;
      const timeout = new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error('Database health check timed out')), 3000);
      });

      await Promise.race([healthCheck, timeout]);

      res.status(200).json({ status: 'ok', database: 'connected' });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unreachable' });
    }
  });

  // 8. Graceful shutdown handlers
  const shutdownDeps: ShutdownDependencies = {
    httpServer,
    queue,
    apolloServer,
    prismaDisconnect: () => prisma.$disconnect(),
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM', shutdownDeps));
  process.on('SIGINT', () => gracefulShutdown('SIGINT', shutdownDeps));

  return { app, httpServer, apolloServer, queue, shutdownDeps };
}
