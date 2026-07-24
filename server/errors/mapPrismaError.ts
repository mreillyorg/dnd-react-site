// Maps Prisma errors to structured domain errors.
// Ensures no Prisma internals leak to clients.

import {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
} from '@prisma/client/runtime/client';

/**
 * Domain error codes used throughout the application.
 */
export type DomainErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FOREIGN_KEY_VIOLATION'
  | 'DATABASE_UNAVAILABLE'
  | 'INTERNAL_SERVER_ERROR';

/**
 * Structured domain error returned to consumers (resolvers, formatGraphQLError).
 */
export class AppError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

/**
 * Mapping from PrismaClientKnownRequestError codes to domain codes and messages.
 */
const KNOWN_ERROR_MAP: Record<string, { code: DomainErrorCode; message: string }> = {
  P2000: { code: 'VALIDATION_ERROR', message: 'Value too long for column type' },
  P2001: { code: 'NOT_FOUND', message: 'Record not found' },
  P2002: { code: 'CONFLICT', message: 'Unique constraint violation' },
  P2003: { code: 'FOREIGN_KEY_VIOLATION', message: 'Foreign key constraint failed' },
  P2007: { code: 'VALIDATION_ERROR', message: 'Data validation error' },
  P2025: { code: 'NOT_FOUND', message: 'Record not found' },
  P1001: { code: 'DATABASE_UNAVAILABLE', message: 'Database server is unreachable' },
};

/**
 * Maps any error thrown by Prisma operations into a structured AppError.
 *
 * - PrismaClientKnownRequestError: mapped to a specific domain code
 * - PrismaClientUnknownRequestError / PrismaClientRustPanicError: logged internally,
 *   returns a sanitised INTERNAL_SERVER_ERROR
 * - Non-Prisma errors: passed through as INTERNAL_SERVER_ERROR
 */
export function mapPrismaError(error: unknown): AppError {
  // Handle PrismaClientKnownRequestError
  if (error instanceof PrismaClientKnownRequestError) {
    const mapping = KNOWN_ERROR_MAP[error.code];
    if (mapping) {
      return new AppError(mapping.code, mapping.message);
    }
    // Known Prisma error but unmapped code — treat as internal
    console.error('[mapPrismaError] Unmapped PrismaClientKnownRequestError:', {
      code: error.code,
      message: error.message,
      meta: error.meta,
    });
    return new AppError('INTERNAL_SERVER_ERROR', 'An unexpected database error occurred');
  }

  // Handle PrismaClientUnknownRequestError
  if (error instanceof PrismaClientUnknownRequestError) {
    console.error('[mapPrismaError] PrismaClientUnknownRequestError:', {
      message: error.message,
    });
    return new AppError('INTERNAL_SERVER_ERROR', 'An unexpected database error occurred');
  }

  // Handle PrismaClientRustPanicError
  if (error instanceof PrismaClientRustPanicError) {
    console.error('[mapPrismaError] PrismaClientRustPanicError:', {
      message: error.message,
    });
    return new AppError('INTERNAL_SERVER_ERROR', 'An unexpected database error occurred');
  }

  // Non-Prisma error — still sanitise
  if (error instanceof Error) {
    console.error('[mapPrismaError] Non-Prisma error:', {
      name: error.name,
      message: error.message,
    });
  } else {
    console.error('[mapPrismaError] Unknown thrown value:', error);
  }

  return new AppError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
}
