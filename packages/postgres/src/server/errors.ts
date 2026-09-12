import "server-only";
import { DomainError } from "@nomera/domain/errors";

export function mapDatabaseError(error: unknown): DomainError {
  if (error instanceof DomainError) return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    switch (error.code) {
      case "23505":
        return new DomainError("CONFLICT");
      case "40001":
      case "40P01":
        return new DomainError("CONFLICT");
      case "28P01":
      case "3D000":
        return new DomainError("CONFIGURATION_ERROR");
    }
  }
  return new DomainError("UNAVAILABLE");
}

export async function databaseRead<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    throw mapDatabaseError(error);
  }
}
