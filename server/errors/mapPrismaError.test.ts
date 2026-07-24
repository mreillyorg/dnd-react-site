import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
} from '@prisma/client/runtime/client';
import { mapPrismaError, AppError } from './mapPrismaError.js';

describe('mapPrismaError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('PrismaClientKnownRequestError mapping', () => {
    it('maps P2000 to VALIDATION_ERROR', () => {
      const error = new PrismaClientKnownRequestError('Value too long', {
        code: 'P2000',
        clientVersion: '7.9.0',
      });
      const result = mapPrismaError(error);
      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.message).toBe('Value too long for column type');
    });

    it('maps P2001 to NOT_FOUND', () => {
      const error = new PrismaClientKnownRequestError('Record not found', {
        code: 'P2001',
        clientVersion: '7.9.0',
      });
      const result = mapPrismaError(error);
      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Record not found');
    });

    it('maps P2002 to CONFLICT', () => {
      const error = new PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '7.9.0',
      });
      const result = mapPrismaError(error);
      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('CONFLICT');
      expect(result.message).toBe('Unique constraint violation');
    });

    it('maps P2003 to FOREIGN_KEY_VIOLATION', () => {
      const error = new PrismaClientKnownRequestError('FK constraint', {
        code: 'P2003',
        clientVersion: '7.9.0',
      });
      const result = mapPrismaError(error);
      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('FOREIGN_KEY_VIOLATION');
      expect(result.message).toBe('Foreign key constraint failed');
    });

    it('maps P2007 to VALIDATION_ERROR', () => {
      const error = new PrismaClientKnownRequestError('Data validation', {
        code: 'P2007',
        clientVersion: '7.9.0',
      });
      const result = mapPrismaError(error);
      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.message).toBe('Data validation error');
    });

    it('maps P2025 to NOT_FOUND', () => {
      const error = new PrismaClientKnownRequestError('Record to update not found', {
        code: 'P2025',
        clientVersion: '7.9.0',
      });
      const result = mapPrismaError(error);
      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Record not found');
    });

    it('maps P1001 to DATABASE_UNAVAILABLE', () => {
      const error = new PrismaClientKnownRequestError('Cannot reach DB', {
        code: 'P1001',
        clientVersion: '7.9.0',
      });
      const result = mapPrismaError(error);
      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('DATABASE_UNAVAILABLE');
      expect(result.message).toBe('Database server is unreachable');
    });

    it('maps unmapped known error code to INTERNAL_SERVER_ERROR', () => {
      const error = new PrismaClientKnownRequestError('Some other error', {
        code: 'P9999',
        clientVersion: '7.9.0',
      });
      const result = mapPrismaError(error);
      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('An unexpected database error occurred');
      expect(console.error).toHaveBeenCalledWith(
        '[mapPrismaError] Unmapped PrismaClientKnownRequestError:',
        expect.objectContaining({ code: 'P9999' }),
      );
    });
  });

  describe('unknown and panic errors', () => {
    it('maps PrismaClientUnknownRequestError to INTERNAL_SERVER_ERROR', () => {
      const error = new PrismaClientUnknownRequestError(
        'Something went wrong with the query engine',
        { clientVersion: '7.9.0' },
      );
      const result = mapPrismaError(error);
      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('An unexpected database error occurred');
      expect(result.message).not.toContain('query engine');
      expect(console.error).toHaveBeenCalledWith(
        '[mapPrismaError] PrismaClientUnknownRequestError:',
        expect.objectContaining({
          message: expect.stringContaining('Something went wrong'),
        }),
      );
    });

    it('maps PrismaClientRustPanicError to INTERNAL_SERVER_ERROR', () => {
      const error = new PrismaClientRustPanicError(
        'Rust panic in query engine thread',
        '7.9.0',
      );
      const result = mapPrismaError(error);
      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('An unexpected database error occurred');
      expect(result.message).not.toContain('Rust');
      expect(console.error).toHaveBeenCalledWith(
        '[mapPrismaError] PrismaClientRustPanicError:',
        expect.objectContaining({
          message: expect.stringContaining('Rust panic'),
        }),
      );
    });

    it('does not leak Prisma internals in returned error message', () => {
      const error = new PrismaClientUnknownRequestError(
        'Error in prisma.$queryRaw: SELECT * FROM User WHERE ...',
        { clientVersion: '7.9.0' },
      );
      const result = mapPrismaError(error);
      expect(result.message).not.toContain('prisma');
      expect(result.message).not.toContain('SELECT');
      expect(result.message).not.toContain('User');
    });
  });

  describe('non-Prisma errors', () => {
    it('maps a generic Error to INTERNAL_SERVER_ERROR', () => {
      const error = new Error('Something failed');
      const result = mapPrismaError(error);
      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('An unexpected error occurred');
      expect(console.error).toHaveBeenCalledWith(
        '[mapPrismaError] Non-Prisma error:',
        expect.objectContaining({ name: 'Error', message: 'Something failed' }),
      );
    });

    it('handles non-Error thrown values', () => {
      const result = mapPrismaError('string error');
      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('An unexpected error occurred');
      expect(console.error).toHaveBeenCalledWith(
        '[mapPrismaError] Unknown thrown value:',
        'string error',
      );
    });

    it('handles null/undefined thrown values', () => {
      const result = mapPrismaError(null);
      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('AppError class', () => {
    it('extends Error', () => {
      const err = new AppError('NOT_FOUND', 'Not found');
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('AppError');
    });

    it('exposes code and message', () => {
      const err = new AppError('CONFLICT', 'Duplicate entry');
      expect(err.code).toBe('CONFLICT');
      expect(err.message).toBe('Duplicate entry');
    });
  });
});
