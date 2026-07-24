# Design Document - User Registration & Authentication

## Overview

This design implements user registration, login, password management, and session handling using JWT tokens with secure best practices. The system integrates with the GraphQL API and uses Prisma for user data persistence.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
│  (Login/Register forms, Auth context)                       │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP + JWT in Authorization header
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  GraphQL API Layer                           │
│  (Authentication mutations & queries)                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│               Authentication Service                         │
│  (Password hashing, JWT generation, validation)             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    Prisma Client                             │
│  (User queries/mutations)                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database                                │
│  (User table with hashed passwords)                         │
└─────────────────────────────────────────────────────────────┘
```

## Technology Choices

### Password Hashing
**Choice: bcrypt**
- Industry standard for password hashing
- Built-in salt generation
- Configurable work factor for future-proofing
- Well-tested and secure

```bash
npm install bcrypt
npm install -D @types/bcrypt
```

### JWT Handling
**Choice: jsonwebtoken**
- Standard library for JWT operations
- Good TypeScript support
- Flexible configuration

```bash
npm install jsonwebtoken
npm install -D @types/jsonwebtoken
```

### Input Validation
**Choice: Zod**
- Type-safe validation
- Great TypeScript integration
- Composable validators
- Already common in the ecosystem

```bash
npm install zod
```

## Database Schema

Already defined in data-storage-api design:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  themeMode     ThemeMode @default(SYSTEM)
  
  characters    Character[]
  campaigns     Campaign[]
  sessions      Session[]
  
  @@index([email])
}
```

## Backend Implementation

### Authentication Service

```typescript
// src/services/authService.ts

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/db/prisma';
import { z } from 'zod';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '7d';

// Validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(1, 'Name is required').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthPayload {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(input: RegisterInput): Promise<AuthPayload> {
    // Validate input
    const validatedInput = registerSchema.parse(input);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedInput.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedInput.password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedInput.email,
        passwordHash,
        name: validatedInput.name,
      },
    });

    // Generate JWT
    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Login existing user
   */
  static async login(input: LoginInput): Promise<AuthPayload> {
    // Validate input
    const validatedInput = loginSchema.parse(input);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedInput.email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      validatedInput.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT
    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Verify JWT token and return user ID
   */
  static async verifyToken(token: string): Promise<string> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      return decoded.userId;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate JWT token
   */
  private static generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    registerSchema.shape.password.parse(newPassword);

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}
```

### GraphQL Schema

```typescript
// src/graphql/types/Auth.ts

import { builder } from '../schema';
import { AuthService } from '../../services/authService';

// Auth payload type
const AuthPayload = builder.objectRef<{
  token: string;
  user: { id: string; email: string; name: string | null };
}>('AuthPayload').implement({
  fields: (t) => ({
    token: t.exposeString('token'),
    user: t.field({
      type: User,
      resolve: (parent) => parent.user,
    }),
  }),
});

// Register mutation
builder.mutationField('register', (t) =>
  t.field({
    type: AuthPayload,
    args: {
      email: t.arg.string({ required: true }),
      password: t.arg.string({ required: true }),
      name: t.arg.string(),
    },
    resolve: async (_root, args) => {
      return AuthService.register({
        email: args.email,
        password: args.password,
        name: args.name ?? undefined,
      });
    },
  })
);

// Login mutation
builder.mutationField('login', (t) =>
  t.field({
    type: AuthPayload,
    args: {
      email: t.arg.string({ required: true }),
      password: t.arg.string({ required: true }),
    },
    resolve: async (_root, args) => {
      return AuthService.login({
        email: args.email,
        password: args.password,
      });
    },
  })
);

// Change password mutation
builder.mutationField('changePassword', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      currentPassword: t.arg.string({ required: true }),
      newPassword: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) {
        throw new Error('Not authenticated');
      }

      await AuthService.changePassword(
        ctx.userId,
        args.currentPassword,
        args.newPassword
      );

      return true;
    },
  })
);

// Me query (get current user)
builder.queryField('me', (t) =>
  t.prismaField({
    type: 'User',
    nullable: true,
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.userId) return null;

      return ctx.prisma.user.findUnique({
        ...query,
        where: { id: ctx.userId },
      });
    },
  })
);
```

