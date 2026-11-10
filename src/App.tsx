import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import { AppDataProvider } from "./data/AppDataContext";
import { AuthProvider, useAuth } from "./data/AuthContext";
import AuthPage from "./pages/AuthPage";
import BoothPage from "./pages/BoothPage";
import EventEditorPage from "./pages/EventEditorPage";
import GalleryPage from "./pages/GalleryPage";
import InsightsPage from "./pages/InsightsPage";
import SettingsPage from "./pages/SettingsPage";
import WorkspacePage from "./pages/WorkspacePage";

function AppRouter() {
  const { enabled, loading, user } = useAuth();

  if (enabled && loading) return <main className="app-loading" aria-label="Memeriksa sesi">Memeriksa sesi…</main>;
  if (enabled && !user) {
    return <Routes><Route path="/auth" element={<AuthPage />} /><Route path="*" element={<Navigate to="/auth" replace />} /></Routes>;
  }

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<AppShell />}>
        <Route index element={<WorkspacePage />} />
        <Route path="events/new" element={<EventEditorPage />} />
        <Route path="events/:eventId/setup" element={<EventEditorPage />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="events/:eventId/gallery" element={<GalleryPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="events/:eventId/insights" element={<InsightsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="booth" element={<BoothPage />} />
      <Route path="events/:eventId/booth" element={<BoothPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <AppRouter />
      </AppDataProvider>
    </AuthProvider>
  );
}