import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import {
  setSessionCookie,
  clearSessionCookie,
  getSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "./sessionCookie.ts";

// Mock config
vi.mock("../config.ts", () => ({
  config: { cookieSecure: false },
}));

function createMockResponse(): Response {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response;
}

function createMockRequest(cookies: Record<string, string> = {}): Request {
  return { cookies } as unknown as Request;
}

describe("sessionCookie", () => {
  describe("constants", () => {
    it("SESSION_COOKIE_NAME is 'session'", () => {
      expect(SESSION_COOKIE_NAME).toBe("session");
    });

    it("SESSION_MAX_AGE_SECONDS is 7 days in seconds", () => {
      expect(SESSION_MAX_AGE_SECONDS).toBe(7 * 24 * 60 * 60);
    });
  });

  describe("setSessionCookie", () => {
    it("sets cookie with correct name, value, and options", () => {
      const res = createMockResponse();
      setSessionCookie(res, "test-token-123");

      expect(res.cookie).toHaveBeenCalledWith("session", "test-token-123", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS * 1000,
      });
    });
  });

  describe("clearSessionCookie", () => {
    it("clears cookie with matching options", () => {
      const res = createMockResponse();
      clearSessionCookie(res);

      expect(res.clearCookie).toHaveBeenCalledWith("session", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
      });
    });
  });

  describe("getSessionToken", () => {
    it("returns the token when present", () => {
      const req = createMockRequest({ session: "my-token" });
      expect(getSessionToken(req)).toBe("my-token");
    });

    it("returns null when cookie is missing", () => {
      const req = createMockRequest({});
      expect(getSessionToken(req)).toBeNull();
    });

    it("returns null when cookie is empty string", () => {
      const req = createMockRequest({ session: "" });
      expect(getSessionToken(req)).toBeNull();
    });

    it("returns null when cookies object is undefined", () => {
      const req = { cookies: undefined } as unknown as Request;
      expect(getSessionToken(req)).toBeNull();
    });
  });
});
