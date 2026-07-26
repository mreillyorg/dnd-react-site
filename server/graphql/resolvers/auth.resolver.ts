import { GraphQLError } from "graphql";

import type { GraphQLContext } from "../context.ts";
import {
  register,
  login,
  changePassword,
} from "../../services/authService.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireAuth(ctx: GraphQLContext) {
  if (!ctx.currentUser) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return ctx.currentUser;
}

function getDeps(ctx: GraphQLContext) {
  return { prisma: ctx.prisma, queue: ctx.queue };
}

/**
 * Maps service-layer errors to GraphQLErrors with appropriate codes.
 */
function mapAuthError(error: unknown): never {
  if (error instanceof GraphQLError) {
    throw error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown[] }).issues)
  ) {
    // ZodError — validation failure
    const issues = (error as { issues: { message: string }[] }).issues;
    const message = issues.map((e) => e.message).join(", ");
    throw new GraphQLError(message, {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  if (error instanceof Error) {
    const msg = error.message;

    if (msg.includes("already exists")) {
      throw new GraphQLError(msg, {
        extensions: { code: "CONFLICT" },
      });
    }

    if (msg.includes("Invalid email or password") || msg.includes("Current password is incorrect")) {
      throw new GraphQLError(msg, {
        extensions: { code: "UNAUTHENTICATED" },
      });
    }

    if (msg.includes("User not found")) {
      throw new GraphQLError(msg, {
        extensions: { code: "NOT_FOUND" },
      });
    }

    throw new GraphQLError(msg, {
      extensions: { code: "INTERNAL_SERVER_ERROR" },
    });
  }

  throw new GraphQLError("An unexpected error occurred", {
    extensions: { code: "INTERNAL_SERVER_ERROR" },
  });
}

// ---------------------------------------------------------------------------
// Resolver Map
// ---------------------------------------------------------------------------

export const authResolvers = {
  Mutation: {
    register: async (
      _parent: unknown,
      args: { email: string; password: string; name?: string },
      ctx: GraphQLContext,
    ) => {
      try {
        return await register(getDeps(ctx), {
          email: args.email,
          password: args.password,
          name: args.name,
        });
      } catch (error) {
        mapAuthError(error);
      }
    },

    login: async (
      _parent: unknown,
      args: { email: string; password: string },
      ctx: GraphQLContext,
    ) => {
      try {
        return await login(getDeps(ctx), {
          email: args.email,
          password: args.password,
        });
      } catch (error) {
        mapAuthError(error);
      }
    },

    changePassword: async (
      _parent: unknown,
      args: { currentPassword: string; newPassword: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      try {
        await changePassword(getDeps(ctx), user.id, args.currentPassword, args.newPassword);
        return true;
      } catch (error) {
        mapAuthError(error);
      }
    },
  },
};
