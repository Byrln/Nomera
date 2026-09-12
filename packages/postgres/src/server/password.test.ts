import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("PostgreSQL account password storage", () => {
  it("verifies a stored password without accepting a different password", async () => {
    const stored = await hashPassword("correct horse battery staple");

    await expect(
      verifyPassword("correct horse battery staple", stored),
    ).resolves.toBe(true);
    await expect(verifyPassword("wrong password", stored)).resolves.toBe(false);
  });

  it("uses a different salt for each password hash", async () => {
    const first = await hashPassword("same password");
    const second = await hashPassword("same password");

    expect(first).not.toBe(second);
  });
});
