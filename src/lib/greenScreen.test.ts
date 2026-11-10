import { describe, expect, it } from "vitest";
import { keyOutColor, parseHexColor } from "./greenScreen";

describe("parseHexColor", () => {
  it("reads rgb channels from a hex string", () => {
    expect(parseHexColor("#00B140")).toEqual({ r: 0, g: 177, b: 64 });
    expect(parseHexColor("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("falls back to chroma green for invalid input", () => {
    expect(parseHexColor("not-a-color")).toEqual({ r: 0, g: 177, b: 64 });
  });
});

describe("keyOutColor", () => {
  it("marks pixels within tolerance as transparent", () => {
    const data = new Uint8ClampedArray([
      0, 177, 64, 255,   // exact key color
      240, 240, 240, 255, // far from key
    ]);
    keyOutColor(data, { r: 0, g: 177, b: 64 }, 90);
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(255);
  });

  it("softens pixels near the tolerance edge", () => {
    // Distance from key is 90 while tolerance is 100: past the hard cutoff.
    const data = new Uint8ClampedArray([0, 177, 154, 255]);
    keyOutColor(data, { r: 0, g: 177, b: 64 }, 100);
    expect(data[3]).toBeLessThan(255);
    expect(data[3]).toBeGreaterThan(0);
  });

  it("leaves distant pixels untouched", () => {
    const original = [20, 40, 60, 220];
    const data = new Uint8ClampedArray(original);
    keyOutColor(data, { r: 0, g: 177, b: 64 }, 90);
    expect(Array.from(data)).toEqual(original);
  });
});
