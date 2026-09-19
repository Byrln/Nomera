import { maxUploadBytes } from "@nomera/schemas/media";
import { DomainError } from "./errors";
export function assertFileContent(bytes: Uint8Array, mimeType: string) {
  if (bytes.byteLength < 12 || bytes.byteLength > maxUploadBytes)
    throw new DomainError("VALIDATION_ERROR");
  const prefix = (values: number[], offset = 0) =>
    values.every((byte, index) => bytes[offset + index] === byte);
  const matches =
    mimeType === "application/pdf"
      ? prefix([0x25, 0x50, 0x44, 0x46, 0x2d])
      : mimeType === "image/png"
        ? prefix([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        : mimeType === "image/jpeg"
          ? prefix([0xff, 0xd8, 0xff])
          : mimeType === "image/webp"
            ? prefix([0x52, 0x49, 0x46, 0x46]) &&
              prefix([0x57, 0x45, 0x42, 0x50], 8)
            : false;
  if (!matches) throw new DomainError("VALIDATION_ERROR");
}
