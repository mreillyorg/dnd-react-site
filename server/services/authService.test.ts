import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  register,
  login,
  verifyToken,
  changePassword,
  passwordSchema,
  emailSchema,
} from "./authService.ts";
import type { ServiceDeps } from "./userService.ts";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockDeps(): ServiceDeps {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as ServiceDeps["prisma"];

  const mockQueue = {
    enqueue: vi.fn((fn: () => Promise<unknown>) => fn()),
    drain: vi.fn(),
    pendingCount: 0,
  } as unknown as ServiceDeps["queue"];

  return { prisma: mockPrisma, queue: mockQueue };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("authService", () => {
  let deps: ServiceDeps;

  beforeEach(() => {
    deps = createMockDeps();
    process.env.JWT_SECRET = "test-secret-key-for-unit-tests-only";
  });

  // -------------------------------------------------------------------------
  // register()
  // -------------------------------------------------------------------------

  describe("register", () => {
    it("creates a user, hashes the password, and returns a token", async () => {
      const mockUser = { id: "u1", email: "hero@realm.com", name: "Hero" };
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (deps.prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await register(deps, {
        email: "hero@realm.com",
        password: "StrongPass1",
        name: "Hero",
      });

      // Token is a valid JWT
      expect(result.token).toBeDefined();
      const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as { userId: string };
      expect(decoded.userId).toBe("u1");

      // User data returned
      expect(result.user).toEqual({ id: "u1", email: "hero@realm.com", name: "Hero" });

      // Password was hashed (not stored as plaintext)
      const createCall = (deps.prisma.user.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(createCall.data.passwordHash).not.toBe("StrongPass1");
      expect(createCall.data.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    it("throws when email is already registered", async () => {
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "existing",
        email: "dup@test.com",
      });

      await expect(
        register(deps, { email: "dup@test.com", password: "StrongPass1" }),
      ).rejects.toThrow("User with this email already exists");
    });

    it("rejects invalid email addresses", async () => {
      await expect(
        register(deps, { email: "not-an-email", password: "StrongPass1" }),
      ).rejects.toThrow();
    });

    it("rejects weak passwords (too short)", async () => {
      await expect(
        register(deps, { email: "a@b.com", password: "Abc1" }),
      ).rejects.toThrow("at least 8 characters");
    });

    it("rejects passwords without uppercase", async () => {
      await expect(
        register(deps, { email: "a@b.com", password: "lowercase123" }),
      ).rejects.toThrow("uppercase");
    });

    it("rejects passwords without lowercase", async () => {
      await expect(
        register(deps, { email: "a@b.com", password: "UPPERCASE123" }),
      ).rejects.toThrow("lowercase");
    });

    it("rejects passwords without a number", async () => {
      await expect(
        register(deps, { email: "a@b.com", password: "NoNumberHere" }),
      ).rejects.toThrow("number");
    });
  });

  // -------------------------------------------------------------------------
  // login()
  // -------------------------------------------------------------------------

  describe("login", () => {
    it("returns a token for correct credentials", async () => {
      const passwordHash = await bcrypt.hash("CorrectPass1", 12);
      const mockUser = { id: "u1", email: "user@test.com", name: "User", passwordHash };
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await login(deps, { email: "user@test.com", password: "CorrectPass1" });

      expect(result.token).toBeDefined();
      const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as { userId: string };
      expect(decoded.userId).toBe("u1");
      expect(result.user).toEqual({ id: "u1", email: "user@test.com", name: "User" });
    });

    it("throws for non-existent email", async () => {
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        login(deps, { email: "nobody@test.com", password: "SomePass1" }),
      ).rejects.toThrow("Invalid email or password");
    });

    it("throws for incorrect password", async () => {
      const passwordHash = await bcrypt.hash("CorrectPass1", 12);
      const mockUser = { id: "u1", email: "user@test.com", name: "User", passwordHash };
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      await expect(
        login(deps, { email: "user@test.com", password: "WrongPass1" }),
      ).rejects.toThrow("Invalid email or password");
    });
  });

  // -------------------------------------------------------------------------
  // verifyToken()
  // -------------------------------------------------------------------------

  describe("verifyToken", () => {
    it("returns userId for a valid token", () => {
      const token = jwt.sign({ userId: "u42" }, process.env.JWT_SECRET!, { expiresIn: "1h" });

      const userId = verifyToken(token);

      expect(userId).toBe("u42");
    });

    it("throws for an invalid token", () => {
      expect(() => verifyToken("not.a.valid.token")).toThrow("Invalid or expired token");
    });

    it("throws for an expired token", () => {
      // Create a token that expired 1 hour ago
      const token = jwt.sign(
        { userId: "u42", iat: Math.floor(Date.now() / 1000) - 7200 },
        process.env.JWT_SECRET!,
        { expiresIn: "1h" },
      );

      // The token's iat is 2 hours ago and expiresIn is 1h, so it expired 1 hour ago
      expect(() => verifyToken(token)).toThrow("Invalid or expired token");
    });
  });

  // -------------------------------------------------------------------------
  // changePassword()
  // -------------------------------------------------------------------------

  describe("changePassword", () => {
    it("updates password when current password is correct", async () => {
      const currentHash = await bcrypt.hash("OldPass123", 12);
      const mockUser = { id: "u1", email: "user@test.com", passwordHash: currentHash };
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (deps.prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await changePassword(deps, "u1", "OldPass123", "NewPass456");

      expect(deps.prisma.user.update).toHaveBeenCalledTimes(1);
      const updateCall = (deps.prisma.user.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: "u1" });
      // New password is hashed
      expect(updateCall.data.passwordHash).not.toBe("NewPass456");
      expect(updateCall.data.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    it("throws when current password is wrong", async () => {
      const currentHash = await bcrypt.hash("OldPass123", 12);
      const mockUser = { id: "u1", email: "user@test.com", passwordHash: currentHash };
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      await expect(
        changePassword(deps, "u1", "WrongCurrent1", "NewPass456"),
      ).rejects.toThrow("Current password is incorrect");
    });

    it("throws when new password is too weak", async () => {
      const currentHash = await bcrypt.hash("OldPass123", 12);
      const mockUser = { id: "u1", email: "user@test.com", passwordHash: currentHash };
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      await expect(
        changePassword(deps, "u1", "OldPass123", "weak"),
      ).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Password hashing behavior
  // -------------------------------------------------------------------------

  describe("password hashing", () => {
    it("hash does not equal plaintext and matches bcrypt pattern", async () => {
      const mockUser = { id: "u1", email: "a@b.com", name: null };
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (deps.prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      await register(deps, { email: "a@b.com", password: "SecurePass1" });

      const createCall = (deps.prisma.user.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const storedHash = createCall.data.passwordHash;

      // Not plaintext
      expect(storedHash).not.toBe("SecurePass1");
      // Matches bcrypt hash pattern
      expect(storedHash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
      // Can be verified with bcrypt
      const matches = await bcrypt.compare("SecurePass1", storedHash);
      expect(matches).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Schema validation (standalone)
  // -------------------------------------------------------------------------

  describe("JWT_SECRET missing", () => {
    it("throws when JWT_SECRET is not set during register", async () => {
      delete process.env.JWT_SECRET;
      const mockUser = { id: "u1", email: "a@b.com", name: null };
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (deps.prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      await expect(
        register(deps, { email: "a@b.com", password: "StrongPass1" }),
      ).rejects.toThrow("JWT_SECRET environment variable is required");
    });
  });

  describe("changePassword - user not found", () => {
    it("throws when user does not exist", async () => {
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        changePassword(deps, "nonexistent", "OldPass123", "NewPass456"),
      ).rejects.toThrow("User not found");
    });
  });

  describe("emailSchema", () => {
    it("accepts valid emails", () => {
      expect(() => emailSchema.parse("user@example.com")).not.toThrow();
    });

    it("rejects invalid emails", () => {
      expect(() => emailSchema.parse("not-an-email")).toThrow();
    });
  });

  describe("passwordSchema", () => {
    it("accepts a strong password", () => {
      expect(() => passwordSchema.parse("ValidPass1")).not.toThrow();
    });

    it("rejects passwords shorter than 8 characters", () => {
      expect(() => passwordSchema.parse("Ab1")).toThrow("8 characters");
    });

    it("rejects passwords without uppercase", () => {
      expect(() => passwordSchema.parse("alllower1")).toThrow("uppercase");
    });

    it("rejects passwords without lowercase", () => {
      expect(() => passwordSchema.parse("ALLUPPER1")).toThrow("lowercase");
    });

    it("rejects passwords without a number", () => {
      expect(() => passwordSchema.parse("NoNumbers")).toThrow("number");
    });
  });
});
