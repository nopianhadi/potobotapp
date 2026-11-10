import { Aperture, ArrowLeft, KeyRound, Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../data/AuthContext";

type AuthMode = "signin" | "signup" | "recover" | "reset";

export default function AuthPage() {
  const { user, signIn, signUp, resetPassword, updatePassword } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(searchParams.get("mode") === "reset" ? "reset" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (user && mode === "signin") navigate("/", { replace: true });
  }, [mode, navigate, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "signin") {
        await signIn(email, password);
        navigate("/", { replace: true });
      } else if (mode === "signup") {
        const hasSession = await signUp(email, password);
        if (hasSession) navigate("/", { replace: true });
        else setNotice("Cek email untuk mengonfirmasi akun sebelum masuk.");
      } else if (mode === "recover") {
        await resetPassword(email);
        setNotice("Jika alamat itu terdaftar, tautan pemulihan akan dikirim melalui email.");
      } else {
        await updatePassword(password);
        setNotice("Kata sandi diperbarui. Kamu sekarang masuk ke workspace.");
        navigate("/", { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Permintaan autentikasi gagal. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" to="/auth" aria-label="Flashfold"><span><Aperture size={19} /></span><strong>flashfold</strong></Link>
        <div className="auth-heading"><p className="eyebrow">RUANG KERJA EVENT</p><h1>{mode === "signin" ? "Masuk ke Flashfold." : mode === "signup" ? "Buat ruang kerja." : mode === "recover" ? "Pulihkan akses." : "Kata sandi baru."}</h1><p>{mode === "signin" ? "Kelola event dan media di workspace kamu." : mode === "signup" ? "Satu akun untuk menyiapkan event dan mengelola hasil." : mode === "recover" ? "Kami akan kirim instruksi pemulihan jika email terdaftar." : "Gunakan kata sandi baru untuk melindungi akunmu."}</p></div>
        <form className="auth-form" onSubmit={submit}>
          {mode !== "reset" && <label className="field"><span>Email</span><span className="auth-input-wrap"><Mail size={16} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@contoh.com" required /></span></label>}
          {(mode === "signin" || mode === "signup" || mode === "reset") && <label className="field"><span>{mode === "reset" ? "Kata sandi baru" : "Kata sandi"}</span><span className="auth-input-wrap"><KeyRound size={16} /><input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} placeholder="Minimal 8 karakter" required /></span></label>}
          {error && <p className="auth-message auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-message auth-notice" role="status">{notice}</p>}
          <button type="submit" className="button button-primary auth-submit" disabled={busy}>{busy ? "Memproses…" : mode === "signin" ? "Masuk" : mode === "signup" ? "Buat akun" : mode === "recover" ? "Kirim tautan pemulihan" : "Perbarui kata sandi"}</button>
        </form>
        <div className="auth-links">
          {mode === "signin" && <><button type="button" onClick={() => { setError(""); setNotice(""); setMode("recover"); }}>Lupa kata sandi?</button><p>Belum punya akun? <button type="button" onClick={() => { setError(""); setNotice(""); setMode("signup"); }}>Daftar</button></p></>}
          {mode === "signup" && <p>Sudah punya akun? <button type="button" onClick={() => { setError(""); setNotice(""); setMode("signin"); }}>Masuk</button></p>}
          {(mode === "reset" || mode === "recover") && <button type="button" className="auth-back" onClick={() => { setError(""); setNotice(""); setMode("signin"); }}><ArrowLeft size={14} /> Kembali ke masuk</button>}
        </div>
        <p className="auth-privacy">Akun dan data workspace dikelola melalui koneksi terenkripsi. Kunci admin tidak pernah dikirim ke browser.</p>
      </section>
      <aside className="auth-aside" aria-label="Flashfold workspace"><div className="auth-aside-mark"><span>F</span><span>EVENT STUDIO</span></div><div><p className="eyebrow">MOMEN TERTATA</p><h2>Ruang untuk menyiapkan cerita acara.</h2><p>Atur booth, jalankan sesi, dan simpan hasil di satu tempat.</p></div><div className="auth-aside-index"><span>01 — SETUP</span><span>02 — CAPTURE</span><span>03 — GALLERY</span></div></aside>
    </main>
  );
}