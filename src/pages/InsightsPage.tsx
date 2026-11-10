import { ArrowDownToLine, ArrowLeft, ArrowUpRight, Camera, Image, Layers3, Printer, QrCode, Share2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAppData } from "../data/AppDataContext";
import type { BoothEvent, PrintRecord, SavedSession, ShareRecord } from "../data/types";

function EventPicker({ events }: { events: BoothEvent[] }) {
  return <section className="event-picker-page"><Link to="/" className="back-link"><ArrowLeft size={16} /> Ruang kerja</Link><p className="eyebrow">AKTIVITAS EVENT</p><h1>Pilih event untuk ditinjau</h1><p className="page-subtitle">Ringkasan sesi dan hasil yang tersimpan secara lokal.</p><div className="picker-list">{events.map((event) => <Link key={event.id} className="picker-item" to={`/events/${event.id}/insights`}><span className="picker-icon"><Layers3 size={19} /></span><span><strong>{event.title}</strong><small>{event.date || "Tanpa tanggal"}</small></span><ArrowUpRight className="picker-arrow" size={17} /></Link>)}</div></section>;
}

function sessionModeLabel(mode: SavedSession["mode"]) {
  if (mode === "photo") return "Sesi foto";
  if (mode === "gif") return "Sesi GIF";
  if (mode === "boomerang") return "Sesi boomerang";
  if (mode === "360") return "Sesi 360";
  return "Sesi video";
}

export default function InsightsPage() {
  const { eventId } = useParams();
  const { events, repository } = useAppData();
  const event = events.find((item) => item.id === eventId);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [mediaCount, setMediaCount] = useState(0);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [prints, setPrints] = useState<PrintRecord[]>([]);

  useEffect(() => {
    let active = true;
    if (!eventId) return;
    void Promise.all([
      repository.listSessions(eventId),
      repository.countMedia(eventId),
      repository.listShares(eventId).catch(() => [] as ShareRecord[]),
      repository.listPrints(eventId).catch(() => [] as PrintRecord[]),
    ]).then(([nextSessions, nextMediaCount, nextShares, nextPrints]) => {
      if (active) {
        setSessions(nextSessions);
        setMediaCount(nextMediaCount);
        setShares(nextShares);
        setPrints(nextPrints);
      }
    });
    return () => { active = false; };
  }, [eventId, repository]);

  if (!eventId) return <EventPicker events={events} />;
  if (!event) return <section className="empty-state"><h2>Event tidak ditemukan</h2><Link to="/" className="button button-secondary">Kembali</Link></section>;

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, label: new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(date), count: sessions.filter((session) => session.completedAt.slice(0, 10) === key).length };
  });
  const maxCount = Math.max(1, ...days.map((day) => day.count));
  const latest = sessions.slice(0, 6);
  const printCount = prints.reduce((total, print) => total + print.copies, 0);
  const shareChannels: { key: ShareRecord["channel"]; label: string; icon: typeof Share2 }[] = [
    { key: "download", label: "Unduhan", icon: ArrowDownToLine },
    { key: "web_share", label: "Berbagi perangkat", icon: Share2 },
    { key: "qr", label: "QR galeri", icon: QrCode },
  ];

  return <div className="insights-page">
    <div className="gallery-topline"><Link to="/" className="back-link"><ArrowLeft size={16} /> Semua event</Link><Link to={`/events/${event.id}/gallery`} className="text-action">Lihat galeri <ArrowUpRight size={15} /></Link></div>
    <section className="page-heading"><div><p className="eyebrow">RINGKASAN EVENT</p><h1>{event.title}</h1><p className="page-subtitle">Aktivitas tersimpan di browser ini; tidak disinkronkan ke cloud.</p></div></section>
    <div className="insight-metrics"><div className="insight-metric"><span className="summary-icon summary-icon-coral"><Users size={18} /></span><strong>{sessions.length}</strong><span>Sesi selesai</span></div><div className="insight-metric"><span className="summary-icon summary-icon-lime"><Image size={18} /></span><strong>{mediaCount}</strong><span>Media dibuat</span></div><div className="insight-metric"><span className="summary-icon summary-icon-green"><Camera size={18} /></span><strong>{sessions.filter((session) => session.consent === true).length}</strong><span>Consent diberikan</span></div><div className="insight-metric"><span className="summary-icon summary-icon-green"><Printer size={18} /></span><strong>{printCount}</strong><span>Lembar tercetak</span></div><div className="insight-metric"><span className="summary-icon summary-icon-coral"><Share2 size={18} /></span><strong>{shares.length}</strong><span>Aksi berbagi</span></div></div>
    <div className="insights-grid"><section className="chart-section"><div className="section-heading"><div><p className="eyebrow">7 HARI TERAKHIR</p><h2>Sesi per hari</h2></div><span className="chart-total">{sessions.length} total</span></div><div className="bar-chart" role="img" aria-label="Jumlah sesi selesai dalam tujuh hari terakhir">{days.map((day) => <div key={day.key} className="bar-column"><span className="bar-value">{day.count || ""}</span><div className="bar-track"><span style={{ height: `${Math.max(day.count ? 16 : 4, day.count / maxCount * 100)}%` }} /></div><small>{day.label}</small></div>)}</div></section>
      <section className="recent-section"><div className="section-heading"><div><p className="eyebrow">SESI TERBARU</p><h2>Aktivitas</h2></div><span className="recent-icon"><Layers3 size={17} /></span></div>{latest.length ? <div className="activity-list">{latest.map((session) => <div className="activity-row" key={session.id}><span className="activity-dot" /><div><strong>{sessionModeLabel(session.mode)}</strong><small>{new Date(session.completedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small></div><span className="activity-count">1 media</span></div>)}</div> : <div className="activity-empty"><p>Belum ada aktivitas.</p><Link to={`/events/${event.id}/booth`}>Mulai sesi booth <ArrowUpRight size={14} /></Link></div>}</section></div>
    <section className="insights-share-section"><div className="section-heading"><div><p className="eyebrow">PENGGUNAAN HASIL</p><h2>Saluran berbagi</h2></div><span className="chart-total">{shares.length} aksi</span></div><div className="share-channel-grid">{shareChannels.map(({ key, label, icon: ChannelIcon }) => <div key={key} className="share-channel-card"><span><ChannelIcon size={17} /></span><strong>{shares.filter((share) => share.channel === key).length}</strong><span>{label}</span></div>)}</div></section>
  </div>;
}
