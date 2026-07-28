import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphQLError } from "graphql";

import type { GraphQLContext } from "../context.ts";
import { hpResolvers } from "./hp.resolver.ts";

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function makeUnauthCtx(): GraphQLContext {
  return {
    currentUser: null,
    prisma: {
      combatant: { findUnique: vi.fn(), update: vi.fn() },
    } as unknown as GraphQLContext["prisma"],
    queue: {
      enqueue: vi.fn((fn) => fn()),
      drain: vi.fn(() => Promise.resolve()),
      pendingCount: 0,
    } as unknown as GraphQLContext["queue"],
  };
}

function makeAuthCtx(): GraphQLContext {
  return {
    currentUser: { id: "user-1", email: "test@example.com" },
    prisma: {
      combatant: { findUnique: vi.fn(), update: vi.fn() },
    } as unknown as GraphQLContext["prisma"],
    queue: {
      enqueue: vi.fn((fn) => fn()),
      drain: vi.fn(() => Promise.resolve()),
      pendingCount: 0,
    } as unknown as GraphQLContext["queue"],
  };
}

function makeCombatant(overrides?: Record<string, unknown>) {
  return {
    id: "comb-1",
    name: "Goblin",
    maxHp: 20,
    currentHp: 15,
    tempHp: 5,
    ...overrides,
  };
}

async function expectGraphQLError(fn: () => unknown, code: string) {
  let error: unknown;
  try {
    const result = fn();
    if (result && typeof (result as Promise<unknown>).then === "function") {
      await (result as Promise<unknown>);
    }
    expect.fail(`Expected function to throw GraphQLError with code ${code}`);
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(GraphQLError);
  expect((error as GraphQLError).extensions?.code).toBe(code);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const { Mutation } = hpResolvers;

describe("HP Resolver - Authentication", () => {
  it("applyDamage throws UNAUTHENTICATED when currentUser is null", async () => {
    const ctx = makeUnauthCtx();
    await expectGraphQLError(
      () => Mutation.applyDamage(null, { combatantId: "comb-1", damage: 5 }, ctx),
      "UNAUTHENTICATED",
    );
  });

  it("applyHealing throws UNAUTHENTICATED when currentUser is null", async () => {
    const ctx = makeUnauthCtx();
    await expectGraphQLError(
      () => Mutation.applyHealing(null, { combatantId: "comb-1", healing: 5 }, ctx),
      "UNAUTHENTICATED",
    );
  });

  it("setTempHp throws UNAUTHENTICATED when currentUser is null", async () => {
    const ctx = makeUnauthCtx();
    await expectGraphQLError(
      () => Mutation.setTempHp(null, { combatantId: "comb-1", tempHp: 5 }, ctx),
      "UNAUTHENTICATED",
    );
  });

  it("setMaxHp throws UNAUTHENTICATED when currentUser is null", async () => {
    const ctx = makeUnauthCtx();
    await expectGraphQLError(
      () => Mutation.setMaxHp(null, { combatantId: "comb-1", maxHp: 30 }, ctx),
      "UNAUTHENTICATED",
    );
  });

  it("setCurrentHp throws UNAUTHENTICATED when currentUser is null", async () => {
    const ctx = makeUnauthCtx();
    await expectGraphQLError(
      () => Mutation.setCurrentHp(null, { combatantId: "comb-1", currentHp: 10 }, ctx),
      "UNAUTHENTICATED",
    );
  });
});

describe("HP Resolver - Input Validation", () => {
  it("applyDamage rejects negative damage with BAD_USER_INPUT", async () => {
    const ctx = makeAuthCtx();
    await expectGraphQLError(
      () => Mutation.applyDamage(null, { combatantId: "comb-1", damage: -5 }, ctx),
      "BAD_USER_INPUT",
    );
  });

  it("applyHealing rejects negative healing with BAD_USER_INPUT", async () => {
    const ctx = makeAuthCtx();
    await expectGraphQLError(
      () => Mutation.applyHealing(null, { combatantId: "comb-1", healing: -3 }, ctx),
      "BAD_USER_INPUT",
    );
  });

  it("setTempHp rejects negative tempHp with BAD_USER_INPUT", async () => {
    const ctx = makeAuthCtx();
    await expectGraphQLError(
      () => Mutation.setTempHp(null, { combatantId: "comb-1", tempHp: -1 }, ctx),
      "BAD_USER_INPUT",
    );
  });

  it("setMaxHp rejects zero maxHp with BAD_USER_INPUT", async () => {
    const ctx = makeAuthCtx();
    await expectGraphQLError(
      () => Mutation.setMaxHp(null, { combatantId: "comb-1", maxHp: 0 }, ctx),
      "BAD_USER_INPUT",
    );
  });

  it("setMaxHp rejects negative maxHp with BAD_USER_INPUT", async () => {
    const ctx = makeAuthCtx();
    await expectGraphQLError(
      () => Mutation.setMaxHp(null, { combatantId: "comb-1", maxHp: -10 }, ctx),
      "BAD_USER_INPUT",
    );
  });

  it("setCurrentHp rejects negative currentHp with BAD_USER_INPUT", async () => {
    const ctx = makeAuthCtx();
    await expectGraphQLError(
      () => Mutation.setCurrentHp(null, { combatantId: "comb-1", currentHp: -1 }, ctx),
      "BAD_USER_INPUT",
    );
  });
});

describe("HP Resolver - Not Found", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applyDamage throws NOT_FOUND when combatant does not exist", async () => {
    const ctx = makeAuthCtx();
    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expectGraphQLError(
      () => Mutation.applyDamage(null, { combatantId: "nonexistent", damage: 5 }, ctx),
      "NOT_FOUND",
    );
  });

  it("applyHealing throws NOT_FOUND when combatant does not exist", async () => {
    const ctx = makeAuthCtx();
    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expectGraphQLError(
      () => Mutation.applyHealing(null, { combatantId: "nonexistent", healing: 5 }, ctx),
      "NOT_FOUND",
    );
  });

  it("setTempHp throws NOT_FOUND when combatant does not exist", async () => {
    const ctx = makeAuthCtx();
    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expectGraphQLError(
      () => Mutation.setTempHp(null, { combatantId: "nonexistent", tempHp: 5 }, ctx),
      "NOT_FOUND",
    );
  });

  it("setMaxHp throws NOT_FOUND when combatant does not exist", async () => {
    const ctx = makeAuthCtx();
    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expectGraphQLError(
      () => Mutation.setMaxHp(null, { combatantId: "nonexistent", maxHp: 30 }, ctx),
      "NOT_FOUND",
    );
  });

  it("setCurrentHp throws NOT_FOUND when combatant does not exist", async () => {
    const ctx = makeAuthCtx();
    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expectGraphQLError(
      () => Mutation.setCurrentHp(null, { combatantId: "nonexistent", currentHp: 10 }, ctx),
      "NOT_FOUND",
    );
  });
});

