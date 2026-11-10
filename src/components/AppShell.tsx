import { Aperture, ArrowUpRight, Camera, ChartNoAxesColumn, Image, LayoutDashboard, Plus, Settings2 } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../data/AuthContext";
import { useAppData } from "../data/AppDataContext";

const navigation = [
  { to: "/", label: "Ringkasan", icon: LayoutDashboard, end: true },
  { to: "/booth", label: "Booth", icon: Camera },
  { to: "/gallery", label: "Galeri", icon: Image },
  { to: "/insights", label: "Aktivitas", icon: ChartNoAxesColumn },
];

function pageTitle(pathname: string) {
  if (pathname.includes("/setup") || pathname.endsWith("/new")) return "Pengaturan event";
  if (pathname.includes("/booth")) return "Booth";
  if (pathname.includes("/gallery")) return "Galeri event";
  if (pathname.includes("/insights")) return "Aktivitas";
  if (pathname.includes("/settings")) return "Preferensi";
  return "Ruang kerja";
}

export default function AppShell() {
  const { ready, error, dataMode } = useAppData();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!ready) {
    return <main className="app-loading" aria-label="Memuat Flashfold"><span className="loading-mark"><Aperture size={21} /></span><span>Menyiapkan ruang kerja</span></main>;
  }

  return (
    <div className="app-frame">
      <aside className="sidebar" aria-label="Navigasi ruang kerja">
        <NavLink className="brand-lockup" to="/">
          <span className="brand-mark"><Aperture size={19} strokeWidth={2.2} /></span>
          <span className="brand-name">flashfold</span>
          <span className="brand-edition">STUDIO</span>
        </NavLink>
        <div className="workspace-switcher">
          <span className="workspace-avatar">F</span>
          <span className="workspace-label"><strong>{user?.email?.split("@")[0] || "Ruang kerja saya"}</strong><small>{dataMode === "cloud" ? "Workspace cloud" : "Mode lokal"}</small></span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Navigasi utama">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Booth" && <span className="nav-link-dot" aria-label="kamera" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/settings" className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}>
            <Settings2 size={18} strokeWidth={1.8} /><span>Preferensi</span>
          </NavLink>
          <div className="local-note"><span className="local-dot" /><span>{dataMode === "cloud" ? "Data workspace di cloud" : "Data tersimpan di browser ini"}</span></div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb"><span>Flashfold</span><span className="breadcrumb-slash">/</span><strong>{pageTitle(location.pathname)}</strong></div>
          <div className="topbar-actions">
            <span className="local-status"><span className="local-dot" /> {dataMode === "cloud" ? "Cloud" : "Lokal"}</span>
            <button type="button" className="button button-primary button-small" onClick={() => navigate("/events/new")}>
              <Plus size={16} /> <span>Event baru</span>
            </button>
            <span className="profile-chip" aria-label="Profil ruang kerja">FF</span>
          </div>
        </header>
        {error && <div className="storage-alert" role="alert">{error}</div>}
        <main className="page-content"><Outlet /></main>
        <nav className="mobile-nav" aria-label="Navigasi bawah">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `mobile-nav-link${isActive ? " is-active" : ""}`}>
              <Icon size={19} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}