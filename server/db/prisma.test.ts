import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockExecuteRawUnsafe = vi.fn().mockResolvedValue(0);

vi.mock("@prisma/client", () => {
  return {
    PrismaClient: class MockPrismaClient {
      $connect = mockConnect;
      $executeRawUnsafe = mockExecuteRawUnsafe;
    },
  };
});

describe("PrismaClient singleton and PRAGMA initialisation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("calls PRAGMA foreign_keys = ON and PRAGMA synchronous = FULL when DATABASE_URL starts with file:", async () => {
    process.env["DATABASE_URL"] = "file:./dev.db";

    vi.doMock("@prisma/client", () => ({
      PrismaClient: class MockPrismaClient {
        $connect = mockConnect;
        $executeRawUnsafe = mockExecuteRawUnsafe;
      },
    }));

    const { initializePrisma } = await import("./prisma.js");
    await initializePrisma();

    expect(mockConnect).toHaveBeenCalledOnce();
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith("PRAGMA foreign_keys = ON");
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith("PRAGMA synchronous = FULL");
    expect(mockExecuteRawUnsafe).toHaveBeenCalledTimes(2);
  });

  it("calls PRAGMA for in-memory SQLite (file::memory:)", async () => {
    process.env["DATABASE_URL"] = "file::memory:?cache=shared";

    vi.doMock("@prisma/client", () => ({
      PrismaClient: class MockPrismaClient {
        $connect = mockConnect;
        $executeRawUnsafe = mockExecuteRawUnsafe;
      },
    }));

    const { initializePrisma } = await import("./prisma.js");
    await initializePrisma();

    expect(mockConnect).toHaveBeenCalledOnce();
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith("PRAGMA foreign_keys = ON");
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith("PRAGMA synchronous = FULL");
  });

  it("does NOT apply any PRAGMA when DATABASE_URL is a MySQL connection string", async () => {
    process.env["DATABASE_URL"] = "mysql://user:pass@localhost:3306/mydb";

    vi.doMock("@prisma/client", () => ({
      PrismaClient: class MockPrismaClient {
        $connect = mockConnect;
        $executeRawUnsafe = mockExecuteRawUnsafe;
      },
    }));

    const { initializePrisma } = await import("./prisma.js");
    await initializePrisma();

    expect(mockConnect).toHaveBeenCalledOnce();
    expect(mockExecuteRawUnsafe).not.toHaveBeenCalled();
  });

  it("does NOT apply any PRAGMA when DATABASE_URL is not set", async () => {
    delete process.env["DATABASE_URL"];

    vi.doMock("@prisma/client", () => ({
      PrismaClient: class MockPrismaClient {
        $connect = mockConnect;
        $executeRawUnsafe = mockExecuteRawUnsafe;
      },
    }));

    const { initializePrisma } = await import("./prisma.js");
    await initializePrisma();

    expect(mockConnect).toHaveBeenCalledOnce();
    expect(mockExecuteRawUnsafe).not.toHaveBeenCalled();
  });

  it("exports a PrismaClient singleton instance", async () => {
    vi.doMock("@prisma/client", () => ({
      PrismaClient: class MockPrismaClient {
        $connect = mockConnect;
        $executeRawUnsafe = mockExecuteRawUnsafe;
      },
    }));

    const { prisma } = await import("./prisma.js");
    expect(prisma).toBeDefined();
    expect(prisma.$connect).toBeDefined();
    expect(prisma.$executeRawUnsafe).toBeDefined();
  });
});