describe("HP Resolver - applyDamage (happy path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies damage reducing temp HP first, then current HP", async () => {
    const ctx = makeAuthCtx();
    const combatant = makeCombatant({ maxHp: 20, currentHp: 15, tempHp: 5 });
    const updatedCombatant = { ...combatant, currentHp: 12, tempHp: 0 };

    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(combatant);
    (ctx.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedCombatant);

    // 8 damage: 5 absorbed by tempHp, 3 to currentHp (15-3=12)
    const result = await Mutation.applyDamage(null, { combatantId: "comb-1", damage: 8 }, ctx);

    expect(ctx.queue.enqueue).toHaveBeenCalled();
    expect(ctx.prisma.combatant.update).toHaveBeenCalledWith({
      where: { id: "comb-1" },
      data: { currentHp: 12, tempHp: 0 },
    });
    expect(result).toEqual(updatedCombatant);
  });

  it("handles damage that only reduces temp HP", async () => {
    const ctx = makeAuthCtx();
    const combatant = makeCombatant({ maxHp: 20, currentHp: 15, tempHp: 10 });
    const updatedCombatant = { ...combatant, currentHp: 15, tempHp: 7 };

    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(combatant);
    (ctx.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedCombatant);

    const result = await Mutation.applyDamage(null, { combatantId: "comb-1", damage: 3 }, ctx);

    expect(ctx.prisma.combatant.update).toHaveBeenCalledWith({
      where: { id: "comb-1" },
      data: { currentHp: 15, tempHp: 7 },
    });
    expect(result).toEqual(updatedCombatant);
  });

  it("handles zero damage (no change)", async () => {
    const ctx = makeAuthCtx();
    const combatant = makeCombatant({ maxHp: 20, currentHp: 15, tempHp: 5 });
    const updatedCombatant = { ...combatant };

    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(combatant);
    (ctx.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedCombatant);

    const result = await Mutation.applyDamage(null, { combatantId: "comb-1", damage: 0 }, ctx);

    expect(ctx.prisma.combatant.update).toHaveBeenCalledWith({
      where: { id: "comb-1" },
      data: { currentHp: 15, tempHp: 5 },
    });
    expect(result).toEqual(updatedCombatant);
  });

  it("current HP cannot go below 0", async () => {
    const ctx = makeAuthCtx();
    const combatant = makeCombatant({ maxHp: 20, currentHp: 5, tempHp: 0 });
    const updatedCombatant = { ...combatant, currentHp: 0 };

    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(combatant);
    (ctx.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedCombatant);

    const result = await Mutation.applyDamage(null, { combatantId: "comb-1", damage: 100 }, ctx);

    expect(ctx.prisma.combatant.update).toHaveBeenCalledWith({
      where: { id: "comb-1" },
      data: { currentHp: 0, tempHp: 0 },
    });
    expect(result).toEqual(updatedCombatant);
  });
});

