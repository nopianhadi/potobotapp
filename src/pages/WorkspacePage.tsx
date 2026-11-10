import { ArrowRight, CalendarDays, Camera, Image, Plus, Sparkles } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useAppData } from "../data/AppDataContext";
import type { BoothEvent } from "../data/types";

const modeNames: Record<string, string> = { photo: "Foto", gif: "GIF", video: "Video", "360": "360 / gerak lambat" };

function dateLabel(value: string) {
  if (!value) return "Tanggal belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function EventCard({ event, count }: { event: BoothEvent; count: number }) {
  const statusLabel = { draft: "Draft", ready: "Siap", active: "Berjalan", completed: "Selesai", archived: "Diarsipkan" }[event.status];
  return (
    <article className="event-card">
      <Link to={`/events/${event.id}/setup`} className="event-cover" style={{ "--event-accent": event.settings.accentColor } as CSSProperties} aria-label={`Atur event ${event.title}`}>
        <span className="cover-kicker">FLASHFOLD EVENT</span>
        <span className={`cover-layout cover-layout-${event.settings.layout}`} aria-hidden="true"><i /><i /><i /></span>
        <span className="cover-title">{event.title}</span>
        <span className="cover-date">{dateLabel(event.date)}</span>
        <span className="cover-stamp"><Sparkles size={14} /></span>
      </Link>
      <div className="event-card-body">
        <div className="event-card-heading">
          <div><h3>{event.title}</h3><p><CalendarDays size={14} /> {dateLabel(event.date)}</p></div>
          <span className={`status-pill status-${event.status}`}><span />{statusLabel}</span>
        </div>
        <div className="event-card-meta">
          <span><Camera size={14} /> {event.settings.enabledModes.map((mode) => modeNames[mode]).join(" · ") || "Tanpa mode"}</span>
          <span><Image size={14} /> {count} hasil</span>
        </div>
        <div className="event-card-actions">
          <Link className="text-action" to={`/events/${event.id}/booth`}>Buka booth <ArrowRight size={15} /></Link>
          <Link className="text-action text-action-muted" to={`/events/${event.id}/gallery`}>Galeri</Link>
        </div>
      </div>
    </article>
  );
}

export default function WorkspacePage() {
  const { events, repository } = useAppData();
  const [mediaCounts, setMediaCounts] = useState<Record<string, number>>({});
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all(events.map(async (event) => ({ eventId: event.id, media: await repository.countMedia(event.id), sessions: await repository.listSessions(event.id) })))
      .then((results) => {
        if (!active) return;
        setMediaCounts(Object.fromEntries(results.map((result) => [result.eventId, result.media])));
        setSessions(results.reduce((total, result) => total + result.sessions.length, 0));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [events, repository]);

  const totalMedia = Object.values(mediaCounts).reduce((total, count) => total + count, 0);
  const upcoming = events.filter((event) => event.date && event.date >= new Date().toISOString().slice(0, 10)).length;

  return (
    <div className="workspace-page">
      <section className="page-heading workspace-heading">
        <div><p className="eyebrow">RUANG KERJA</p><h1>Semua momen, <span>satu tempat.</span></h1><p className="page-subtitle">Siapkan booth, jalankan sesi, lalu temukan setiap hasil di sini.</p></div>
        <Link to="/events/new" className="button button-primary"><Plus size={17} /> Buat event</Link>
      </section>

      <section className="summary-strip" aria-label="Ringkasan ruang kerja">
        <div className="summary-item"><span className="summary-icon summary-icon-green"><CalendarDays size={17} /></span><div><strong>{events.length}</strong><span>Event tersimpan</span></div></div>
        <div className="summary-item"><span className="summary-icon summary-icon-coral"><Camera size={17} /></span><div><strong>{sessions}</strong><span>Sesi booth</span></div></div>
        <div className="summary-item"><span className="summary-icon summary-icon-lime"><Image size={17} /></span><div><strong>{totalMedia}</strong><span>Hasil media</span></div></div>
        <div className="summary-item summary-item-last"><span className="summary-icon summary-icon-ink"><Sparkles size={17} /></span><div><strong>{upcoming}</strong><span>Event mendatang</span></div></div>
      </section>

      <section className="event-section">
        <div className="section-heading"><div><p className="eyebrow">DASHBOARD</p><h2>Event kamu</h2></div><Link to="/events/new" className="button button-secondary button-small"><Plus size={16} /> Event baru</Link></div>
        {events.length ? (
          <div className="event-grid">{events.map((event) => <EventCard key={event.id} event={event} count={mediaCounts[event.id] ?? 0} />)}</div>
        ) : (
          <div className="empty-state empty-events"><span className="empty-illustration"><Camera size={26} /></span><h2>Mulai dari event pertama</h2><p>Buat pengaturan booth sekali, lalu gunakan untuk setiap sesi.</p><Link to="/events/new" className="button button-primary"><Plus size={17} /> Buat event</Link></div>
        )}
      </section>

      <section className="workflow-band">
        <div className="workflow-mark"><span>01</span><span>02</span><span>03</span></div>
        <div className="workflow-copy"><p className="eyebrow">ALUR KERJA</p><h2>Siap sebelum tamu datang.</h2><p>Buat event, cek tampilan booth, dan semua hasil tersusun di galeri event.</p></div>
        <div className="workflow-links"><Link to="/events/new">Atur event <ArrowRight size={15} /></Link><Link to="/booth">Pilih booth <ArrowRight size={15} /></Link><Link to="/gallery">Buka galeri <ArrowRight size={15} /></Link></div>
      </section>
    </div>
  );
}