import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import type { ServiceDeps } from "./userService.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = "7d";

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const emailSchema = z.string().email("Invalid email address");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, "Name is required").optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is required but was not set.",
    );
  }
  return secret;
}

function generateToken(userId: string): string {
  return jwt.sign({ userId }, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });
}

// ---------------------------------------------------------------------------
// Auth Service Functions
// ---------------------------------------------------------------------------

/**
 * Register a new user.
 * Validates input, checks for duplicate email, hashes password with bcrypt,
 * creates user via the operation queue, and returns a JWT.
 */
export async function register(
  deps: ServiceDeps,
  input: RegisterInput,
): Promise<AuthPayload> {
  // Validate input
  const validatedInput = registerSchema.parse(input);

  // Check if user already exists (read — no queue needed)
  const existingUser = await deps.prisma.user.findUnique({
    where: { email: validatedInput.email },
  });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(validatedInput.password, SALT_ROUNDS);

  // Create user through operation queue (write operation)
  const user = await deps.queue.enqueue(() =>
    deps.prisma.user.create({
      data: {
        email: validatedInput.email,
        passwordHash,
        name: validatedInput.name,
      },
    }),
  );

  // Generate JWT
  const token = generateToken(user.id);

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
 * Login an existing user.
 * Validates input, finds user by email, verifies password with bcrypt,
 * and returns a JWT.
 */
export async function login(
  deps: ServiceDeps,
  input: LoginInput,
): Promise<AuthPayload> {
  // Validate input
  const validatedInput = loginSchema.parse(input);

  // Find user (read — no queue needed)
  const user = await deps.prisma.user.findUnique({
    where: { email: validatedInput.email },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(
    validatedInput.password,
    user.passwordHash,
  );

  if (!isValidPassword) {
    throw new Error("Invalid email or password");
  }

  // Generate JWT
  const token = generateToken(user.id);

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
 * Verify a JWT token and return the userId.
 * Pure JWT operation — no database access needed.
 */
export function verifyToken(token: string): string {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };
    return decoded.userId;
  } catch {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Change a user's password.
 * Verifies the current password, validates the new password,
 * hashes it with bcrypt, and updates via the operation queue.
 */
export async function changePassword(
  deps: ServiceDeps,
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  // Find user (read — no queue needed)
  const user = await deps.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(
    currentPassword,
    user.passwordHash,
  );

  if (!isValidPassword) {
    throw new Error("Current password is incorrect");
  }

  // Validate new password
  passwordSchema.parse(newPassword);

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update password through operation queue (write operation)
  await deps.queue.enqueue(() =>
    deps.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
  );
}