### GraphQL Context with Auth

```typescript
// src/graphql/server.ts

import { createYoga } from 'graphql-yoga';
import { schema } from './schema';
import { prisma } from '../lib/db/prisma';
import { AuthService } from '../services/authService';

export const yoga = createYoga({
  schema,
  context: async ({ request }) => {
    const userId = await getUserIdFromRequest(request);

    return {
      prisma,
      userId,
    };
  },
  graphiql: process.env.NODE_ENV === 'development',
});

async function getUserIdFromRequest(request: Request): Promise<string | undefined> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return undefined;
  }

  // Expected format: "Bearer <token>"
  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return undefined;
  }

  try {
    const userId = await AuthService.verifyToken(token);
    return userId;
  } catch (error) {
    console.error('Invalid token:', error);
    return undefined;
  }
}
```

## Frontend Implementation

### Auth Context

```typescript
// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
      fetchCurrentUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  async function fetchCurrentUser(authToken: string) {
    try {
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: `
            query Me {
              me {
                id
                email
                name
              }
            }
          `,
        }),
      });

      const { data } = await response.json();

      if (data?.me) {
        setUser(data.me);
      } else {
        // Invalid token
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              token
              user {
                id
                email
                name
              }
            }
          }
        `,
        variables: { email, password },
      }),
    });

    const { data, errors } = await response.json();

    if (errors) {
      throw new Error(errors[0].message);
    }

    const { token: newToken, user: newUser } = data.login;

    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);

    navigate('/');
  }

  async function register(email: string, password: string, name?: string) {
    const response = await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation Register($email: String!, $password: String!, $name: String) {
            register(email: $email, password: $password, name: $name) {
              token
              user {
                id
                email
                name
              }
            }
          }
        `,
        variables: { email, password, name },
      }),
    });

    const { data, errors } = await response.json();

    if (errors) {
      throw new Error(errors[0].message);
    }

    const { token: newToken, user: newUser } = data.register;

    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);

    navigate('/');
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    navigate('/login');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Login Page

```typescript
// src/pages/LoginPage.tsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">Login</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                className="input input-bordered"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                className="input input-bordered"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="alert alert-error mt-4">
                <span>{error}</span>
              </div>
            )}

            <div className="form-control mt-6">
              <button
                type="submit"
                className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>

          <div className="divider">OR</div>

          <p className="text-center">
            Don't have an account?{' '}
            <Link to="/register" className="link link-primary">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Register Page

```typescript
// src/pages/RegisterPage.tsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">Register</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Name (optional)</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                className="input input-bordered"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                className="input input-bordered"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <label className="label">
                <span className="label-text-alt">
                  Min 8 characters, 1 uppercase, 1 lowercase, 1 number
                </span>
              </label>
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Confirm Password</span>
              </label>
              <input
                type="password"
                className="input input-bordered"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="alert alert-error mt-4">
                <span>{error}</span>
              </div>
            )}

            <div className="form-control mt-6">
              <button
                type="submit"
                className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Register'}
              </button>
            </div>
          </form>

          <div className="divider">OR</div>

          <p className="text-center">
            Already have an account?{' '}
            <Link to="/login" className="link link-primary">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Protected Route Component

```typescript
// src/components/ProtectedRoute.tsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

### GraphQL Client Setup

```typescript
// src/lib/graphqlClient.ts

export async function graphqlRequest<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const token = localStorage.getItem('auth_token');

  const response = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const { data, errors } = await response.json();

  if (errors) {
    throw new Error(errors[0].message);
  }

  return data;
}
```

## Security Considerations

1. **Password Requirements**
   - Minimum 8 characters
   - Must contain uppercase, lowercase, and number
   - Hashed with bcrypt (12 rounds)

2. **JWT Tokens**
   - 7-day expiration
   - Stored in localStorage (consider httpOnly cookies for production)
   - Verified on every request

3. **SQL Injection**
   - Protected by Prisma parameterized queries

