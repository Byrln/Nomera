import { z } from "zod";
import { resourceIdSchema } from "./security";
export const mediaUploadSchema = z
  .object({
    customerId: resourceIdSchema,
    operationId: resourceIdSchema,
    filename: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .refine((v) =>
        [...v].every(
          (char) =>
            char.charCodeAt(0) >= 32 &&
            char.charCodeAt(0) !== 127 &&
            char !== "/" &&
            char !== "\\",
        ),
      ),
    mimeType: z.enum([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]),
  })
  .strict();
export const maxUploadBytes = 5 * 1024 * 1024;
export type MediaUploadInput = z.infer<typeof mediaUploadSchema>;
