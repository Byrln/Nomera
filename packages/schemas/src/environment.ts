import { z } from "zod";

// The browser receives no database configuration. All PostgreSQL access stays
// behind server-only route handlers and Server Actions.
export const publicEnvironmentSchema = z.object({});
export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;

export const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) =>
        value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),
});
export type DatabaseEnvironment = z.infer<typeof databaseEnvironmentSchema>;
