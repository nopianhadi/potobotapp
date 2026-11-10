import type { PrintPhotoSlot, PrintTemplate } from "./types";

export const printTemplatePresets: Array<{ id: string; label: string; template: PrintTemplate }> = [
  {
    id: "portrait-single",
    label: "Foto tunggal",
    template: { paperSize: "4x6", backgroundColor: "#FFFFFF", backgroundImage: "", slots: [{ id: "photo-1", x: 8, y: 8, width: 84, height: 84 }] },
  },
  {
    id: "portrait-double",
    label: "Dua bingkai",
    template: { paperSize: "4x6", backgroundColor: "#FFFFFF", backgroundImage: "", slots: [
      { id: "photo-1", x: 8, y: 8, width: 84, height: 40 },
      { id: "photo-2", x: 8, y: 52, width: 84, height: 40 },
    ] },
  },
  {
    id: "photo-strip",
    label: "Strip tiga foto",
    template: { paperSize: "2x6", backgroundColor: "#FFFFFF", backgroundImage: "", slots: [
      { id: "photo-1", x: 10, y: 4, width: 80, height: 28 },
      { id: "photo-2", x: 10, y: 36, width: 80, height: 28 },
      { id: "photo-3", x: 10, y: 68, width: 80, height: 28 },
    ] },
  },
  {
    id: "double-photo-strip",
    label: "2 foto × 2 strip",
    template: { paperSize: "4x6", backgroundColor: "#FFFFFF", backgroundImage: "", slots: [
      { id: "strip-a-photo-1", x: 4, y: 4, width: 43, height: 44, sourceIndex: 0 },
      { id: "strip-a-photo-2", x: 4, y: 52, width: 43, height: 44, sourceIndex: 1 },
      { id: "strip-b-photo-1", x: 53, y: 4, width: 43, height: 44, sourceIndex: 0 },
      { id: "strip-b-photo-2", x: 53, y: 52, width: 43, height: 44, sourceIndex: 1 },
    ] },
  },
];

export function isPrintTemplate(value: unknown): value is PrintTemplate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const template = value as Partial<PrintTemplate>;
  if (template.paperSize !== "4x6" && template.paperSize !== "2x6") return false;
  if (typeof template.backgroundColor !== "string" || !/^#[\da-fA-F]{6}$/.test(template.backgroundColor)) return false;
  if (template.backgroundImage !== undefined && (typeof template.backgroundImage !== "string"
    || (template.backgroundImage !== "" && (!/^data:image\/(?:png|jpeg|webp);base64,/.test(template.backgroundImage) || template.backgroundImage.length > 4_250_000)))) return false;
  if (!Array.isArray(template.slots) || template.slots.length < 1 || template.slots.length > 12) return false;

  const ids = new Set<string>();
  return template.slots.every((slot) => {
    if (!slot || typeof slot.id !== "string" || !slot.id || ids.has(slot.id)) return false;
    ids.add(slot.id);
    return [slot.x, slot.y, slot.width, slot.height].every((value) => typeof value === "number" && Number.isFinite(value))
      && slot.x >= 0 && slot.y >= 0 && slot.width >= 8 && slot.height >= 8
      && slot.x + slot.width <= 100 && slot.y + slot.height <= 100
      && (slot.sourceIndex === undefined || slot.sourceIndex === 0 || slot.sourceIndex === 1);
  });
}

export function copyPrintTemplate(template: PrintTemplate): PrintTemplate {
  return structuredClone(template);
}

export function movePhotoSlot(template: PrintTemplate, id: string, deltaX: number, deltaY: number): PrintTemplate {
  return {
    ...template,
    slots: template.slots.map((slot) => slot.id === id ? {
      ...slot,
      x: clamp(slot.x + deltaX, 0, 100 - slot.width),
      y: clamp(slot.y + deltaY, 0, 100 - slot.height),
    } : slot),
  };
}

export function resizePhotoSlot(template: PrintTemplate, id: string, deltaWidth: number, deltaHeight: number): PrintTemplate {
  return {
    ...template,
    slots: template.slots.map((slot) => slot.id === id ? {
      ...slot,
      width: clamp(slot.width + deltaWidth, 8, 100 - slot.x),
      height: clamp(slot.height + deltaHeight, 8, 100 - slot.y),
    } : slot),
  };
}

export function addPhotoSlot(template: PrintTemplate): PrintTemplate {
  const index = template.slots.length + 1;
  const slot: PrintPhotoSlot = {
    id: globalThis.crypto?.randomUUID?.() ?? `photo-${Date.now()}`,
    x: 8,
    y: Math.min(8 + template.slots.length * 5, 68),
    width: 84,
    height: template.paperSize === "2x6" ? 22 : 32,
  };
  return { ...template, slots: [...template.slots, { ...slot, id: slot.id || `photo-${index}` }] };
}

export function removePhotoSlot(template: PrintTemplate, id: string): PrintTemplate {
  const slots = template.slots.filter((slot) => slot.id !== id);
  return slots.length ? { ...template, slots } : template;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}