describe("HP Resolver - applyHealing (happy path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies healing capped at max HP", async () => {
    const ctx = makeAuthCtx();
    const combatant = makeCombatant({ maxHp: 20, currentHp: 10, tempHp: 0 });
    const updatedCombatant = { ...combatant, currentHp: 15 };

    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(combatant);
    (ctx.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedCombatant);

    const result = await Mutation.applyHealing(null, { combatantId: "comb-1", healing: 5 }, ctx);

    expect(ctx.queue.enqueue).toHaveBeenCalled();
    expect(ctx.prisma.combatant.update).toHaveBeenCalledWith({
      where: { id: "comb-1" },
      data: { currentHp: 15 },
    });
    expect(result).toEqual(updatedCombatant);
  });

  it("healing does not exceed max HP", async () => {
    const ctx = makeAuthCtx();
    const combatant = makeCombatant({ maxHp: 20, currentHp: 18, tempHp: 0 });
    const updatedCombatant = { ...combatant, currentHp: 20 };

    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(combatant);
    (ctx.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedCombatant);

    const result = await Mutation.applyHealing(null, { combatantId: "comb-1", healing: 50 }, ctx);

    expect(ctx.prisma.combatant.update).toHaveBeenCalledWith({
      where: { id: "comb-1" },
      data: { currentHp: 20 },
    });
    expect(result).toEqual(updatedCombatant);
  });

  it("healing from 0 HP works correctly", async () => {
    const ctx = makeAuthCtx();
    const combatant = makeCombatant({ maxHp: 20, currentHp: 0, tempHp: 0 });
    const updatedCombatant = { ...combatant, currentHp: 7 };

    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(combatant);
    (ctx.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedCombatant);

    const result = await Mutation.applyHealing(null, { combatantId: "comb-1", healing: 7 }, ctx);

    expect(ctx.prisma.combatant.update).toHaveBeenCalledWith({
      where: { id: "comb-1" },
      data: { currentHp: 7 },
    });
    expect(result).toEqual(updatedCombatant);
  });
});

describe("HP Resolver - setTempHp (happy path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets temp HP when new value is higher (D&D 5e no-stacking)", async () => {
    const ctx = makeAuthCtx();
    const combatant = makeCombatant({ maxHp: 20, currentHp: 15, tempHp: 3 });
    const updatedCombatant = { ...combatant, tempHp: 10 };

    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(combatant);
    (ctx.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedCombatant);

    const result = await Mutation.setTempHp(null, { combatantId: "comb-1", tempHp: 10 }, ctx);

    expect(ctx.queue.enqueue).toHaveBeenCalled();
    expect(ctx.prisma.combatant.update).toHaveBeenCalledWith({
      where: { id: "comb-1" },
      data: { tempHp: 10 },
    });
    expect(result).toEqual(updatedCombatant);
  });

  it("keeps existing temp HP when new value is lower (no-stacking rule)", async () => {
    const ctx = makeAuthCtx();
    const combatant = makeCombatant({ maxHp: 20, currentHp: 15, tempHp: 10 });
    const updatedCombatant = { ...combatant, tempHp: 10 };

    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(combatant);
    (ctx.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedCombatant);

    const result = await Mutation.setTempHp(null, { combatantId: "comb-1", tempHp: 5 }, ctx);

    // Takes the higher: Math.max(10, 5) = 10
    expect(ctx.prisma.combatant.update).toHaveBeenCalledWith({
      where: { id: "comb-1" },
      data: { tempHp: 10 },
    });
    expect(result).toEqual(updatedCombatant);
  });
});