4. **Rate Limiting**
   - Should be added for login/register endpoints (TODO)

5. **HTTPS**
   - Required in production

## Environment Variables

```bash
# .env
JWT_SECRET="your-256-bit-secret-key-change-in-production"
```

## Testing Strategy

### Unit Tests

#### Authentication Service Tests

```typescript
// src/services/authService.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './authService';
import { prisma } from '../lib/db/prisma';
import bcrypt from 'bcrypt';

describe('AuthService', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const result = await AuthService.register({
        email: 'test@example.com',
        password: 'TestPassword123',
        name: 'Test User',
      });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
    });

    it('should hash the password', async () => {
      await AuthService.register({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });

      expect(user?.passwordHash).not.toBe('TestPassword123');
      expect(user?.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    it('should reject duplicate email', async () => {
      await AuthService.register({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      await expect(
        AuthService.register({
          email: 'test@example.com',
          password: 'TestPassword123',
        })
      ).rejects.toThrow('User with this email already exists');
    });

    it('should validate email format', async () => {
      await expect(
        AuthService.register({
          email: 'invalid-email',
          password: 'TestPassword123',
        })
      ).rejects.toThrow('Invalid email address');
    });

    it('should validate password strength', async () => {
      await expect(
        AuthService.register({
          email: 'test@example.com',
          password: 'weak',
        })
      ).rejects.toThrow('Password must be at least 8 characters');

      await expect(
        AuthService.register({
          email: 'test@example.com',
          password: 'nouppercase123',
        })
      ).rejects.toThrow('Password must contain at least one uppercase letter');

      await expect(
        AuthService.register({
          email: 'test@example.com',
          password: 'NOLOWERCASE123',
        })
      ).rejects.toThrow('Password must contain at least one lowercase letter');

      await expect(
        AuthService.register({
          email: 'test@example.com',
          password: 'NoNumbers',
        })
      ).rejects.toThrow('Password must contain at least one number');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await AuthService.register({
        email: 'test@example.com',
        password: 'TestPassword123',
        name: 'Test User',
      });
    });

    it('should login with correct credentials', async () => {
      const result = await AuthService.login({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('should reject incorrect password', async () => {
      await expect(
        AuthService.login({
          email: 'test@example.com',
          password: 'WrongPassword123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject non-existent email', async () => {
      await expect(
        AuthService.login({
          email: 'nonexistent@example.com',
          password: 'TestPassword123',
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const { token, user } = await AuthService.register({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      const userId = await AuthService.verifyToken(token);
      expect(userId).toBe(user.id);
    });

    it('should reject invalid token', async () => {
      await expect(AuthService.verifyToken('invalid-token')).rejects.toThrow(
        'Invalid or expired token'
      );
    });

    it('should reject expired token', async () => {
      // Mock jwt.verify to simulate expired token
      const jwt = await import('jsonwebtoken');
      vi.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(AuthService.verifyToken('expired-token')).rejects.toThrow(
        'Invalid or expired token'
      );
    });
  });

  describe('changePassword', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await AuthService.register({
        email: 'test@example.com',
        password: 'TestPassword123',
      });
      userId = result.user.id;
    });

    it('should change password with correct current password', async () => {
      await AuthService.changePassword(
        userId,
        'TestPassword123',
        'NewPassword456'
      );

      // Verify can login with new password
      const result = await AuthService.login({
        email: 'test@example.com',
        password: 'NewPassword456',
      });

      expect(result.token).toBeDefined();
    });

    it('should reject incorrect current password', async () => {
      await expect(
        AuthService.changePassword(userId, 'WrongPassword', 'NewPassword456')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should validate new password strength', async () => {
      await expect(
        AuthService.changePassword(userId, 'TestPassword123', 'weak')
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should reject for non-existent user', async () => {
      await expect(
        AuthService.changePassword(
          'non-existent-id',
          'TestPassword123',
          'NewPassword456'
        )
      ).rejects.toThrow('User not found');
    });
  });
});
```

### Integration Tests

#### GraphQL Auth Flow Tests

