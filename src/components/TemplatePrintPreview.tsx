import type { PrintTemplate } from "../data/types";

export default function TemplatePrintPreview({ template, photoUrl, photoUrls, variant }: { template: PrintTemplate; photoUrl?: string; photoUrls?: string[]; variant?: "sidebar" | "review" | "gallery" | "detail" }) {
  return (
    <div className={`template-live-preview${template.paperSize === "2x6" ? " is-strip" : ""}${variant ? ` is-${variant}` : ""}`} style={{ backgroundColor: template.backgroundColor, backgroundImage: template.backgroundImage ? `url("${template.backgroundImage}")` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} role="img" aria-label={`Pratinjau layout cetak ${template.paperSize}, ${template.slots.length} slot foto`}>
      {template.slots.map((slot, index) => {
        const source = photoUrls?.[slot.sourceIndex ?? 0] ?? photoUrl;
        const photoNumber = slot.sourceIndex === undefined ? index + 1 : slot.sourceIndex + 1;
        return <span key={slot.id} className="template-live-slot" style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.width}%`, height: `${slot.height}%` }}>{source ? <img src={source} alt={`Foto ${photoNumber}`} /> : `Foto ${String.fromCharCode(64 + photoNumber)}`}</span>;
      })}
    </div>
  );
}