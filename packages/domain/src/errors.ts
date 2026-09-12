const errors = {
  VALIDATION_ERROR: { status: 400, message: "The request is invalid." },
  UNAUTHENTICATED: { status: 401, message: "Sign in to continue." },
  FORBIDDEN: {
    status: 403,
    message: "You do not have permission to perform this action.",
  },
  NOT_FOUND: { status: 404, message: "The requested resource was not found." },
  CONFLICT: {
    status: 409,
    message: "The resource has changed. Refresh and try again.",
  },
  RATE_LIMITED: { status: 429, message: "Too many requests. Try again later." },
  CONFIGURATION_ERROR: {
    status: 503,
    message: "This service is not configured.",
  },
  UNAVAILABLE: {
    status: 503,
    message: "The service is temporarily unavailable.",
  },
  INTERNAL_ERROR: { status: 500, message: "An unexpected error occurred." },
} as const;

export type ErrorCode = keyof typeof errors;
export class DomainError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode) {
    super(errors[code].message);
    this.name = "DomainError";
    this.code = code;
  }
}

// Never pass exception.message, stack, provider response or validation input to a client.
// UI consumers translate the stable code using their own locale catalog.
export function toPublicError(error: unknown) {
  const code = error instanceof DomainError ? error.code : "INTERNAL_ERROR";
  return { code, ...errors[code] };
}

export function parseInput<T>(
  schema: { parse(input: unknown): T },
  input: unknown,
): T {
  try {
    return schema.parse(input);
  } catch {
    throw new DomainError("VALIDATION_ERROR");
  }
}
