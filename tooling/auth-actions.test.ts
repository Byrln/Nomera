import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const boundary = vi.hoisted(() => ({
  session: "",
  set: vi.fn(),
  create: vi.fn(),
  revoke: vi.fn(),
  tenant: vi.fn(),
}));
vi.mock("../apps/admin/node_modules/next/headers", () => ({
  cookies: async () => ({
    get: () => ({ value: boundary.session }),
    set: boundary.set,
  }),
}));
vi.mock("../apps/admin/node_modules/next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("../packages/postgres/src/server/auth", () => ({
  createLoginSession: boundary.create,
  revokeLoginSession: boundary.revoke,
}));
vi.mock("../packages/postgres/src/server/tenant", () => ({
  createTenantRepository: boundary.tenant,
}));

import {
  selectWorkspace,
  signIn,
  signOut,
} from "../apps/admin/app/sign-in/actions";
import { DomainError } from "../packages/domain/src/errors";

beforeEach(() => {
  vi.clearAllMocks();
  boundary.session = "";
  boundary.create.mockResolvedValue({
    secret: "private-secret",
    expires: new Date("2099-01-01"),
  });
  boundary.revoke.mockResolvedValue(undefined);
  boundary.tenant.mockResolvedValue({
    context: { tenantId: "verified-tenant" },
  });
});
describe("authentication action boundary", () => {
  it("writes a host-only HttpOnly session and clears old tenant selection before fixed redirect", async () => {
    const data = new FormData();
    data.set("email", "staff@example.com");
    data.set("password", " pass ");
    data.set("redirect", "https://attacker.example");
    await expect(signIn({}, data)).rejects.toThrow("redirect:/workspaces");
    expect(boundary.create).toHaveBeenCalledWith({
      email: "staff@example.com",
      password: " pass ",
    });
    expect(boundary.set).toHaveBeenCalledWith(
      "nomera_session",
      "private-secret",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        expires: new Date("2099-01-01"),
      }),
    );
    expect(boundary.set.mock.calls[0]?.[2]).not.toHaveProperty("domain");
    expect(boundary.set).toHaveBeenCalledWith(
      "nomera_tenant",
      "",
      expect.objectContaining({ maxAge: 0 }),
    );
  });
  it("never serializes provider secrets or sets a cookie after failed login", async () => {
    boundary.create.mockRejectedValue(new Error("sensitive-secret"));
    expect(await signIn({}, new FormData())).toEqual({
      error: "INTERNAL_ERROR",
    });
    expect(boundary.set).not.toHaveBeenCalled();
  });
  it("does not accept workspace selection without a session", async () => {
    expect(await selectWorkspace({}, new FormData())).toEqual({
      error: "UNAUTHENTICATED",
    });
    expect(boundary.tenant).not.toHaveBeenCalled();
    expect(boundary.set).not.toHaveBeenCalled();
  });
  it("revalidates membership and uses the server resolved tenant ID", async () => {
    boundary.session = "session-a";
    const data = new FormData();
    data.set("tenantId", "00000000-0000-0000-0000-000000000003");
    data.set("role", "owner");
    await expect(selectWorkspace({}, data)).rejects.toThrow(
      "redirect:/workspaces",
    );
    expect(boundary.tenant).toHaveBeenCalledWith(
      "session-a",
      "00000000-0000-0000-0000-000000000003",
    );
    expect(boundary.set).toHaveBeenCalledWith(
      "nomera_tenant",
      "verified-tenant",
      expect.objectContaining({ httpOnly: true }),
    );
  });
  it("preserves selection on failed authorization", async () => {
    boundary.session = "session-a";
    boundary.tenant.mockRejectedValue(new DomainError("FORBIDDEN"));
    expect(await selectWorkspace({}, new FormData())).toEqual({
      error: "FORBIDDEN",
    });
    expect(boundary.set).not.toHaveBeenCalled();
  });
  it("revokes the current session before clearing both cookies", async () => {
    boundary.session = "session-a";
    await expect(signOut({}, new FormData())).rejects.toThrow(
      "redirect:/sign-in",
    );
    expect(boundary.revoke).toHaveBeenCalledWith("session-a");
    expect(boundary.set).toHaveBeenCalledTimes(2);
    expect(boundary.set.mock.invocationCallOrder[0]).toBeGreaterThan(
      boundary.revoke.mock.invocationCallOrder[0] ?? 0,
    );
  });
  it("reports revocation failure instead of falsely claiming sign-out", async () => {
    boundary.session = "session-a";
    boundary.revoke.mockRejectedValue(new DomainError("UNAVAILABLE"));
    expect(await signOut({}, new FormData())).toEqual({ error: "UNAVAILABLE" });
    expect(boundary.set).not.toHaveBeenCalled();
  });
});
