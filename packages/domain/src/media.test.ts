import { describe, expect, it } from "vitest";
import { assertFileContent } from "./media";

describe("private document validation", () => {
  it("accepts supported signatures and rejects spoofed MIME", () => {
    const pdf = new TextEncoder().encode("%PDF-1.4\nexample\n%%EOF");
    expect(() => assertFileContent(pdf, "application/pdf")).not.toThrow();
    expect(() => assertFileContent(pdf, "image/png")).toThrow();
    expect(() =>
      assertFileContent(
        new TextEncoder().encode("<script>alert(1)</script>"),
        "application/pdf",
      ),
    ).toThrow();
    expect(() => assertFileContent(pdf, "text/html")).toThrow();
  });
  it("bounds size before persistence", () => {
    expect(() =>
      assertFileContent(new Uint8Array(5 * 1024 * 1024 + 1), "image/png"),
    ).toThrow();
    expect(() =>
      assertFileContent(new Uint8Array(0), "application/pdf"),
    ).toThrow();
  });
});
