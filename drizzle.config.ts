import "dotenv/config";
import { defineConfig } from "drizzle-kit";

function resolveDbUrl(url: string): string {
  // drizzle-kit expects a plain file path for SQLite, not "file:./path"
  if (url.startsWith("file:./")) return url.slice(7);
  if (url.startsWith("file:")) return url.slice(5);
  return url;
}

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: resolveDbUrl(process.env["DATABASE_URL"] ?? "file:./dev.db"),
  },
});