```typescript
// src/graphql/__tests__/auth.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { yoga } from '../server';
import { prisma } from '../../lib/db/prisma';

describe('Authentication Flow', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  it('should complete full registration flow', async () => {
    const response = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation Register($email: String!, $password: String!, $name: String) {
            register(email: $email, password: $password, name: $name) {
              token
              user {
                id
                email
                name
              }
            }
          }
        `,
        variables: {
          email: 'test@example.com',
          password: 'TestPassword123',
          name: 'Test User',
        },
      }),
    });

    const result = await response.json();

    expect(result.errors).toBeUndefined();
    expect(result.data.register.token).toBeDefined();
    expect(result.data.register.user.email).toBe('test@example.com');
    expect(result.data.register.user.name).toBe('Test User');
  });

  it('should complete full login flow', async () => {
    // Register
    await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation Register($email: String!, $password: String!) {
            register(email: $email, password: $password) {
              token
            }
          }
        `,
        variables: {
          email: 'test@example.com',
          password: 'TestPassword123',
        },
      }),
    });

    // Login
    const response = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              token
              user {
                email
              }
            }
          }
        `,
        variables: {
          email: 'test@example.com',
          password: 'TestPassword123',
        },
      }),
    });

    const result = await response.json();

    expect(result.errors).toBeUndefined();
    expect(result.data.login.token).toBeDefined();
    expect(result.data.login.user.email).toBe('test@example.com');
  });

  it('should access protected resource with valid token', async () => {
    // Register
    const registerResponse = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation Register($email: String!, $password: String!) {
            register(email: $email, password: $password) {
              token
            }
          }
        `,
        variables: {
          email: 'test@example.com',
          password: 'TestPassword123',
        },
      }),
    });

    const registerResult = await registerResponse.json();
    const token = registerResult.data.register.token;

    // Access protected resource
    const meResponse = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          query {
            me {
              email
            }
          }
        `,
      }),
    });

    const meResult = await meResponse.json();

    expect(meResult.errors).toBeUndefined();
    expect(meResult.data.me.email).toBe('test@example.com');
  });

  it('should reject access without token', async () => {
    const response = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            me {
              email
            }
          }
        `,
      }),
    });

    const result = await response.json();

    expect(result.data.me).toBeNull();
  });

  it('should reject access with invalid token', async () => {
    const response = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid-token',
      },
      body: JSON.stringify({
        query: `
          query {
            me {
              email
            }
          }
        `,
      }),
    });

    const result = await response.json();

    expect(result.data.me).toBeNull();
  });
});
```

### Frontend Component Tests

```typescript
// src/pages/LoginPage.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '../contexts/AuthContext';

const mockLogin = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('LoginPage', () => {
  it('should render login form', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should call login on form submit', async () => {
    mockLogin.mockResolvedValue(undefined);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'TestPassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'TestPassword123');
    });
  });

  it('should display error on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
```

### Required Test Coverage

All implementations MUST include:

1. **Unit tests** for:
   - Registration logic (validation, hashing, duplicate detection)
   - Login logic (credential verification, token generation)
   - Token verification (valid, invalid, expired)
   - Password change logic
   - Input validation

2. **Integration tests** for:
   - Complete registration flow (GraphQL mutation → database)
   - Complete login flow (GraphQL mutation → JWT)
   - Protected resource access (with and without tokens)
   - Token expiration handling
   - Error cases (duplicate users, invalid credentials)

3. **Frontend component tests** for:
   - Form rendering
   - Form submission
   - Error display
   - Navigation flows
   - Protected route behavior

4. **Minimum coverage**: 80% across lines, functions, branches, and statements

5. **Test commands**:
   ```bash
   # Run all tests
   npm run test

   # Run tests with coverage
   npm run test:coverage

   # Run tests in watch mode
   npm run test:watch
   ```

## Next Steps

1. Add password reset functionality (email-based) - with tests
2. Implement rate limiting on auth endpoints - with tests
3. Add email verification - with tests
4. Consider OAuth providers (Google, Discord) - with tests
5. Add 2FA support - with tests
6. Implement session management (logout all devices) - with tests
7. Add account deletion functionality - with tests
