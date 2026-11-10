import { describe, expect, it } from "vitest";
import { addPhotoSlot, isPrintTemplate, movePhotoSlot, printTemplatePresets, resizePhotoSlot } from "./printTemplate";

describe("print templates", () => {
  it("provides valid original print presets", () => {
    expect(printTemplatePresets.every((preset) => isPrintTemplate(preset.template))).toBe(true);
  });

  it("maps two photos into two identical side-by-side strips", () => {
    const preset = printTemplatePresets.find((item) => item.id === "double-photo-strip");

    expect(preset?.template).toMatchObject({
      paperSize: "4x6",
      slots: [
        { sourceIndex: 0, x: 4 },
        { sourceIndex: 1, x: 4 },
        { sourceIndex: 0, x: 53 },
        { sourceIndex: 1, x: 53 },
      ],
    });
    expect(isPrintTemplate({ ...preset?.template, slots: [{ ...preset?.template.slots[0], sourceIndex: 2 }] })).toBe(false);
  });

  it("accepts image data URLs and rejects unsupported background sources", () => {
    const template = printTemplatePresets[0].template;
    expect(isPrintTemplate({ ...template, backgroundImage: "data:image/png;base64,AAAA" })).toBe(true);
    expect(isPrintTemplate({ ...template, backgroundImage: "https://example.com/image.png" })).toBe(false);
  });

  it("keeps moved and resized photo slots inside the paper", () => {
    const template = printTemplatePresets[0].template;
    const moved = movePhotoSlot(template, "photo-1", 50, 50);
    const resized = resizePhotoSlot(moved, "photo-1", 50, 50);

    expect(resized.slots[0]).toMatchObject({ x: 16, y: 16, width: 84, height: 84 });
    expect(isPrintTemplate(resized)).toBe(true);
    expect(isPrintTemplate({ ...template, slots: [{ ...template.slots[0], x: 101 }] })).toBe(false);
  });

  it("adds a photo slot without mutating its preset", () => {
    const template = printTemplatePresets[0].template;
    const updated = addPhotoSlot(template);

    expect(updated.slots).toHaveLength(2);
    expect(template.slots).toHaveLength(1);
  });
});