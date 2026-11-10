import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { localRepository } from "./localRepository";
import type { AppRepository } from "./repository";
import { createSupabaseRepository } from "./supabaseRepository";
import type { BoothEvent } from "./types";

interface AppDataValue {
  events: BoothEvent[];
  ready: boolean;
  error: string | null;
  repository: AppRepository;
  dataMode: "local" | "cloud";
  refreshEvents: () => Promise<void>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { enabled, loading: authLoading, user, client } = useAuth();
  const repository = useMemo(
    () => enabled && user && client ? createSupabaseRepository(client) : localRepository,
    [client, enabled, user?.id],
  );
  const [events, setEvents] = useState<BoothEvent[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshEvents = async () => {
    if (authLoading || (enabled && !user)) return;
    try {
      setEvents(await repository.listEvents());
      setError(null);
    } catch {
      setError(enabled ? "Workspace cloud tidak dapat dimuat. Periksa koneksi dan kebijakan akses." : "Penyimpanan lokal tidak tersedia di browser ini.");
    }
  };

  useEffect(() => {
    let active = true;
    if (authLoading) {
      setReady(false);
      return () => { active = false; };
    }
    if (enabled && !user) {
      setEvents([]);
      setError(null);
      setReady(true);
      return () => { active = false; };
    }
    setReady(false);
    void repository.listEvents().then((result) => {
      if (active) {
        setEvents(result);
        setError(null);
      }
    }).catch(() => {
      if (active) setError(enabled ? "Workspace cloud tidak dapat dimuat. Periksa koneksi dan kebijakan akses." : "Penyimpanan lokal tidak tersedia di browser ini.");
    }).finally(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, [authLoading, enabled, repository, user?.id]);

  return (
    <AppDataContext.Provider value={{ events, ready, error, repository, dataMode: enabled ? "cloud" : "local", refreshEvents }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataValue {
  const context = useContext(AppDataContext);
  if (!context) {
    return {
      events: [],
      ready: true,
      error: null,
      repository: localRepository,
      dataMode: "local",
      refreshEvents: async () => undefined,
    };
  }
  return context;
}