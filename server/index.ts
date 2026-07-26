/**
 * Server entry point.
 *
 * Starts the Express + Apollo Server application listening on a port.
 * Separated from app.ts so that the app can be imported without starting
 * the server (useful for integration testing).
 */

import { createApp } from './app.ts';

const PORT = Number(process.env.PORT ?? '4000');

async function main() {
  const { httpServer } = await createApp();

  httpServer.listen(PORT, () => {
    console.log(`[server] GraphQL API ready at http://localhost:${PORT}/graphql`);
    console.log(`[server] Health check at http://localhost:${PORT}/health`);
  });
}

main().catch((error) => {
  console.error('[server] Failed to start:', error);
  process.exit(1);
});