describe("HP Resolver - setMaxHp (happy path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets max HP and clamps currentHp when it exceeds new maxHp", async () => {
    const ctx = makeAuthCtx();
    const combatant = makeCombatant({ maxHp: 20, currentHp: 18, tempHp: 0 });
    const updatedCombatant = { ...combatant, maxHp: 10, currentHp: 10 };

    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(combatant);
    (ctx.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedCombatant);

    const result = await Mutation.setMaxHp(null, { combatantId: "comb-1", maxHp: 10 }, ctx);

    expect(ctx.queue.enqueue).toHaveBeenCalled();
    expect(ctx.prisma.combatant.update).toHaveBeenCalledWith({
      where: { id: "comb-1" },
      data: { maxHp: 10, currentHp: 10 },
    });
    expect(result).toEqual(updatedCombatant);
  });

  it("sets max HP without clamping when currentHp is below new maxHp", async () => {
    const ctx = makeAuthCtx();
    const combatant = makeCombatant({ maxHp: 20, currentHp: 5, tempHp: 0 });
    const updatedCombatant = { ...combatant, maxHp: 30, currentHp: 5 };

    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(combatant);
    (ctx.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedCombatant);

    const result = await Mutation.setMaxHp(null, { combatantId: "comb-1", maxHp: 30 }, ctx);

    expect(ctx.prisma.combatant.update).toHaveBeenCalledWith({
      where: { id: "comb-1" },
      data: { maxHp: 30, currentHp: 5 },
    });
    expect(result).toEqual(updatedCombatant);
  });
});

describe("HP Resolver - setCurrentHp (happy path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets current HP directly within valid range", async () => {
    const ctx = makeAuthCtx();
    const combatant = makeCombatant({ maxHp: 20, currentHp: 15, tempHp: 0 });
    const updatedCombatant = { ...combatant, currentHp: 10 };

    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(combatant);
    (ctx.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedCombatant);

    const result = await Mutation.setCurrentHp(null, { combatantId: "comb-1", currentHp: 10 }, ctx);

    expect(ctx.queue.enqueue).toHaveBeenCalled();
    expect(ctx.prisma.combatant.update).toHaveBeenCalledWith({
      where: { id: "comb-1" },
      data: { currentHp: 10 },
    });
    expect(result).toEqual(updatedCombatant);
  });

  it("clamps currentHp to maxHp when value exceeds it", async () => {
    const ctx = makeAuthCtx();
    const combatant = makeCombatant({ maxHp: 20, currentHp: 15, tempHp: 0 });
    const updatedCombatant = { ...combatant, currentHp: 20 };

    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(combatant);
    (ctx.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedCombatant);

    const result = await Mutation.setCurrentHp(null, { combatantId: "comb-1", currentHp: 999 }, ctx);

    expect(ctx.prisma.combatant.update).toHaveBeenCalledWith({
      where: { id: "comb-1" },
      data: { currentHp: 20 },
    });
    expect(result).toEqual(updatedCombatant);
  });

  it("allows setting currentHp to 0", async () => {
    const ctx = makeAuthCtx();
    const combatant = makeCombatant({ maxHp: 20, currentHp: 15, tempHp: 0 });
    const updatedCombatant = { ...combatant, currentHp: 0 };

    (ctx.prisma.combatant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(combatant);
    (ctx.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedCombatant);

    const result = await Mutation.setCurrentHp(null, { combatantId: "comb-1", currentHp: 0 }, ctx);

    expect(ctx.prisma.combatant.update).toHaveBeenCalledWith({
      where: { id: "comb-1" },
      data: { currentHp: 0 },
    });
    expect(result).toEqual(updatedCombatant);
  });
});
