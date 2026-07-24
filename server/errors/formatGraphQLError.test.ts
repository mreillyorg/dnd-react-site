import { describe, it, expect } from 'vitest';
import { formatGraphQLError } from './formatGraphQLError.js';
import type { GraphQLFormattedError } from 'graphql';

describe('formatGraphQLError', () => {
  describe('extensions.code enforcement', () => {
    it('preserves existing extensions.code', () => {
      const input: GraphQLFormattedError = {
        message: 'Not found',
        extensions: { code: 'NOT_FOUND' },
      };

      const result = formatGraphQLError(input, new Error('Not found'));

      expect(result.extensions?.['code']).toBe('NOT_FOUND');
    });

    it('defaults to INTERNAL_SERVER_ERROR when extensions is missing', () => {
      const input: GraphQLFormattedError = {
        message: 'Something went wrong',
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.extensions?.['code']).toBe('INTERNAL_SERVER_ERROR');
    });

    it('defaults to INTERNAL_SERVER_ERROR when code is empty string', () => {
      const input: GraphQLFormattedError = {
        message: 'Something went wrong',
        extensions: { code: '' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.extensions?.['code']).toBe('INTERNAL_SERVER_ERROR');
    });

    it('defaults to INTERNAL_SERVER_ERROR when code is not a string', () => {
      const input: GraphQLFormattedError = {
        message: 'Something went wrong',
        extensions: { code: 123 },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.extensions?.['code']).toBe('INTERNAL_SERVER_ERROR');
    });

    it('preserves other extension fields', () => {
      const input: GraphQLFormattedError = {
        message: 'Validation failed',
        extensions: { code: 'VALIDATION_ERROR', field: 'email' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.extensions?.['code']).toBe('VALIDATION_ERROR');
      expect(result.extensions?.['field']).toBe('email');
    });
  });

  describe('Prisma content stripping', () => {
    it('strips messages containing Prisma error codes (P2002)', () => {
      const input: GraphQLFormattedError = {
        message: 'Unique constraint failed on the fields: P2002',
        extensions: { code: 'CONFLICT' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.message).toBe('An internal error occurred');
    });

    it('strips messages containing Prisma error codes (P1001)', () => {
      const input: GraphQLFormattedError = {
        message: 'Error P1001: Could not connect to database',
        extensions: { code: 'DATABASE_UNAVAILABLE' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.message).toBe('An internal error occurred');
    });

    it('strips messages containing SQL keywords', () => {
      const input: GraphQLFormattedError = {
        message: 'Failed to execute SELECT * FROM users WHERE id = 1',
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.message).toBe('An internal error occurred');
    });

    it('strips messages containing INSERT SQL', () => {
      const input: GraphQLFormattedError = {
        message: 'INSERT into characters failed due to constraint',
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.message).toBe('An internal error occurred');
    });

    it('strips messages containing the word "prisma"', () => {
      const input: GraphQLFormattedError = {
        message: 'Prisma client encountered an unexpected error',
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.message).toBe('An internal error occurred');
    });

    it('strips messages referencing prisma.$ methods', () => {
      const input: GraphQLFormattedError = {
        message: 'Error in prisma.$queryRaw invocation',
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.message).toBe('An internal error occurred');
    });

    it('passes through clean messages without Prisma content', () => {
      const input: GraphQLFormattedError = {
        message: 'Record not found',
        extensions: { code: 'NOT_FOUND' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.message).toBe('Record not found');
    });

    it('passes through generic user-facing messages', () => {
      const input: GraphQLFormattedError = {
        message: 'Invalid email format',
        extensions: { code: 'VALIDATION_ERROR' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.message).toBe('Invalid email format');
    });
  });

  describe('combined behavior', () => {
    it('both sanitizes message and ensures code in one pass', () => {
      const input: GraphQLFormattedError = {
        message: 'prisma.$transaction failed unexpectedly',
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.message).toBe('An internal error occurred');
      expect(result.extensions?.['code']).toBe('INTERNAL_SERVER_ERROR');
    });

    it('preserves locations and path fields from original error', () => {
      const input: GraphQLFormattedError = {
        message: 'Not found',
        locations: [{ line: 1, column: 3 }],
        path: ['character', 'name'],
        extensions: { code: 'NOT_FOUND' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.locations).toEqual([{ line: 1, column: 3 }]);
      expect(result.path).toEqual(['character', 'name']);
    });
  });
});
