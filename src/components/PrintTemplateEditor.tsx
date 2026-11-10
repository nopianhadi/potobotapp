import { CopyPlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from "react";
import { addPhotoSlot, copyPrintTemplate, movePhotoSlot, printTemplatePresets, removePhotoSlot, resizePhotoSlot } from "../data/printTemplate";
import type { PrintPhotoSlot, PrintTemplate } from "../data/types";

interface PrintTemplateEditorProps {
  value: PrintTemplate;
  onChange: (template: PrintTemplate) => void;
  onBusyChange: (busy: boolean) => void;
}

interface ActiveDrag {
  slot: PrintPhotoSlot;
  mode: "move" | "resize";
  startX: number;
  startY: number;
}

const maxBackgroundBytes = 3 * 1024 * 1024;
const allowedBackgroundTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export default function PrintTemplateEditor({ value, onChange, onBusyChange }: PrintTemplateEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const activeDrag = useRef<ActiveDrag | null>(null);
  const [selectedId, setSelectedId] = useState(value.slots[0]?.id ?? "");
  const [backgroundError, setBackgroundError] = useState("");
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const selectedSlot = value.slots.find((slot) => slot.id === selectedId);

  useEffect(() => {
    if (!selectedSlot) setSelectedId(value.slots[0]?.id ?? "");
  }, [selectedId, selectedSlot, value.slots]);

  function startDrag(event: PointerEvent<HTMLElement>, slot: PrintPhotoSlot, mode: ActiveDrag["mode"]) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    activeDrag.current = { slot, mode, startX: event.clientX, startY: event.clientY };
    setSelectedId(slot.id);
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    const drag = activeDrag.current;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!drag || !bounds?.width || !bounds.height) return;
    const deltaX = (event.clientX - drag.startX) / bounds.width * 100;
    const deltaY = (event.clientY - drag.startY) / bounds.height * 100;
    const base = { ...value, slots: value.slots.map((slot) => slot.id === drag.slot.id ? drag.slot : slot) };
    onChange(drag.mode === "move"
      ? movePhotoSlot(base, drag.slot.id, deltaX, deltaY)
      : resizePhotoSlot(base, drag.slot.id, deltaX, deltaY));
  }

  function finishDrag() {
    activeDrag.current = null;
  }

  function handleSlotKeyDown(event: KeyboardEvent<HTMLDivElement>, slot: PrintPhotoSlot) {
    const delta = event.shiftKey ? 2 : 1;
    let updated = value;
    if (event.key === "ArrowLeft") updated = event.shiftKey ? resizePhotoSlot(value, slot.id, -delta, 0) : movePhotoSlot(value, slot.id, -delta, 0);
    else if (event.key === "ArrowRight") updated = event.shiftKey ? resizePhotoSlot(value, slot.id, delta, 0) : movePhotoSlot(value, slot.id, delta, 0);
    else if (event.key === "ArrowUp") updated = event.shiftKey ? resizePhotoSlot(value, slot.id, 0, -delta) : movePhotoSlot(value, slot.id, 0, -delta);
    else if (event.key === "ArrowDown") updated = event.shiftKey ? resizePhotoSlot(value, slot.id, 0, delta) : movePhotoSlot(value, slot.id, 0, delta);
    else return;
    event.preventDefault();
    setSelectedId(slot.id);
    onChange(updated);
  }

  function choosePreset(template: PrintTemplate) {
    const next = copyPrintTemplate(template);
    onChange(next);
    setSelectedId(next.slots[0].id);
  }

  function addSlot() {
    const next = addPhotoSlot(value);
    onChange(next);
    setSelectedId(next.slots.at(-1)?.id ?? "");
  }

  function deleteSelectedSlot() {
    if (!selectedSlot || value.slots.length < 2) return;
    const next = removePhotoSlot(value, selectedSlot.id);
    onChange(next);
    setSelectedId(next.slots[0]?.id ?? "");
  }

  async function uploadBackground(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!allowedBackgroundTypes.has(file.type) || file.size > maxBackgroundBytes) {
      setBackgroundError("Gunakan PNG, JPG, atau WebP hingga 3 MB.");
      event.target.value = "";
      return;
    }
    setBackgroundUploading(true);
    onBusyChange(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Format gambar tidak dapat dibaca."));
        reader.onerror = () => reject(new Error("Gambar tidak dapat dibaca."));
        reader.readAsDataURL(file);
      });
      onChange({ ...value, backgroundImage: dataUrl });
      setBackgroundError("");
    } catch {
      setBackgroundError("Gambar tidak dapat dibaca.");
    } finally {
      setBackgroundUploading(false);
      onBusyChange(false);
      event.target.value = "";
    }
  }

  return (
    <div className="print-template-editor">
      <div className="template-preset-list" role="group" aria-label="Preset layout cetak">
        {printTemplatePresets.map((preset) => <button key={preset.id} type="button" className="button button-secondary button-small" onClick={() => choosePreset(preset.template)}>{preset.label}</button>)}
      </div>
      <div className="template-controls">
        <label className="field"><span>Ukuran kertas</span><select value={value.paperSize} onChange={(event) => onChange({ ...value, paperSize: event.target.value as PrintTemplate["paperSize"] })}><option value="4x6">4 × 6 inci</option><option value="2x6">2 × 6 inci</option></select></label>
        <label className="field template-paper-color"><span>Warna kertas</span><input type="color" value={value.backgroundColor} onChange={(event) => onChange({ ...value, backgroundColor: event.target.value.toUpperCase() })} /></label>
        <div className="template-slot-actions"><button type="button" className="button button-secondary button-small" onClick={addSlot} disabled={value.slots.length >= 12}><CopyPlus size={14} /> Tambah foto</button><button type="button" className="icon-button" onClick={deleteSelectedSlot} disabled={!selectedSlot || value.slots.length < 2} aria-label="Hapus slot foto terpilih" title="Hapus slot foto"><Trash2 size={15} /></button><span>{value.slots.length} slot</span></div>
      </div>
      <div className="template-background-row">
        <label className="field"><span>Gambar latar</span><input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={(event) => void uploadBackground(event)} disabled={backgroundUploading} /><small>PNG, JPG, atau WebP · Maksimal 3 MB</small></label>
        {value.backgroundImage && <div className="template-background-preview" role="group" aria-label="Pratinjau gambar latar" style={{ backgroundImage: `url("${value.backgroundImage}")` }}><button type="button" className="icon-button" onClick={() => onChange({ ...value, backgroundImage: "" })} aria-label="Hapus gambar latar" title="Hapus gambar latar"><Trash2 size={14} /></button></div>}
        {backgroundError && <p className="form-error" role="alert">{backgroundError}</p>}
      </div>
        <p className="template-print-note">Cetak akan mengulang foto terpilih pada setiap slot.</p>
      <div className="template-canvas-wrap">
        <div ref={canvasRef} className={`template-canvas${value.paperSize === "2x6" ? " is-strip" : ""}`} style={{ backgroundColor: value.backgroundColor, backgroundImage: value.backgroundImage ? `url("${value.backgroundImage}")` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} role="group" aria-label="Pratinjau layout foto">
            {value.slots.map((slot, index) => {
              const photoNumber = slot.sourceIndex === undefined ? index + 1 : slot.sourceIndex + 1;
              return <div key={slot.id} className={`template-photo-slot${slot.id === selectedId ? " is-selected" : ""}`} role="group" tabIndex={0} aria-label={`Slot foto ${String.fromCharCode(64 + photoNumber)}`} style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.width}%`, height: `${slot.height}%` }} onPointerDown={(event) => startDrag(event, slot, "move")} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onKeyDown={(event) => handleSlotKeyDown(event, slot)} onFocus={() => setSelectedId(slot.id)}>
                <span>Foto {String.fromCharCode(64 + photoNumber)}</span><span className="template-resize-handle" aria-hidden="true" onPointerDown={(event) => startDrag(event, slot, "resize")} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} />
              </div>;
            })}
        </div>
      </div>
    </div>
  );
}