import { describe, it, expect, vi, beforeEach } from "vitest";
import { createUser, getUserById, getUserByEmail } from "./userService.ts";
import type { ServiceDeps } from "./userService.ts";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockDeps(): ServiceDeps {
  const mockTx = {
    user: {
      create: vi.fn(),
    },
  };

  const mockPrisma = {
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    user: {
      findUnique: vi.fn(),
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

describe("userService", () => {
  let deps: ServiceDeps;

  beforeEach(() => {
    deps = createMockDeps();
  });

  describe("createUser", () => {
    it("routes the write through the operation queue", async () => {
      const mockUser = { id: "u1", email: "test@example.com", passwordHash: "pw", name: null, themeMode: "SYSTEM" };
      // Get the tx mock via $transaction
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          const tx = { user: { create: vi.fn().mockResolvedValue(mockUser) } };
          return fn(tx);
        },
      );

      await createUser(deps, { email: "test@example.com", password: "pw" });

      expect(deps.queue.enqueue).toHaveBeenCalledTimes(1);
    });

    it("wraps the create in a $transaction", async () => {
      const mockUser = { id: "u1", email: "test@example.com", passwordHash: "pw", name: null, themeMode: "SYSTEM" };
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          const tx = { user: { create: vi.fn().mockResolvedValue(mockUser) } };
          return fn(tx);
        },
      );

      await createUser(deps, { email: "test@example.com", password: "pw" });

      expect(deps.prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("passes correct data to prisma create", async () => {
      const createFn = vi.fn().mockResolvedValue({ id: "u1" });
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          const tx = { user: { create: createFn } };
          return fn(tx);
        },
      );

      await createUser(deps, {
        email: "hero@realm.com",
        password: "secret123",
        name: "Hero",
        themeMode: "DARK",
      });

      expect(createFn).toHaveBeenCalledWith({
        data: {
          email: "hero@realm.com",
          passwordHash: "secret123",
          name: "Hero",
          themeMode: "DARK",
        },
      });
    });

    it("defaults themeMode to SYSTEM when not provided", async () => {
      const createFn = vi.fn().mockResolvedValue({ id: "u1" });
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          const tx = { user: { create: createFn } };
          return fn(tx);
        },
      );

      await createUser(deps, { email: "a@b.com", password: "pw" });

      expect(createFn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ themeMode: "SYSTEM" }),
        }),
      );
    });

    it("returns the created user", async () => {
      const mockUser = { id: "u1", email: "test@example.com" };
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          const tx = { user: { create: vi.fn().mockResolvedValue(mockUser) } };
          return fn(tx);
        },
      );

      const result = await createUser(deps, { email: "test@example.com", password: "pw" });

      expect(result).toEqual(mockUser);
    });
  });

  describe("getUserById", () => {
    it("reads directly through prisma (not through queue)", async () => {
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "u1" });

      await getUserById(deps, "u1");

      expect(deps.queue.enqueue).not.toHaveBeenCalled();
      expect(deps.prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "u1" } });
    });

    it("returns null when user not found", async () => {
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await getUserById(deps, "nonexistent");

      expect(result).toBeNull();
    });

    it("returns the user when found", async () => {
      const mockUser = { id: "u1", email: "found@example.com" };
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await getUserById(deps, "u1");

      expect(result).toEqual(mockUser);
    });
  });

  describe("getUserByEmail", () => {
    it("reads directly through prisma (not through queue)", async () => {
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "u1" });

      await getUserByEmail(deps, "test@example.com");

      expect(deps.queue.enqueue).not.toHaveBeenCalled();
      expect(deps.prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "test@example.com" } });
    });

    it("returns null when user not found", async () => {
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await getUserByEmail(deps, "missing@example.com");

      expect(result).toBeNull();
    });

    it("returns the user when found", async () => {
      const mockUser = { id: "u1", email: "found@example.com" };
      (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await getUserByEmail(deps, "found@example.com");

      expect(result).toEqual(mockUser);
    });
  });
});
