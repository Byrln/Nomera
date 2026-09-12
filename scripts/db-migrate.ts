import { readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import postgres from "postgres";
import { databaseEnvironmentSchema } from "../packages/schemas/src/environment";

const { DATABASE_URL } = databaseEnvironmentSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
});
const database = postgres(DATABASE_URL, {
  max: 1,
  connect_timeout: 10,
  prepare: false,
});
const migrationsDirectory = join(
  dirname(import.meta.path),
  "..",
  "db",
  "migrations",
);

try {
  await database`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  const files = (
    await Array.fromAsync(
      new Bun.Glob("*.sql").scan({ cwd: migrationsDirectory, onlyFiles: true }),
    )
  ).sort();
  for (const file of files) {
    const version = basename(file, ".sql");
    const applied = await database`
      SELECT version FROM schema_migrations WHERE version = ${version}
    `;
    if (applied.length > 0) continue;
    const sql = await readFile(join(migrationsDirectory, file), "utf8");
    await database.begin(async (transaction) => {
      await transaction.unsafe(sql);
      await transaction`
        INSERT INTO schema_migrations (version) VALUES (${version})
      `;
    });
    console.info(`[NOMERA] Applied database migration ${version}.`);
  }
} finally {
  await database.end({ timeout: 5 });
}
