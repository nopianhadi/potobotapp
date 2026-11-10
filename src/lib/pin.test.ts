import { describe, expect, it } from "vitest";
import { hashBoothPin, isValidPinFormat, verifyBoothPin } from "./pin";

describe("booth pin", () => {
  it("rejects pins outside the 4-6 digit range", async () => {
    await expect(hashBoothPin("12")).rejects.toThrow("PIN harus");
    await expect(hashBoothPin("1234567")).rejects.toThrow("PIN harus");
    await expect(hashBoothPin("12a4")).rejects.toThrow("PIN harus");
    expect(isValidPinFormat("12345")).toBe(true);
    expect(isValidPinFormat("123")).toBe(false);
  });

  it("hashes the same pin to the same stable digest", async () => {
    const first = await hashBoothPin(" 4821 ");
    const second = await hashBoothPin("4821");
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifies against a stored hash and rejects other pins", async () => {
    const hash = await hashBoothPin("554433");
    await expect(verifyBoothPin("554433", hash)).resolves.toBe(true);
    await expect(verifyBoothPin("554434", hash)).resolves.toBe(false);
    await expect(verifyBoothPin("", hash)).resolves.toBe(false);
  });

  it("treats an empty stored hash as unlocked", async () => {
    await expect(verifyBoothPin("anything", "")).resolves.toBe(true);
  });
});
