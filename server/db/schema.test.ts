import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Prisma schema provider-compatibility", () => {
  const schemaPath = resolve(__dirname, "../../prisma/schema.prisma");
  const configPath = resolve(__dirname, "../../prisma.config.ts");
  const schema = readFileSync(schemaPath, "utf-8");
  const config = readFileSync(configPath, "utf-8");

  it("does not use the Json field type (SQLite incompatible)", () => {
    // Match field definitions that use Json as the type
    // e.g. "  someField  Json" but not comments or string literals
    const lines = schema.split("\n");
    const jsonFields = lines.filter(
      (line) =>
        !line.trimStart().startsWith("//") &&
        /\b\w+\s+Json\b/.test(line)
    );
    expect(jsonFields).toEqual([]);
  });

  it("does not define enum blocks (incompatible dual-provider approach)", () => {
    // Match standalone "enum SomeName {" blocks
    const enumBlocks = schema.match(/^enum\s+\w+\s*\{/gm);
    expect(enumBlocks).toBeNull();
  });

  it("does not use MySQL-only types (Bytes used as blob-only storage)", () => {
    // Bytes is problematic in cross-provider schemas when used for non-binary data
    // Check there are no Bytes fields (acceptable if needed for actual binary data,
    // but the design says to use String for serialised data)
    const lines = schema.split("\n");
    const bytesFields = lines.filter(
      (line) =>
        !line.trimStart().startsWith("//") &&
        /\b\w+\s+Bytes\b/.test(line)
    );
    expect(bytesFields).toEqual([]);
  });

  it("does not use Unsupported type annotation", () => {
    const lines = schema.split("\n");
    const unsupportedFields = lines.filter(
      (line) =>
        !line.trimStart().startsWith("//") &&
        /Unsupported\(/.test(line)
    );
    expect(unsupportedFields).toEqual([]);
  });

  it("datasource block does not hardcode a connection URL", () => {
    // The datasource block should not contain url = "..." with a literal string
    // In Prisma 7, the URL is provided via prisma.config.ts, not in the schema
    const datasourceBlock = schema.match(
      /datasource\s+\w+\s*\{[\s\S]*?\}/
    );
    expect(datasourceBlock).not.toBeNull();

    // Ensure no url field with a hardcoded string value in the datasource block
    const block = datasourceBlock![0];
    const hardcodedUrl = /url\s*=\s*"[^"]+"/;
    expect(block).not.toMatch(hardcodedUrl);
  });

  it("datasource provider is set to 'sqlite' (compatible default for Prisma 7)", () => {
    const datasourceBlock = schema.match(
      /datasource\s+\w+\s*\{[\s\S]*?\}/
    );
    expect(datasourceBlock).not.toBeNull();

    const block = datasourceBlock![0];
    // Provider should be the literal string "sqlite"
    expect(block).toMatch(/provider\s*=\s*"sqlite"/);
  });

  it("prisma.config.ts reads DATABASE_URL from process.env", () => {
    // The config file should reference process.env for DATABASE_URL
    const readsFromEnv =
      config.includes('process.env["DATABASE_URL"]') ||
      config.includes("process.env['DATABASE_URL']") ||
      config.includes("process.env.DATABASE_URL");
    expect(readsFromEnv).toBe(true);
  });

  it("prisma.config.ts exists and defines a datasource config", () => {
    // Should contain a defineConfig call with datasource
    expect(config).toContain("defineConfig");
    expect(config).toContain("datasource");
  });
});
