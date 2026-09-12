import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveLocale } from "../packages/i18n/src/index";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const manifests = [
  "package.json",
  ...["apps", "packages"].flatMap((dir) =>
    readdirSync(dir)
      .filter((name) => existsSync(join(dir, name, "package.json")))
      .map((name) => `${dir}/${name}/package.json`),
  ),
].map((path) => JSON.parse(read(path)));

describe("workspace architecture", () => {
  it("contains exactly the two requested apps with distinct fixed ports", () => {
    expect(readdirSync("apps").sort()).toEqual(["admin", "storefront"]);
    expect(JSON.parse(read("apps/admin/package.json")).scripts.dev).toBe(
      "next dev --port 3000",
    );
    expect(JSON.parse(read("apps/storefront/package.json")).scripts.dev).toBe(
      "next dev --port 3001",
    );
  });
  it("resolves workspace dependencies without cycles", () => {
    const byName = new Map(manifests.map((pkg) => [pkg.name, pkg]));
    function visit(name: string, ancestors: string[]) {
      expect(ancestors).not.toContain(name);
      const pkg = byName.get(name);
      expect(pkg).toBeDefined();
      for (const [dep, version] of Object.entries({
        ...pkg.dependencies,
        ...pkg.devDependencies,
      })) {
        if (version === "workspace:*") visit(dep, [...ancestors, name]);
      }
    }
    for (const name of byName.keys()) visit(name, []);
  });
  it("does not depend on an unwanted backend or duplicate React ranges", () => {
    const forbidden =
      /^(prisma|@prisma\/client|drizzle-orm|mongoose|mongodb|better-auth|next-auth|@clerk\/.*|@supabase\/.*|@neondatabase\/.*|@trpc\/.*|@orpc\/.*|zustand|redux)$/;
    const versions = new Set<string>();
    for (const pkg of manifests)
      for (const [dep, version] of Object.entries({
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
      })) {
        expect(dep).not.toMatch(forbidden);
        if (dep === "react" || dep === "react-dom")
          versions.add(String(version));
      }
    expect(versions.size).toBe(1);
  });
  it("guards privileged entrypoints and leaves the root entrypoint neutral", () => {
    expect(read("packages/postgres/src/server.ts")).toContain(
      'import "server-only"',
    );
    expect(read("packages/config/src/server.ts")).toContain(
      'import "server-only"',
    );
    expect(read("packages/postgres/src/index.ts")).not.toMatch(
      /from ["']\.\/server/,
    );
    expect(read("packages/config/src/client.ts")).not.toContain("DATABASE_URL");
  });
});
describe("localization", () => {
  it.each([undefined, "fr", "../../secret", ""])(
    "falls back to Mongolian for %s",
    (value) => expect(resolveLocale(value)).toBe("mn"),
  );
  it("accepts both supported locales", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("mn")).toBe("mn");
  });
  for (const app of ["admin", "storefront"])
    it(`${app} catalogs have identical keys and nonempty text`, () => {
      const mn = JSON.parse(read(`apps/${app}/messages/mn.json`));
      const en = JSON.parse(read(`apps/${app}/messages/en.json`));
      for (const namespace of Object.keys(mn)) {
        expect(Object.keys(mn[namespace]).sort()).toEqual(
          Object.keys(en[namespace]).sort(),
        );
        for (const value of [
          ...Object.values(mn[namespace]),
          ...Object.values(en[namespace]),
        ])
          expect(String(value).trim().length).toBeGreaterThan(0);
      }
    });
});
