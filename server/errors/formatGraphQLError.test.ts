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

  describe('database content stripping', () => {
    it('strips messages containing SQL keywords (SELECT)', () => {
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

    it('strips messages containing ER_DUP_ENTRY', () => {
      const input: GraphQLFormattedError = {
        message: "ER_DUP_ENTRY: Duplicate entry 'test@email.com' for key 'User.email'",
        extensions: { code: 'CONFLICT' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.message).toBe('An internal error occurred');
    });

    it('strips messages containing "Duplicate entry"', () => {
      const input: GraphQLFormattedError = {
        message: "Duplicate entry 'test@email.com' for key 'User_email_unique'",
        extensions: { code: 'CONFLICT' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.message).toBe('An internal error occurred');
    });

    it('strips messages containing "foreign key constraint fails"', () => {
      const input: GraphQLFormattedError = {
        message: 'Cannot add or update a child row: a foreign key constraint fails',
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.message).toBe('An internal error occurred');
    });

    it('strips messages containing "Table doesn\'t exist"', () => {
      const input: GraphQLFormattedError = {
        message: "Table 'dnd_site.User' doesn't exist",
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.message).toBe('An internal error occurred');
    });

    it('strips messages containing ER_LOCK_DEADLOCK', () => {
      const input: GraphQLFormattedError = {
        message: 'ER_LOCK_DEADLOCK: Deadlock found when trying to get lock',
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      };

      const result = formatGraphQLError(input, new Error());

      expect(result.message).toBe('An internal error occurred');
    });

    it('passes through clean messages without database content', () => {
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
        message: "Duplicate entry 'user@test.com' for key 'User_email_unique'",
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
