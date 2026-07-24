/**
 * Property-based test for error extensions.code field.
 *
 * **Validates: Requirements 1.6, 7.1, 7.3**
 *
 * Property 1: All GraphQL errors contain an extensions.code field.
 * - Generates arbitrary Prisma error instances (varying codes, messages, error types).
 * - Feeds through mapPrismaError() and formatGraphQLError().
 * - Asserts every result has a non-empty extensions.code.
 * - Asserts no Prisma-internal content leaks in the message.
 */

import { describe, it, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
} from '@prisma/client/runtime/client';
import { mapPrismaError } from './mapPrismaError.js';
import { formatGraphQLError } from './formatGraphQLError.js';
import type { GraphQLFormattedError } from 'graphql';

/**
 * Patterns that indicate Prisma-internal content that should never appear
 * in client-facing error messages.
 */
const PRISMA_LEAK_PATTERNS: RegExp[] = [
  /\bP[12]\d{3}\b/, // Prisma error codes (P1xxx, P2xxx)
  /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i, // SQL keywords
  /prisma\.\$/i, // prisma.$ method references
  /\bprisma\b/i, // The word "prisma" (case-insensitive)
];

function containsPrismaLeak(message: string): boolean {
  return PRISMA_LEAK_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Arbitrary for known Prisma error codes — includes the mapped codes
 * plus random P-codes that are unmapped.
 */
const knownPrismaCodeArb = fc.oneof(
  fc.constantFrom('P2000', 'P2001', 'P2002', 'P2003', 'P2007', 'P2025', 'P1001'),
  // Random unmapped P-codes
  fc.integer({ min: 1000, max: 2999 }).map((n) => `P${n}`),
);

/**
 * Arbitrary for error messages that may contain Prisma internals, SQL fragments,
 * or normal text.
 */
const errorMessageArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 200 }),
  fc.constantFrom(
    'SELECT * FROM User WHERE id = 1',
    'prisma.$queryRaw failed',
    'Error in prisma.$transaction',
    'P2002: Unique constraint violation on field email',
    'INSERT INTO characters VALUES (...)',
    'Something went wrong',
    'Record not found',
    'Connection refused to database',
    'DROP TABLE users',
    'ALTER TABLE sessions ADD COLUMN',
  ),
);

/**
 * Arbitrary that generates different types of errors simulating what Prisma can throw.
 */
const prismaErrorArb = fc.oneof(
  // PrismaClientKnownRequestError with arbitrary codes and messages
  fc.tuple(knownPrismaCodeArb, errorMessageArb).map(
    ([code, message]) =>
      new PrismaClientKnownRequestError(message, {
        code,
        clientVersion: '7.9.0',
      }),
  ),
  // PrismaClientUnknownRequestError with arbitrary messages
  errorMessageArb.map(
    (message) =>
      new PrismaClientUnknownRequestError(message, { clientVersion: '7.9.0' }),
  ),
  // PrismaClientRustPanicError with arbitrary messages
  errorMessageArb.map(
    (message) => new PrismaClientRustPanicError(message, '7.9.0'),
  ),
  // Generic Error (non-Prisma)
  errorMessageArb.map((message) => new Error(message)),
);

describe('Error Extensions Property Tests', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('Property 1: All GraphQL errors contain a non-empty extensions.code and no Prisma-internal content', async () => {
    await fc.assert(
      fc.asyncProperty(prismaErrorArb, async (error) => {
        // Step 1: Pass through mapPrismaError to get an AppError
        const appError = mapPrismaError(error);

        // Step 2: Construct a GraphQLFormattedError from the AppError
        const graphQLError: GraphQLFormattedError = {
          message: appError.message,
          extensions: { code: appError.code },
        };

        // Step 3: Pass through formatGraphQLError
        const result = formatGraphQLError(graphQLError, error);

        // Assert 1: Result has extensions with a non-empty code string
        if (!result.extensions) return false;
        const code = result.extensions['code'];
        if (typeof code !== 'string' || code.length === 0) return false;

        // Assert 2: Result message does not contain Prisma-internal content
        if (containsPrismaLeak(result.message)) return false;

        return true;
      }),
      { numRuns: 200 },
    );
  }, 30_000);
});
