import { describe, expect, it } from "vitest";
import { createQrMatrix } from "./qrCode";

describe("createQrMatrix", () => {
  it("builds a square matrix with finder patterns in the corners", () => {
    const { matrix, moduleCount } = createQrMatrix("https://example.test/gallery");
    expect(matrix).toHaveLength(moduleCount);
    for (const row of matrix) expect(row).toHaveLength(moduleCount);

    // Finder pattern top-left corner: seven dark modules along the border.
    for (let offset = 0; offset < 7; offset += 1) {
      expect(matrix[0][offset]).toBe(true);
      expect(matrix[offset][0]).toBe(true);
    }
  });

  it("encodes longer payloads into a larger module grid", () => {
    const small = createQrMatrix("abc");
    const large = createQrMatrix("x".repeat(200));
    expect(large.moduleCount).toBeGreaterThan(small.moduleCount);
  });

  it("returns a deterministic matrix for the same payload", () => {
    expect(createQrMatrix("flashfold")).toEqual(createQrMatrix("flashfold"));
  });
});
