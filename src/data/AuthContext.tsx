import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, supabaseEnabled } from "./supabase";

interface AuthValue {
  enabled: boolean;
  loading: boolean;
  user: User | null;
  client: SupabaseClient | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(supabaseEnabled);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setUser(error ? null : data.session?.user ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error("Autentikasi cloud belum dikonfigurasi.");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string) {
    if (!supabase) throw new Error("Autentikasi cloud belum dikonfigurasi.");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth` },
    });
    if (error) throw error;
    return Boolean(data.session);
  }

  async function resetPassword(email: string) {
    if (!supabase) throw new Error("Autentikasi cloud belum dikonfigurasi.");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });
    if (error) throw error;
  }

  async function updatePassword(password: string) {
    if (!supabase) throw new Error("Autentikasi cloud belum dikonfigurasi.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ enabled: supabaseEnabled, loading, user, client: supabase, signIn, signUp, resetPassword, updatePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}