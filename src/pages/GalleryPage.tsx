import { ArrowDownToLine, ArrowLeft, Camera, Download, Image, Pause, Play, Printer, QrCode, Search, Share2, SkipBack, SkipForward, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import TemplatePrintPreview from "../components/TemplatePrintPreview";
import { useAppData } from "../data/AppDataContext";
import { defaultEventSettings, normalizeEventSettings, type BoothEvent, type MediaItem, type PrintRecord } from "../data/types";
import { isPrintTemplate } from "../data/printTemplate";
import { createQrDataUrl } from "../lib/qrCode";

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mediaFilename(item: MediaItem) {
  const extension = item.type === "photo" ? "jpg" : item.type === "gif" ? "gif" : "webm";
  return `flashfold-${item.createdAt.slice(0, 10)}-${item.id.slice(0, 6)}.${extension}`;
}

function downloadMedia(item: MediaItem) {
  const url = URL.createObjectURL(item.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = mediaFilename(item);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function EventPicker({ events }: { events: BoothEvent[] }) {
  return <section className="event-picker-page"><Link to="/" className="back-link"><ArrowLeft size={16} /> Ruang kerja</Link><p className="eyebrow">GALERI EVENT</p><h1>Hasil dari event mana?</h1><p className="page-subtitle">Setiap galeri tersimpan bersama pengaturan event-nya.</p>{events.length ? <div className="picker-list">{events.map((event) => <Link key={event.id} className="picker-item" to={`/events/${event.id}/gallery`}><span className="picker-icon"><Image size={19} /></span><span><strong>{event.title}</strong><small>{event.date || "Tanpa tanggal"}</small></span><ArrowLeft className="picker-arrow" size={17} /></Link>)}</div> : <div className="empty-state"><h2>Belum ada event</h2><Link to="/events/new" className="button button-primary">Buat event</Link></div>}</section>;
}

function GalleryItem({ item, template, displayMode, stripSelected, stripSelectionFull, onToggleStripSelection, onOpen, onDownload, onDelete }: { item: MediaItem; template: BoothEvent["settings"]["printTemplate"]; displayMode: "original" | "template"; stripSelected: boolean; stripSelectionFull: boolean; onToggleStripSelection: (checked: boolean) => void; onOpen: () => void; onDownload: () => void; onDelete: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [item.blob]);
  return <article className="media-card">
    <button type="button" className="media-preview" onClick={onOpen} aria-label={`Buka ${item.type}, ${new Date(item.createdAt).toLocaleString("id-ID")}`}>
      {url && (item.type === "video" ? <video src={url} muted preload="metadata" /> : displayMode === "template" ? <div className="media-template-thumb"><TemplatePrintPreview template={template} photoUrl={url} variant="gallery" /></div> : <img src={url} alt={`${item.type === "gif" ? "GIF" : "Foto"} event`} />)}
      {item.type === "video" && <span className="media-type-label">VIDEO</span>}
      {item.type === "gif" && <span className="media-type-label">GIF</span>}
    </button>
    <div className="media-card-meta"><span>{new Date(item.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span><span>{formatBytes(item.size)}</span></div>
    <div className="media-card-actions">{item.type === "photo" && <label className="media-print-select"><input type="checkbox" aria-label={`Pilih ${stripSelected ? "hapus dari" : "untuk"} strip dua foto`} checked={stripSelected} disabled={!stripSelected && stripSelectionFull} onChange={(event) => onToggleStripSelection(event.target.checked)} /><span>Strip</span></label>}<button type="button" aria-label="Unduh media" onClick={onDownload}><Download size={15} /></button><button type="button" aria-label="Hapus media" onClick={onDelete}><Trash2 size={15} /></button></div>
  </article>;
}

function QrShareDialog({ event, onClose }: { event: BoothEvent; onClose: () => void }) {
  const payload = `${window.location.origin}/events/${event.id}/gallery`;
  const [dataUrl, setDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    try {
      setDataUrl(createQrDataUrl(payload, { modulePixels: 9, margin: 2, dark: "#0E1B16", light: "#FFFFFF" }));
    } catch {
      setDataUrl("");
    }
  }, [payload]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(closeEvent) => { if (closeEvent.target === closeEvent.currentTarget) onClose(); }}>
    <section className="qr-dialog" role="dialog" aria-modal="true" aria-label="QR galeri event">
      <header><div><p className="eyebrow">QR GALERI</p><strong>{event.title}</strong></div><button type="button" className="icon-button" onClick={onClose} aria-label="Tutup"><X size={18} /></button></header>
      <div className="qr-visual">{dataUrl ? <img src={dataUrl} alt={`QR menuju galeri ${event.title}`} /> : <p role="alert">QR tidak dapat dibuat di browser ini.</p>}</div>
      <p className="qr-payload-hint">Pindai QR untuk membuka galeri event ini di perangkat yang sama jaringan lokal dengan booth.</p>
      <div className="qr-actions">
        <button type="button" className="button button-secondary button-small" onClick={() => {
          void navigator.clipboard?.writeText(payload).then(() => setCopied(true)).catch(() => setCopied(false));
        }}>{copied ? "Tautan tersalin" : "Salin tautan"}</button>
      </div>
    </section>
  </div>;
}

function SlideshowOverlay({ items, intervalSeconds, onClose }: { items: MediaItem[]; intervalSeconds: number; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = items[index];
  const advance = useCallback((delta: number) => setIndex((currentIndex) => (currentIndex + delta + items.length) % items.length), [items.length]);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const timer = window.setInterval(() => advance(1), Math.max(3, intervalSeconds) * 1000);
    return () => window.clearInterval(timer);
  }, [advance, intervalSeconds, paused, items.length]);

  useEffect(() => {
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") onClose();
      if (keyEvent.key === "ArrowRight") advance(1);
      if (keyEvent.key === "ArrowLeft") advance(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, onClose]);

  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!current) return;
    const objectUrl = URL.createObjectURL(current.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [current]);

  if (!current) return null;
  return <section className="slideshow-overlay" role="dialog" aria-modal="true" aria-label="Slideshow galeri">
    <header>
      <span>{index + 1} / {items.length}</span>
      <div className="slideshow-controls">
        <button type="button" aria-label="Sebelumnya" onClick={() => advance(-1)}><SkipBack size={17} /></button>
        <button type="button" aria-label={paused ? "Lanjutkan slideshow" : "Jeda slideshow"} onClick={() => setPaused((currentPaused) => !currentPaused)}>{paused ? <Play size={17} /> : <Pause size={17} />}</button>
        <button type="button" aria-label="Berikutnya" onClick={() => advance(1)}><SkipForward size={17} /></button>
        <button type="button" aria-label="Tutup slideshow" onClick={onClose}><X size={18} /></button>
      </div>
    </header>
    <div className="slideshow-media">{url && (current.type === "video" ? <video src={url} controls autoPlay playsInline /> : <img src={url} alt={`Hasil ${index + 1} dari ${items.length}`} />)}</div>
    <footer><span>{new Date(current.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span><span>{formatBytes(current.size)}</span></footer>
  </section>;
}

export default function GalleryPage() {
  const { eventId } = useParams();
  const { events, repository } = useAppData();
  const event = events.find((item) => item.id === eventId);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [filter, setFilter] = useState("all");
  const [displayMode, setDisplayMode] = useState<"original" | "template">("original");
  const [stripPhotos, setStripPhotos] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [prints, setPrints] = useState<PrintRecord[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [slideshowOpen, setSlideshowOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!eventId) return;
    void repository.listMedia(eventId).then((result) => { if (active) setItems(result); }).catch(() => setNotice("Galeri belum dapat dibaca."));
    void repository.listPrints(eventId).then((result) => { if (active) setPrints(result); }).catch(() => undefined);
    return () => { active = false; };
  }, [eventId, repository]);

  const filteredItems = useMemo(() => items.filter((item) => {
    const matchesType = filter === "all" || item.type === filter;
    const matchesSearch = !search || new Date(item.createdAt).toLocaleString("id-ID").toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  }), [filter, items, search]);
  const canPreviewTemplate = filteredItems.some((item) => item.type !== "video");
  const activeDisplayMode = canPreviewTemplate ? displayMode : "original";
  const supportsTwoPhotoStrip = event?.settings.printTemplate.slots.some((slot) => slot.sourceIndex !== undefined) ?? false;
  const settings = event ? normalizeEventSettings(event.settings) : defaultEventSettings;
  const eventPrintCount = prints.reduce((total, print) => total + print.copies, 0);
  const printsBlockedEntirely = settings.maxPrintsPerEvent > 0 && eventPrintCount >= settings.maxPrintsPerEvent;

  function sessionPrintCount(media: MediaItem): number {
    return prints
      .filter((print) => {
        const related = items.find((item) => item.id === print.mediaId);
        return related !== undefined && related.sessionId === media.sessionId;
      })
      .reduce((total, print) => total + print.copies, 0);
  }

  function recordShareSafely(input: { mediaId: string | null; channel: "download" | "web_share" | "qr" }) {
    if (!event) return;
    void repository.recordShare({ eventId: event.id, ...input }).catch(() => undefined);
  }

  if (!eventId) return <EventPicker events={events} />;
  if (!event) return <section className="empty-state"><h2>Event tidak ditemukan</h2><Link to="/" className="button button-secondary">Kembali</Link></section>;

  async function deleteItem(item: MediaItem) {
    if (!window.confirm("Hapus hasil ini dari penyimpanan browser? Aksi ini tidak dapat dibatalkan.")) return;
    await repository.deleteMedia(item.id);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    setStripPhotos((current) => current.filter((entry) => entry.id !== item.id));
    if (selected?.id === item.id) setSelected(null);
    setNotice("Hasil dihapus dari browser ini.");
  }

  async function shareSelected(item: MediaItem) {
    const currentEvent = event;
    if (!currentEvent) return;
    const file = new File([item.blob], mediaFilename(item), { type: item.blob.type });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: currentEvent.title });
        recordShareSafely({ mediaId: item.id, channel: "web_share" });
        setNotice("Menu berbagi perangkat dibuka.");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setNotice("Berbagi tidak tersedia. Unduh media sebagai gantinya.");
      }
    } else {
      setNotice("Browser ini belum mendukung berbagi file. Unduh media untuk membagikannya.");
    }
  }

  function handleDownload(item: MediaItem) {
    downloadMedia(item);
    recordShareSafely({ mediaId: item.id, channel: "download" });
  }

  function printSelected(item: MediaItem, pairedItem?: MediaItem) {
    const currentEvent = event;
    if (!currentEvent) return;
    const printItems = pairedItem ? [item, pairedItem] : [item];
    if (printItems.some((entry) => entry.eventId !== currentEvent.id || entry.type !== "photo") || (pairedItem && pairedItem.id === item.id)) {
      setNotice("Pilih dua foto berbeda dari event ini untuk mencetak strip.");
      return;
    }
    const copies = pairedItem ? 2 : 1;
    if (settings.maxPrintsPerEvent > 0 && eventPrintCount + copies > settings.maxPrintsPerEvent) {
      setNotice(`Batas cetak event tercapai (${settings.maxPrintsPerEvent} lembar). Naikkan batas di pengaturan event untuk melanjutkan.`);
      return;
    }
    if (settings.maxPrintsPerSession > 0) {
      const overSessionLimit = printItems.some((entry) => sessionPrintCount(entry) + copies > settings.maxPrintsPerSession);
      if (overSessionLimit) {
        setNotice(`Sesi tamu ini sudah mencapai batas cetak ${settings.maxPrintsPerSession} lembar.`);
        return;
      }
    }
    const urls = printItems.map((entry) => URL.createObjectURL(entry.blob));
    const url = urls[0];
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      urls.forEach((entryUrl) => URL.revokeObjectURL(entryUrl));
      setNotice("Popup diblokir. Izinkan popup untuk membuka dialog cetak.");
      return;
    }
    const printDocument = printWindow.document;
    printDocument.title = currentEvent.title;
    const style = printDocument.createElement("style");
    const printTemplate = isPrintTemplate(settings.printTemplate) ? settings.printTemplate : defaultEventSettings.printTemplate;
    const paper = printTemplate.paperSize === "2x6" ? { width: "2in", height: "6in" } : { width: "4in", height: "6in" };
    style.textContent = `@page{size:${paper.width} ${paper.height};margin:0}*{box-sizing:border-box}html,body{margin:0;width:${paper.width};height:${paper.height}}body{display:grid;place-items:center;background:#fff}.print-sheet{position:relative;width:${paper.width};height:${paper.height};overflow:hidden;background:${printTemplate.backgroundColor}}.print-background{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.print-slot{position:absolute;overflow:hidden}.print-slot img{display:block;width:100%;height:100%;object-fit:cover}video{max-width:100%;max-height:100%;object-fit:contain}@media screen{body{width:100%;height:100vh}.print-sheet{max-width:100%;max-height:100vh}}`;
    printDocument.head.append(style);
    let printTriggered = false;
    const triggerPrint = () => {
      if (printTriggered || printWindow.closed) return;
      printTriggered = true;
      printWindow.focus();
      printWindow.print();
    };
    if (item.type === "video") {
      const video = printDocument.createElement("video");
      video.src = url;
      video.controls = true;
      printDocument.body.replaceChildren(video);
      video.addEventListener("loadeddata", triggerPrint, { once: true });
    } else {
      const sheet = printDocument.createElement("main");
      sheet.className = "print-sheet";
      if (printTemplate.backgroundImage) {
        const background = printDocument.createElement("img");
        background.className = "print-background";
        background.src = printTemplate.backgroundImage;
        background.alt = "";
        sheet.append(background);
      }
      for (const slot of printTemplate.slots) {
        const frame = printDocument.createElement("div");
        frame.className = "print-slot";
        frame.style.left = `${slot.x}%`;
        frame.style.top = `${slot.y}%`;
        frame.style.width = `${slot.width}%`;
        frame.style.height = `${slot.height}%`;
        const image = printDocument.createElement("img");
        image.src = urls[slot.sourceIndex ?? 0] ?? url;
        image.alt = `Foto ${slot.sourceIndex === 1 ? "B" : "A"} event ${currentEvent.title}`;
        frame.append(image);
        sheet.append(frame);
      }
      printDocument.body.replaceChildren(sheet);
      const images = Array.from(sheet.querySelectorAll("img"));
      void Promise.all(images.map((image) => image.decode().catch(() => undefined))).then(triggerPrint);
    }
    printWindow.addEventListener("afterprint", () => {
      printWindow.close();
      urls.forEach((entryUrl) => URL.revokeObjectURL(entryUrl));
    }, { once: true });
    window.setTimeout(() => { if (!printWindow.closed) triggerPrint(); }, 1200);
    void repository.recordPrint({ eventId: currentEvent.id, mediaId: item.id, copies })
      .then((record) => setPrints((current) => [record, ...current]))
      .catch(() => setNotice("Dialog cetak dibuka, tetapi catatan cetak tidak tersimpan."));
    setNotice(item.type === "video" ? "Dialog cetak dibuka di tab baru." : pairedItem ? "Dua strip identik sedang dicetak pada kertas 4 × 6 inci." : `Dialog cetak dibuka di tab baru. Foto akan dicetak pada ${printTemplate.slots.length} slot layout.`);
  }

  function toggleStripPhoto(item: MediaItem, checked: boolean) {
    setStripPhotos((current) => checked
      ? current.length < 2 && !current.some((entry) => entry.id === item.id) ? [...current, item] : current
      : current.filter((entry) => entry.id !== item.id));
  }

  function printSelectedStrip() {
    if (stripPhotos.length !== 2) return;
    printSelected(stripPhotos[0], stripPhotos[1]);
  }

  function openQr() {
    setQrOpen(true);
    recordShareSafely({ mediaId: null, channel: "qr" });
  }

  return (
    <div className="gallery-page">
      <div className="gallery-topline"><Link to="/" className="back-link"><ArrowLeft size={16} /> Semua event</Link><div className="gallery-event-links"><Link to={`/events/${event.id}/setup`}>Pengaturan</Link><Link to={`/events/${event.id}/insights`}>Aktivitas</Link></div></div>
      <section className="page-heading gallery-heading"><div><p className="eyebrow">GALERI EVENT</p><h1>{event.title}</h1><p className="page-subtitle">{event.date || "Tanggal belum ditentukan"} <span className="subtitle-divider">·</span> Disimpan di browser ini</p></div><div className="gallery-heading-actions">
        {event.settings.slideshowEnabled && filteredItems.length > 0 && <button type="button" className="button button-secondary" onClick={() => setSlideshowOpen(true)}><Play size={16} /> Slideshow</button>}
        <button type="button" className="button button-secondary" onClick={openQr}><QrCode size={16} /> QR galeri</button>
        <button type="button" className="button button-secondary" onClick={() => items.forEach(handleDownload)} disabled={!items.length}><ArrowDownToLine size={16} /> Unduh semua</button>
      </div></section>
      <section className="gallery-stats"><div><strong>{items.length}</strong><span>Hasil tersimpan</span></div><div><strong>{items.filter((item) => item.type === "photo").length}</strong><span>Foto</span></div><div><strong>{items.filter((item) => item.type === "gif").length}</strong><span>GIF</span></div><div><strong>{items.filter((item) => item.type === "video").length}</strong><span>Video</span></div>{settings.maxPrintsPerEvent > 0 && <div><strong>{eventPrintCount}/{settings.maxPrintsPerEvent}</strong><span>Lembar tercetak</span></div>}</section>
      <div className="gallery-toolbar"><div className="gallery-filters" role="group" aria-label="Filter jenis media">{[["all", "Semua"], ["photo", "Foto"], ["gif", "GIF"], ["video", "Video"]].map(([value, label]) => <button key={value} type="button" className={filter === value ? "is-active" : ""} onClick={() => { setFilter(value); if (value === "video") setDisplayMode("original"); }} aria-pressed={filter === value}>{label}</button>)}</div><div className="gallery-display-modes" role="group" aria-label="Versi gambar"><button type="button" aria-pressed={activeDisplayMode === "original"} onClick={() => setDisplayMode("original")}>Asli</button><button type="button" aria-pressed={activeDisplayMode === "template"} onClick={() => setDisplayMode("template")} disabled={!canPreviewTemplate}>Template</button></div><label className="search-field"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari berdasarkan waktu" aria-label="Cari hasil" /></label></div>
      {supportsTwoPhotoStrip && <div className="strip-print-bar"><span>{stripPhotos.length} dari 2 foto dipilih{printsBlockedEntirely ? " · batas cetak event tercapai" : ""}</span><button type="button" className="button button-secondary button-small" onClick={printSelectedStrip} disabled={stripPhotos.length !== 2 || printsBlockedEntirely}><Printer size={15} /> Cetak 2 foto × 2 strip</button></div>}
      {notice && <p className="inline-notice" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Tutup pesan"><X size={14} /></button></p>}
      {filteredItems.length ? <div className="media-grid">{filteredItems.map((item) => <GalleryItem key={item.id} item={item} template={event.settings.printTemplate} displayMode={activeDisplayMode === "template" && item.type !== "video" ? "template" : "original"} stripSelected={stripPhotos.some((entry) => entry.id === item.id)} stripSelectionFull={stripPhotos.length >= 2} onToggleStripSelection={(checked) => toggleStripPhoto(item, checked)} onOpen={() => setSelected(item)} onDownload={() => handleDownload(item)} onDelete={() => void deleteItem(item)} />)}</div> : <div className="empty-state gallery-empty"><span className="empty-illustration"><Image size={25} /></span><h2>{items.length ? "Tidak ada hasil pada filter ini" : "Galeri menunggu momen pertama"}</h2><p>{items.length ? "Coba ubah filter atau pencarian." : "Buka booth event ini untuk mengambil foto, GIF, atau video."}</p>{!items.length && <Link to={`/events/${event.id}/booth`} className="button button-primary"><Camera size={16} /> Buka booth</Link>}</div>}
      {selected && <MediaDialog key={selected.id} item={selected} event={event} initialDisplayMode={activeDisplayMode} onClose={() => setSelected(null)} onShare={() => void shareSelected(selected)} onPrint={() => printSelected(selected)} onDownload={() => handleDownload(selected)} onDelete={() => void deleteItem(selected)} />}
      {qrOpen && <QrShareDialog event={event} onClose={() => setQrOpen(false)} />}
      {slideshowOpen && filteredItems.length > 0 && <SlideshowOverlay items={filteredItems} intervalSeconds={event.settings.slideshowSeconds} onClose={() => setSlideshowOpen(false)} />}
    </div>
  );
}

