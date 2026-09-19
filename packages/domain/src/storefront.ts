import "server-only";
import { storefrontMutationSchema } from "@nomera/schemas/storefront";
import { DomainError, parseInput } from "./errors";
import { assertCapability, type TenantContext } from "./tenancy";
export function authorizeStorefrontMutation(
  context: TenantContext,
  input: unknown,
  now = new Date(),
) {
  const command = parseInput(storefrontMutationSchema, input);
  assertCapability(
    context,
    command.type === "publish" ? "storefront:publish" : "storefront:manage",
  );
  if (
    command.type === "publish" &&
    command.scheduledAt &&
    (new Date(command.scheduledAt).getTime() <= now.getTime() ||
      new Date(command.scheduledAt).getTime() > now.getTime() + 366 * 86400000)
  )
    throw new DomainError("VALIDATION_ERROR");
  return command;
}
