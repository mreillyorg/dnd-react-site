// Formats GraphQL errors before sending to clients.
// Ensures every error has an extensions.code and strips database internals from messages.

import type { GraphQLFormattedError } from 'graphql';

/**
 * Default error code when none is present in extensions.
 */
const DEFAULT_ERROR_CODE = 'INTERNAL_SERVER_ERROR';

/**
 * Generic safe message used when database-internal content is detected.
 */
const SANITIZED_MESSAGE = 'An internal error occurred';

/**
 * Patterns that indicate database-internal content that should not
 * be exposed to the client.
 */
const INTERNAL_PATTERNS: RegExp[] = [
  /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i,  // SQL keywords
  /SQLITE_CONSTRAINT/i,                         // SQLite constraint error codes
  /\bconstraint failed\b/i,                     // SQLite constraint messages
  /\bno such table\b/i,                         // SQLite schema errors
  /\bdatabase is locked\b/i,                    // SQLite lock errors
];

/**
 * Checks whether a message contains database-internal content that should not
 * be exposed to the client.
 */
function containsInternalContent(message: string): boolean {
  return INTERNAL_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Apollo Server `formatError` handler.
 *
 * Ensures every GraphQL error response includes:
 * - A non-empty `extensions.code` (defaults to INTERNAL_SERVER_ERROR)
 * - A sanitised `message` field free of database internals
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

  // Strip database-internal content from the message
  const message = containsInternalContent(formattedError.message)
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