function MediaDialog({ item, event, initialDisplayMode, onClose, onShare, onPrint, onDownload, onDelete }: { item: MediaItem; event: BoothEvent; initialDisplayMode: "original" | "template"; onClose: () => void; onShare: () => void; onPrint: () => void; onDownload: () => void; onDelete: () => void }) {
  const [url, setUrl] = useState("");
  const [displayMode, setDisplayMode] = useState(initialDisplayMode);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [item.blob]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="media-dialog" role="dialog" aria-modal="true" aria-label="Detail media"><header><div><p className="eyebrow">{event.title}</p><strong>{new Date(item.createdAt).toLocaleString("id-ID")}</strong></div><button type="button" className="icon-button" onClick={onClose} aria-label="Tutup"><X size={18} /></button></header>{item.type !== "video" && <div className="gallery-display-modes dialog-display-modes" role="group" aria-label="Versi gambar"><button type="button" aria-pressed={displayMode === "original"} onClick={() => setDisplayMode("original")}>Asli</button><button type="button" aria-pressed={displayMode === "template"} onClick={() => setDisplayMode("template")}>Template</button></div>}<div className="dialog-media">{url && (item.type === "video" ? <video src={url} controls autoPlay playsInline /> : displayMode === "template" ? <TemplatePrintPreview template={event.settings.printTemplate} photoUrl={url} variant="detail" /> : <img src={url} alt={`Media event ${event.title}`} />)}</div><footer><button type="button" className="button button-secondary" onClick={onShare}><Share2 size={16} /> Bagikan</button><button type="button" className="button button-secondary" onClick={onPrint}><Printer size={16} /> Cetak</button><button type="button" className="button button-primary" onClick={onDownload}><Download size={16} /> Unduh asli</button><button type="button" className="dialog-delete" onClick={onDelete}><Trash2 size={16} /> Hapus</button></footer></section></div>;
}
