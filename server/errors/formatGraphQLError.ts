// Formats GraphQL errors before sending to clients.
// Ensures every error has an extensions.code and strips Prisma internals from messages.

import type { GraphQLFormattedError } from 'graphql';

/**
 * Default error code when none is present in extensions.
 */
const DEFAULT_ERROR_CODE = 'INTERNAL_SERVER_ERROR';

/**
 * Generic safe message used when Prisma-internal content is detected.
 */
const SANITIZED_MESSAGE = 'An internal error occurred';

/**
 * Patterns that indicate Prisma-internal content in error messages.
 */
const PRISMA_PATTERNS: RegExp[] = [
  /\bP[12]\d{3}\b/,                            // Prisma error codes (P1xxx, P2xxx)
  /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i,  // SQL keywords
  /prisma\.\$/i,                                // prisma.$ method references
  /\bprisma\b/i,                                // The word "prisma" (case-insensitive)
];

/**
 * Checks whether a message contains Prisma-internal content that should not
 * be exposed to the client.
 */
function containsPrismaContent(message: string): boolean {
  return PRISMA_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Apollo Server `formatError` handler.
 *
 * Ensures every GraphQL error response includes:
 * - A non-empty `extensions.code` (defaults to INTERNAL_SERVER_ERROR)
 * - A sanitised `message` field free of Prisma internals
 */
export function formatGraphQLError(
  formattedError: GraphQLFormattedError,
  _error: unknown,
): GraphQLFormattedError {
  const extensions = formattedError.extensions ?? {};
  const code = extensions['code'];

  // Ensure extensions.code is always a non-empty string
  const resolvedCode =
    typeof code === 'string' && code.length > 0 ? code : DEFAULT_ERROR_CODE;

  // Strip Prisma-internal content from the message
  const message = containsPrismaContent(formattedError.message)
    ? SANITIZED_MESSAGE
    : formattedError.message;

  return {
    ...formattedError,
    message,
    extensions: {
      ...extensions,
      code: resolvedCode,
    },
  };
}
