import { Camera, Check, HardDrive, Info, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppData } from "../data/AppDataContext";
import { useAuth } from "../data/AuthContext";
import { disconnectGoogleDrive, ensureGoogleDriveAccess, getGoogleDriveToken, syncEventToGoogleDrive } from "../lib/googleDrive";

export default function SettingsPage() {
  const { events, refreshEvents, repository, dataMode } = useAppData();
  const { user, signOut } = useAuth();
  const [cameraStatus, setCameraStatus] = useState("Belum diuji");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);
  const [driveConnected, setDriveConnected] = useState(Boolean(getGoogleDriveToken()));

  async function testCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("Browser tidak menyediakan akses kamera. Gunakan localhost atau HTTPS.");
      return;
    }
    setCameraStatus("Meminta izin kamera…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((track) => track.stop());
      setCameraStatus("Kamera siap digunakan.");
    } catch (error) {
      setCameraStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "Izin ditolak. Ubah izin kamera di browser." : "Kamera belum tersedia.");
    }
  }

  async function clearAllEvents() {
    const confirmation = dataMode === "cloud"
      ? "Hapus semua event dan media di workspace cloud ini? Aksi ini tidak dapat dibatalkan."
      : "Hapus semua event dan hasil dari browser ini? Data lokal tidak dapat dipulihkan.";
    if (!window.confirm(confirmation)) return;
    setWorking(true);
    try {
      await Promise.all(events.map((event) => repository.deleteEvent(event.id)));
      await refreshEvents();
      setNotice(dataMode === "cloud" ? "Semua event workspace telah dihapus." : "Semua data lokal telah dihapus.");
    } catch {
      setNotice("Sebagian data belum dapat dihapus.");
    } finally {
      setWorking(false);
    }
  }

  async function handleSignOut() {
    setWorking(true);
    try {
      await signOut();
    } catch {
      setNotice("Sesi belum dapat diakhiri. Coba lagi.");
    } finally {
      setWorking(false);
    }
  }

  async function connectGoogleDrive() {
    setWorking(true);
    try {
      await ensureGoogleDriveAccess();
      setDriveConnected(true);
      setNotice("Google Drive terhubung. Siap menyinkronkan event.");
    } catch (error) {
      setDriveConnected(false);
      setNotice(error instanceof Error ? error.message : "Google Drive belum dapat terhubung.");
    } finally {
      setWorking(false);
    }
  }

  async function syncAllEventsToGoogleDrive() {
    setWorking(true);
    try {
      await ensureGoogleDriveAccess();
      setDriveConnected(true);
      let synced = 0;
      for (const event of events) {
        const media = await repository.listMedia(event.id);
        const sessions = await repository.listSessions(event.id);
        await syncEventToGoogleDrive({
          event: {
            id: event.id,
            title: event.title,
            date: event.date,
            timezone: event.timezone,
            experience: event.experience,
            status: event.status,
            settings: event.settings as unknown as Record<string, unknown>,
          },
          media: media.map((item) => ({ ...item, blob: item.blob })),
          sessions: sessions.map((session) => ({ ...session })),
        });
        synced += 1;
      }
      setNotice(synced ? `${synced} event berhasil disinkronkan ke Google Drive.` : "Belum ada event untuk disinkronkan.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sinkronisasi Google Drive gagal.");
    } finally {
      setWorking(false);
    }
  }

  async function disconnectDrive() {
    setWorking(true);
    try {
      disconnectGoogleDrive();
      setDriveConnected(false);
      setNotice("Koneksi Google Drive dicabut.");
    } finally {
      setWorking(false);
    }
  }

  return <div className="settings-page">
    <section className="page-heading"><div><p className="eyebrow">PREFERENSI</p><h1>Ruang kerja kamu.</h1><p className="page-subtitle">Periksa kamera dan kelola data {dataMode === "cloud" ? "workspace" : "yang tersimpan di browser ini"}.</p></div></section>
    {notice && <p className="inline-notice" role="status">{notice}</p>}
    <section className="settings-section"><div className="settings-section-heading"><span className="settings-section-icon"><Camera size={18} /></span><div><h2>Perangkat booth</h2><p>Browser meminta izin hanya saat kamu mulai sesi.</p></div></div><div className="settings-row"><div><strong>Akses kamera</strong><small>{cameraStatus}</small></div><button type="button" className="button button-secondary button-small" onClick={() => void testCamera()}><Camera size={15} /> Uji kamera</button></div><div className="settings-row"><div><strong>Mode penyimpanan</strong><small>{dataMode === "cloud" ? "Data tersimpan di workspace cloud dan dibatasi oleh keanggotaan." : "Media tersimpan di IndexedDB pada browser/perangkat ini."}</small></div><span className="settings-value"><span className="local-dot" /> {dataMode === "cloud" ? "Cloud" : "Lokal"}</span></div></section>
    <section className="settings-section"><div className="settings-section-heading"><span className="settings-section-icon settings-icon-amber"><ShieldCheck size={18} /></span><div><h2>Privasi dan batasan</h2><p>Informasi penting sebelum menggunakan booth.</p></div></div><div className="settings-info-list"><p><Info size={15} /> {dataMode === "cloud" ? "Media diunggah ke bucket privat saat hasil disimpan; jangan simpan konten sensitif tanpa izin." : "Foto/video hanya disimpan di browser ini dan tidak diunggah."}</p><p><Info size={15} /> {dataMode === "cloud" ? "Workspace cloud dibatasi oleh keanggotaan akun melalui RLS." : "Mode lokal tidak memiliki akun, sinkronisasi, atau galeri publik."}</p><p><Info size={15} /> Berbagi memakai fitur browser bila tersedia; selain itu media perlu diunduh.</p><p><Info size={15} /> Hindari menyimpan data sensitif di perangkat bersama.</p></div></section>
    <section className="settings-section"><div className="settings-section-heading"><span className="settings-section-icon settings-icon-amber"><UploadCloud size={18} /></span><div><h2>Google Drive</h2><p>{driveConnected ? "Terhubung untuk sinkronisasi event." : "Belum terhubung."}</p></div></div><div className="settings-row"><div><strong>Sinkronisasi event</strong><small>Semua event dan media lokal akan dikirim ke folder Google Drive "Flashfold Events".</small></div>{driveConnected ? <button type="button" className="button button-secondary button-small" onClick={() => void syncAllEventsToGoogleDrive()} disabled={working}>Sinkron sekarang</button> : <button type="button" className="button button-secondary button-small" onClick={() => void connectGoogleDrive()} disabled={working}>Hubungkan Drive</button>}</div>{driveConnected && <div className="settings-row"><div><strong>Status koneksi</strong><small>Drive aktif, siap sinkronisasi.</small></div><button type="button" className="button button-quiet button-small" onClick={() => void disconnectDrive()} disabled={working}>Cabut</button></div>}</section>
    {user && <section className="settings-section"><div className="settings-section-heading"><span className="settings-section-icon"><ShieldCheck size={18} /></span><div><h2>Akun</h2><p>{user.email}</p></div></div><div className="settings-row"><div><strong>Akhiri semua sesi</strong><small>Akun ini akan keluar dari seluruh sesi Supabase.</small></div><button type="button" className="button button-secondary button-small" onClick={() => void handleSignOut()} disabled={working}>Keluar</button></div></section>}
    <section className="settings-section storage-section"><div className="settings-section-heading"><span className="settings-section-icon"><HardDrive size={18} /></span><div><h2>{dataMode === "cloud" ? "Data workspace" : "Data lokal"}</h2><p>{events.length} event {dataMode === "cloud" ? "tersimpan di workspace" : "tersimpan pada browser ini"}.</p></div></div><div className="settings-row"><div><strong>Hapus seluruh data</strong><small>{dataMode === "cloud" ? "Event dan seluruh media workspace akan dihapus." : "Event, sesi, dan media lokal akan dihapus."}</small></div><button type="button" className="button button-danger button-small" onClick={() => void clearAllEvents()} disabled={working || events.length === 0}><Trash2 size={15} /> {working ? "Menghapus…" : "Hapus data"}</button></div></section>
    <footer className="settings-footer"><span><Check size={14} /> Flashfold Studio · {dataMode === "cloud" ? "workspace cloud" : "prototipe lokal"}</span><Link to="/">Kembali ke ruang kerja</Link></footer>
  </div>;
}