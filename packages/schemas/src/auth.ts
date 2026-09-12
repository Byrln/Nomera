import { z } from "zod";

export const loginCredentialsSchema = z
  .object({
    email: z.string().trim().max(254).pipe(z.email()),
    // Do not change an existing password or impose new-account password rules at login.
    password: z.string().min(1).max(256),
  })
  .strict();

export const loginSessionSchema = z.object({
  secret: z.string().min(1).max(8192),
  expires: z.iso.datetime({ offset: true }),
});
