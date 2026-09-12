import "server-only";
import { databaseEnvironmentSchema } from "@nomera/schemas";

// Lazy validation: a key is only required when an admin client is requested.
export function getServerEnvironment() {
  const result = databaseEnvironmentSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
  });
  if (!result.success)
    throw new Error("DATABASE_URL is required for server database operations.");
  return result.data;
}
