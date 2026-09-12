import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Railway root deployment boundary", () => {
  it("keeps root-run migration scripts free of workspace-only aliases", () => {
    expect(read("scripts/db-migrate.ts")).not.toContain("@nomera/config/");
    expect(read("scripts/db-seed-admin.ts")).not.toContain("@nomera/");
  });

  it("runs migrations before the Railway web process", () => {
    const railway = JSON.parse(read("railway.json"));
    expect(railway.deploy.startCommand).toBe("bun run db:migrate && bun start");
  });
});
