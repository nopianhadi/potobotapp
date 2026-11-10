import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { describe, expect, it } from "vitest";

describe("GIF capture encoding", () => {
  it("encodes a frame sequence as a valid GIF file", () => {
    const firstFrame = new Uint8ClampedArray([
      255, 40, 30, 255, 30, 180, 90, 255,
      30, 90, 200, 255, 245, 220, 40, 255,
    ]);
    const secondFrame = new Uint8ClampedArray([
      30, 180, 90, 255, 255, 40, 30, 255,
      245, 220, 40, 255, 30, 90, 200, 255,
    ]);
    const palette = quantize(firstFrame, 16);
    const encoder = GIFEncoder();
    encoder.writeFrame(applyPalette(firstFrame, palette), 2, 2, { palette, delay: 180, repeat: 0 });
    encoder.writeFrame(applyPalette(secondFrame, palette), 2, 2, { palette, delay: 180, repeat: 0 });
    encoder.finish();

    const signature = new TextDecoder().decode(encoder.bytes().slice(0, 6));
    expect(signature).toMatch(/^GIF8[79]a$/);
    expect(encoder.bytes().byteLength).toBeGreaterThan(20);
  });
});