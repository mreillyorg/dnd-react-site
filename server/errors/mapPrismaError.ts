// Maps database errors to structured domain errors.
// Ensures no database internals leak to clients.

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
 * MySQL error code patterns mapped to domain codes.
 * MySQL uses ER_* error codes for constraint violations.
 */
const MYSQL_ERROR_MAP: Array<{ pattern: RegExp; code: DomainErrorCode; message: string }> = [
  { pattern: /Duplicate entry/i, code: 'CONFLICT', message: 'Unique constraint violation' },
  { pattern: /ER_DUP_ENTRY/i, code: 'CONFLICT', message: 'Unique constraint violation' },
  { pattern: /foreign key constraint fails/i, code: 'FOREIGN_KEY_VIOLATION', message: 'Foreign key constraint failed' },
  { pattern: /ER_NO_REFERENCED_ROW/i, code: 'FOREIGN_KEY_VIOLATION', message: 'Foreign key constraint failed' },
  { pattern: /ER_ROW_IS_REFERENCED/i, code: 'FOREIGN_KEY_VIOLATION', message: 'Foreign key constraint failed' },
  { pattern: /Column .* cannot be null/i, code: 'VALIDATION_ERROR', message: 'Required field is missing' },
  { pattern: /ER_BAD_NULL_ERROR/i, code: 'VALIDATION_ERROR', message: 'Required field is missing' },
  { pattern: /ER_CHECK_CONSTRAINT_VIOLATED/i, code: 'VALIDATION_ERROR', message: 'Data validation error' },
  { pattern: /Table .* doesn't exist/i, code: 'DATABASE_UNAVAILABLE', message: 'Database schema error' },
  { pattern: /ER_NO_SUCH_TABLE/i, code: 'DATABASE_UNAVAILABLE', message: 'Database schema error' },
  { pattern: /ER_LOCK_DEADLOCK/i, code: 'DATABASE_UNAVAILABLE', message: 'Database is temporarily unavailable' },
  { pattern: /ER_LOCK_WAIT_TIMEOUT/i, code: 'DATABASE_UNAVAILABLE', message: 'Database is temporarily unavailable' },
];

/**
 * Maps any error thrown by database operations into a structured AppError.
 *
 * - MySQL constraint errors: mapped to specific domain codes
 * - Connection/schema errors: mapped to DATABASE_UNAVAILABLE
 * - Other errors: sanitised as INTERNAL_SERVER_ERROR
 */
export function mapDatabaseError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message;

    // Check against known MySQL error patterns
    for (const { pattern, code, message: domainMessage } of MYSQL_ERROR_MAP) {
      if (pattern.test(message)) {
        return new AppError(code, domainMessage);
      }
    }

    // Unrecognised database error — log and sanitise
    console.error('[mapDatabaseError] Unrecognised error:', {
      name: error.name,
      message: error.message,
    });
  } else {
    console.error('[mapDatabaseError] Unknown thrown value:', error);
  }

  return new AppError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
}

/**
 * @deprecated Use mapDatabaseError instead. Kept for backward compatibility during migration.
 */
export const mapPrismaError = mapDatabaseError;
