import { publicEnvironmentSchema } from "@nomera/schemas/environment";
export function getPublicEnvironment() {
  return publicEnvironmentSchema.parse({});
}
