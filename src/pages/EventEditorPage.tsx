import { ArrowLeft, ArrowDown, ArrowUp, Check, ChevronRight, CircleCheck, Copy, FileText, Lock, Monitor, Palette, Plus, Printer, Save, Sparkles, Trash2, Upload, Wand2 } from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PrintTemplateEditor from "../components/PrintTemplateEditor";
import TemplatePrintPreview from "../components/TemplatePrintPreview";
import { useAppData } from "../data/AppDataContext";
import { applyBoothTemplateMarkdown, createBoothTemplateMarkdown } from "../data/boothTemplate";
import { defaultEventSettings, makeQuestionId, normalizeEventSettings, type BoothEvent, type CaptureMode, type EventSettings, type SurveyQuestion } from "../data/types";
import { hashBoothPin, isValidPinFormat } from "../lib/pin";

const modes: { id: CaptureMode; title: string; detail: string; icon: string }[] = [
  { id: "photo", title: "Foto", detail: "Potret dan strip foto", icon: "◉" },
  { id: "gif", title: "GIF", detail: "Animasi singkat", icon: "↻" },
  { id: "boomerang", title: "Boomerang", detail: "Geri maju berulang", icon: "⇄" },
  { id: "video", title: "Video", detail: "Pesan dan momen bergerak", icon: "▶" },
  { id: "360", title: "360 / Slow-mo", detail: "Rekaman berputar", icon: "⟳" },
];
const swatches = ["#246A5A", "#B33D2F", "#3B5E8B", "#71513F", "#8A4F69"];

function newDraft(): Omit<BoothEvent, "id" | "createdAt" | "updatedAt"> {
  return {
    title: "",
    date: new Date().toISOString().slice(0, 10),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    experience: "photo",
    status: "draft",
    settings: { ...defaultEventSettings, enabledModes: [...defaultEventSettings.enabledModes] },
  };
}

function SurveyQuestionEditor({ questions, onChange, onError }: { questions: SurveyQuestion[]; onChange: (questions: SurveyQuestion[]) => void; onError: (message: string) => void }) {
  function updateQuestion(id: string, patch: Partial<SurveyQuestion>) {
    onChange(questions.map((question) => question.id === id ? { ...question, ...patch } : question));
  }

  function moveQuestion(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next);
  }

  function removeQuestion(id: string) {
    onChange(questions.filter((question) => question.id !== id));
  }

  function addQuestion() {
    if (questions.length >= 8) {
      onError("Maksimal delapan pertanyaan per event.");
      return;
    }
    onChange([...questions, { id: makeQuestionId(), prompt: "", type: "text", choices: [], required: false }]);
  }

  function updateChoice(id: string, index: number, value: string) {
    const question = questions.find((entry) => entry.id === id);
    if (!question) return;
    const choices = question.choices.map((choice, choiceIndex) => choiceIndex === index ? value : choice);
    updateQuestion(id, { choices });
  }

  function removeChoice(id: string, index: number) {
    const question = questions.find((entry) => entry.id === id);
    if (!question) return;
    updateQuestion(id, { choices: question.choices.filter((_, choiceIndex) => choiceIndex !== index) });
  }

  function addChoice(id: string) {
    const question = questions.find((entry) => entry.id === id);
    if (!question) return;
    if (question.choices.length >= 6) {
      onError("Maksimal enam pilihan per pertanyaan.");
      return;
    }
    updateQuestion(id, { choices: [...question.choices, ""] });
  }

  return <div className="survey-builder">
    {questions.map((question, index) => <article key={question.id} className="survey-question-card">
      <header><span className="survey-question-index">{index + 1}</span><div className="survey-question-tools">
        <button type="button" aria-label="Pindahkan pertanyaan ke atas" onClick={() => moveQuestion(index, -1)} disabled={index === 0}><ArrowUp size={15} /></button>
        <button type="button" aria-label="Pindahkan pertanyaan ke bawah" onClick={() => moveQuestion(index, 1)} disabled={index === questions.length - 1}><ArrowDown size={15} /></button>
        <button type="button" aria-label="Hapus pertanyaan" onClick={() => removeQuestion(question.id)}><Trash2 size={15} /></button>
      </div></header>
      <div className="form-grid">
        <label className="field field-wide"><span>Pertanyaan</span><input maxLength={140} value={question.prompt} onChange={(changeEvent) => updateQuestion(question.id, { prompt: changeEvent.target.value })} placeholder="Contoh: Siapa teman terbaikmu malam ini?" /></label>
        <label className="field"><span>Jenis jawaban</span><select value={question.type} onChange={(changeEvent) => updateQuestion(question.id, { type: changeEvent.target.value as SurveyQuestion["type"] })}><option value="text">Teks bebas</option><option value="choice">Pilihan</option></select></label>
        <div className="field survey-required-toggle"><span>Wajib dijawab</span><label className="switch"><input type="checkbox" aria-label="Tandai pertanyaan sebagai wajib" checked={question.required} onChange={(changeEvent) => updateQuestion(question.id, { required: changeEvent.target.checked })} /><span /></label></div>
      </div>
      {question.type === "choice" && <div className="survey-choices">
        {question.choices.map((choice, choiceIndex) => <div key={choiceIndex} className="survey-choice-row"><input maxLength={60} value={choice} onChange={(changeEvent) => updateChoice(question.id, choiceIndex, changeEvent.target.value)} placeholder={`Pilihan ${choiceIndex + 1}`} aria-label={`Pilihan ${choiceIndex + 1}`} /><button type="button" className="icon-button" aria-label="Hapus pilihan" onClick={() => removeChoice(question.id, choiceIndex)}><Trash2 size={14} /></button></div>)}
        <button type="button" className="text-action" onClick={() => addChoice(question.id)}><Plus size={15} /> Tambah pilihan</button>
        <small>Pertanyaan pilihan butuh minimal dua pilihan terisi.</small>
      </div>}
    </article>)}
    <button type="button" className="button button-secondary button-small" onClick={addQuestion}><Plus size={15} /> Tambah pertanyaan</button>
  </div>;
}

export default function EventEditorPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { refreshEvents, repository } = useAppData();
  const [draft, setDraft] = useState(newDraft);
  const [templateMarkdown, setTemplateMarkdown] = useState(() => createBoothTemplateMarkdown(defaultEventSettings));
  const [previewMode, setPreviewMode] = useState<"print" | "welcome">("print");
  const [loading, setLoading] = useState(Boolean(eventId));
  const [saving, setSaving] = useState(false);
  const [templateUploading, setTemplateUploading] = useState(false);
  const [error, setError] = useState("");
  const [pinDraft, setPinDraft] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!eventId) {
      setDraft(newDraft());
      setTemplateMarkdown(createBoothTemplateMarkdown(defaultEventSettings));
      setLoading(false);
      return;
    }
    void repository.getEvent(eventId).then((event) => {
      if (!active) return;
      if (!event) {
        navigate("/", { replace: true });
        return;
      }
      const settings = normalizeEventSettings(event.settings);
      setDraft({ ...event, settings });
      setTemplateMarkdown(createBoothTemplateMarkdown(settings));
      setLoading(false);
    }).catch(() => {
      if (active) {
        setError("Event tidak dapat dibuka dari penyimpanan yang dipilih.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [eventId, navigate, repository]);

  function updateSettings(update: Partial<EventSettings>) {
    setDraft((current) => ({ ...current, settings: { ...current.settings, ...update } }));
  }

  function toggleMode(mode: CaptureMode) {
    const enabled = draft.settings.enabledModes.includes(mode);
    const enabledModes = enabled
      ? draft.settings.enabledModes.filter((item) => item !== mode)
      : [...draft.settings.enabledModes, mode];
    if (enabledModes.length === 0) return;
    updateSettings({ enabledModes });
    if (!enabledModes.includes(draft.experience)) setDraft((current) => ({ ...current, experience: enabledModes[0] }));
  }

  function handleBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(png|jpe?g)$/i.test(file.name) || !["image/png", "image/jpeg"].includes(file.type)) {
      setError("Format desain harus PNG atau JPG.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateSettings({ backgroundImage: reader.result });
        setError("");
      }
    };
    reader.readAsDataURL(file);
  }

  function handleGreenScreenUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(png|jpe?g)$/i.test(file.name) || !["image/png", "image/jpeg"].includes(file.type)) {
      setError("Format latar green screen harus PNG atau JPG.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateSettings({ greenScreen: { ...draft.settings.greenScreen, backgroundImage: reader.result } });
        setError("");
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleTemplateUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".md") || file.size > 1024 * 1024) {
      setError("Pilih file Markdown (.md) dengan ukuran maksimal 1 MB.");
      event.target.value = "";
      return;
    }
    try {
      setTemplateMarkdown(await file.text());
      setError("");
    } catch {
      setError("File template tidak dapat dibaca.");
    }
    event.target.value = "";
  }

  function applyTemplate() {
    try {
      const settings = applyBoothTemplateMarkdown(templateMarkdown, draft.settings);
      setDraft((current) => ({
        ...current,
        settings,
        experience: settings.enabledModes.includes(current.experience) ? current.experience : settings.enabledModes[0],
      }));
      setError("");
    } catch (templateError) {
      setError(templateError instanceof Error ? templateError.message : "Template Markdown tidak valid.");
    }
  }

  async function applyBoothPin() {
    if (pinBusy) return;
    if (!isValidPinFormat(pinDraft)) {
      setError("PIN harus 4-6 angka.");
      return;
    }
    if (pinDraft !== pinConfirm) {
      setError("PIN dan konfirmasi tidak sama.");
      return;
    }
    setPinBusy(true);
    try {
      const boothPinHash = await hashBoothPin(pinDraft);
      updateSettings({ boothPinHash });
      setPinDraft("");
      setPinConfirm("");
      setError("");
    } catch (pinError) {
      setError(pinError instanceof Error ? pinError.message : "PIN tidak dapat disimpan.");
    } finally {
      setPinBusy(false);
    }
  }

  function removeBoothPin() {
    updateSettings({ boothPinHash: "" });
    setPinDraft("");
    setPinConfirm("");
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (templateUploading) {
      setError("Tunggu gambar latar selesai diproses sebelum menyimpan.");
      return;
    }
    if (!draft.title.trim()) {
      setError("Nama event perlu diisi.");
      return;
    }
    if (draft.settings.surveyEnabled) {
      const invalidChoice = draft.settings.surveyQuestions.find((question) => question.type === "choice" && question.choices.filter((choice) => choice.trim()).length < 2);
      if (invalidChoice) {
        setError("Pertanyaan pilihan harus memiliki minimal dua pilihan terisi.");
        return;
      }
      if (draft.settings.surveyQuestions.some((question) => !question.prompt.trim())) {
        setError("Setiap pertanyaan tamu harus memiliki teks pertanyaan.");
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      const saved = await repository.saveEvent({ ...draft, title: draft.title.trim(), status: "ready" }, eventId);
      await refreshEvents();
      setSaving(false);
      navigate(`/events/${saved.id}/setup`, { replace: !eventId });
    } catch {
      setError("Event belum tersimpan. Periksa ruang penyimpanan browser lalu coba lagi.");
      setSaving(false);
    }
  }

  async function duplicateEvent() {
    if (!eventId) return;
    try {
      const copy = await repository.duplicateEvent(eventId);
      await refreshEvents();
      navigate(`/events/${copy.id}/setup`);
    } catch {
      setError("Event belum dapat diduplikasi.");
    }
  }

  async function deleteEvent() {
    if (!eventId || !window.confirm("Hapus event dan seluruh hasil lokalnya? Aksi ini tidak dapat dibatalkan.")) return;
    try {
      await repository.deleteEvent(eventId);
      await refreshEvents();
      navigate("/");
    } catch {
      setError("Event belum dapat dihapus.");
    }
  }

  if (loading) return <div className="page-skeleton" aria-label="Memuat pengaturan event" />;

  const pinActive = Boolean(draft.settings.boothPinHash);

  return (
    <div className="editor-page">
      <div className="editor-topline"><Link to="/" className="back-link"><ArrowLeft size={16} /> Semua event</Link><span className="editor-step"><span>1</span><ChevronRight size={13} /><span>Pengalaman</span><ChevronRight size={13} /><span>2</span><ChevronRight size={13} /><span>Tampilan</span></span></div>
      <div className="page-heading editor-heading"><div><p className="eyebrow">PENGATURAN EVENT</p><h1>{eventId ? "Atur pengalaman booth" : "Buat event baru"}</h1><p className="page-subtitle">Tentukan detail event dan cara tamu mengambil momen.</p></div><div className="editor-heading-actions">{eventId && <><button type="button" className="button button-secondary button-small" onClick={() => void duplicateEvent()}><Copy size={14} /> Duplikasi</button><button type="button" className="button button-quiet button-small" onClick={() => void deleteEvent()}><Trash2 size={14} /> Hapus</button></>}<button type="submit" form="event-form" className="button button-primary" disabled={saving || templateUploading}><Save size={16} /> {templateUploading ? "Memproses gambar…" : saving ? "Menyimpan…" : "Simpan event"}</button></div></div>

      <form id="event-form" onSubmit={saveEvent} className="editor-layout">
        <div className="editor-main-column">
          <section className="editor-section">
            <div className="editor-section-heading"><span className="section-number">01</span><div><h2>Detail event</h2><p>Informasi dasar untuk mengatur sesi dan galeri.</p></div></div>
            <div className="form-grid">
              <label className="field field-wide"><span>Nama event <b>*</b></span><input autoComplete="off" maxLength={100} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Contoh: Malam apresiasi studio" required /><small>{draft.title.length}/100 karakter</small></label>
              <label className="field"><span>Tanggal event</span><input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} /></label>
              <label className="field"><span>Mode utama</span><select value={draft.experience} onChange={(event) => {
                const experience = event.target.value as CaptureMode;
                setDraft((current) => ({ ...current, experience, settings: { ...current.settings, enabledModes: current.settings.enabledModes.includes(experience) ? current.settings.enabledModes : [...current.settings.enabledModes, experience] } }));
              }}>{modes.map((mode) => <option key={mode.id} value={mode.id}>{mode.title}</option>)}</select></label>
            </div>
          </section>

          <section className="editor-section">
            <div className="editor-section-heading"><span className="section-number">02</span><div><h2>Mode booth</h2><p>Pilih pengalaman yang ingin ditawarkan kepada tamu.</p></div></div>
            <div className="mode-grid">
              {modes.map((mode) => {
                const selected = draft.settings.enabledModes.includes(mode.id);
                return <button type="button" key={mode.id} className={`mode-option${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={() => toggleMode(mode.id)}>
                  <span className="mode-option-symbol" aria-hidden="true">{mode.icon}</span><span className="mode-option-copy"><strong>{mode.title}</strong><small>{mode.detail}</small></span><span className="mode-check">{selected && <Check size={14} />}</span>
                </button>;
              })}
            </div>
            <p className="inline-note"><CircleCheck size={15} /> Foto, GIF, boomerang, dan video memakai kamera browser. Mode 360 menghasilkan video standar; capture 120/240 fps dan trigger perangkat khusus tidak tersedia di browser.</p>
          </section>

          <section className="editor-section">
            <div className="editor-section-heading"><span className="section-number">03</span><div><h2>Desain & kamera</h2><p>Atur latar booth dan default kamera per event agar siap dipakai di konter.</p></div></div>
            <div className="form-grid">
              <label className="field field-wide"><span>Desain latar booth</span><input type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={handleBackgroundUpload} /><small>Upload PNG atau JPG untuk background booth. Cocok untuk branding event atau template custom.</small></label>
              {draft.settings.backgroundImage && <div className="field field-wide"><div style={{ width: "100%", height: 110, borderRadius: 12, backgroundImage: `url("${draft.settings.backgroundImage}")`, backgroundSize: "cover", backgroundPosition: "center", border: "1px solid #D9E3DB" }} /><button type="button" className="button button-quiet button-small" onClick={() => updateSettings({ backgroundImage: "" })}>Hapus desain</button></div>}
              <label className="field"><span>Kamera default</span><select value={draft.settings.cameraFacingMode} onChange={(event) => updateSettings({ cameraFacingMode: event.target.value as EventSettings["cameraFacingMode"] })}><option value="user">Depan</option><option value="environment">Belakang / luaran</option></select></label>
            </div>
            <div className="toggle-row"><div><strong>Audio untuk video</strong><small>Aktifkan rekaman suara saat mode video atau 360 dipakai.</small></div><label className="switch"><input type="checkbox" aria-label="Aktifkan audio untuk video" checked={draft.settings.cameraAudioEnabled} onChange={(event) => updateSettings({ cameraAudioEnabled: event.target.checked })} /><span /></label></div>
          </section>

          <section className="editor-section">
            <div className="editor-section-heading"><span className="section-number">04</span><div><h2>Green screen</h2><p>Ganti latar hijau hasil tangkapan foto, GIF, dan boomerang dengan desain pilihan.</p></div></div>
            <div className="toggle-row"><div><strong><Wand2 size={15} /> Aktifkan green screen</strong><small>Piksel yang mendekati warna kunci akan diganti latar khusus saat mengambil hasil.</small></div><label className="switch"><input type="checkbox" aria-label="Aktifkan green screen" checked={draft.settings.greenScreen.enabled} onChange={(event) => updateSettings({ greenScreen: { ...draft.settings.greenScreen, enabled: event.target.checked } })} /><span /></label></div>
            {draft.settings.greenScreen.enabled && <div className="form-grid nested-settings">
              <label className="field"><span>Warna kunci</span><input type="color" value={draft.settings.greenScreen.keyColor} onChange={(event) => updateSettings({ greenScreen: { ...draft.settings.greenScreen, keyColor: event.target.value } })} /></label>
              <label className="field"><span>Toleransi warna ({draft.settings.greenScreen.tolerance})</span><input type="range" min={20} max={160} step={10} value={draft.settings.greenScreen.tolerance} onChange={(event) => updateSettings({ greenScreen: { ...draft.settings.greenScreen, tolerance: Number(event.target.value) } })} /><small>Semakin besar, semakin banyak warna sekitar ikut diganti.</small></label>
              <label className="field field-wide"><span>Latar pengganti</span><input type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={handleGreenScreenUpload} /><small>PNG atau JPG. Tanpa gambar, latar default gelap dipakai.</small></label>
              {draft.settings.greenScreen.backgroundImage && <div className="field field-wide"><div style={{ width: "100%", height: 110, borderRadius: 12, backgroundImage: `url("${draft.settings.greenScreen.backgroundImage}")`, backgroundSize: "cover", backgroundPosition: "center", border: "1px solid #D9E3DB" }} /><button type="button" className="button button-quiet button-small" onClick={() => updateSettings({ greenScreen: { ...draft.settings.greenScreen, backgroundImage: "" } })}>Hapus latar</button></div>}
            </div>}
          </section>

          <section className="editor-section">
            <div className="editor-section-heading"><span className="section-number">05</span><div><h2>Alur & batas sesi</h2><p>Atur waktu review hasil dan kuota sesi serta cetak untuk operasional event.</p></div></div>
            <div className="form-grid">
              <label className="field"><span>Waktu review hasil (detik)</span><input type="number" min={0} max={30} value={draft.settings.reviewSeconds} onChange={(event) => updateSettings({ reviewSeconds: Number(event.target.value) })} /><small>0 berarti menunggu tamu menekan simpan sendiri.</small></label>
              <label className="field"><span>Batas sesi per event</span><input type="number" min={0} max={9999} value={draft.settings.sessionLimit} onChange={(event) => updateSettings({ sessionLimit: Number(event.target.value) })} /><small>0 berarti tanpa batas. Booth menolak sesi baru setelah batas tercapai.</small></label>
              <label className="field"><span>Batas cetak per event</span><input type="number" min={0} max={9999} value={draft.settings.maxPrintsPerEvent} onChange={(event) => updateSettings({ maxPrintsPerEvent: Number(event.target.value) })} /><small>0 berarti tanpa batas. Menghitung jumlah lembar tercetak di galeri.</small></label>
              <label className="field"><span>Batas cetak per sesi</span><input type="number" min={0} max={99} value={draft.settings.maxPrintsPerSession} onChange={(event) => updateSettings({ maxPrintsPerSession: Number(event.target.value) })} /><small>0 berarti tanpa batas per sesi tamu.</small></label>
            </div>
          </section>

          <section className="editor-section">
            <div className="editor-section-heading"><span className="section-number">06</span><div><h2>Template Markdown</h2><p>Unggah atau edit metadata Markdown, lalu terapkan untuk memperbarui pengaturan booth.</p></div></div>
            <div className="form-grid">
              <label className="field field-wide"><span>File template (.md)</span><input type="file" accept=".md,text/markdown" onChange={(event) => void handleTemplateUpload(event)} /><small>Maksimal 1 MB. Gunakan format YAML di antara dua baris ---.</small></label>
              <label className="field field-wide"><span>Isi template</span><textarea rows={16} spellCheck={false} value={templateMarkdown} onChange={(event) => setTemplateMarkdown(event.target.value)} aria-label="Isi template Markdown" /></label>
              <div className="field-wide template-actions"><button type="button" className="button button-secondary button-small" onClick={applyTemplate}><Check size={15} /> Terapkan template</button><a className="text-action" href="/booth-template.md" download><FileText size={15} /> Unduh contoh Markdown</a><span><Upload size={14} /> Perubahan tersimpan setelah menekan Simpan event.</span></div>
            </div>
          </section>

          <section className="editor-section">
            <div className="editor-section-heading"><span className="section-number">07</span><div><h2>Layout cetak foto</h2><p>Susun slot untuk kertas 4 × 6 atau strip 2 × 6 inci.</p></div></div>
            <PrintTemplateEditor value={draft.settings.printTemplate} onChange={(printTemplate) => updateSettings({ printTemplate })} onBusyChange={setTemplateUploading} />
          </section>

          <section className="editor-section">
            <div className="editor-section-heading"><span className="section-number">08</span><div><h2>Pengalaman tamu</h2><p>Siapkan sambutan, consent, dan pertanyaan setelah sesi.</p></div></div>
            <label className="field"><span>Pesan sambutan</span><input maxLength={90} value={draft.settings.welcomeMessage} onChange={(event) => updateSettings({ welcomeMessage: event.target.value })} /></label>
            <div className="toggle-row"><div><strong>Disclaimer sebelum sesi</strong><small>Tamu menyetujui sebelum kamera dinyalakan.</small></div><label className="switch"><input type="checkbox" aria-label="Aktifkan disclaimer sebelum sesi" checked={draft.settings.consentEnabled} onChange={(event) => updateSettings({ consentEnabled: event.target.checked })} /><span /></label></div>
            {draft.settings.consentEnabled && <label className="field nested-field"><span>Teks persetujuan</span><textarea rows={3} maxLength={300} value={draft.settings.consentText} onChange={(event) => updateSettings({ consentText: event.target.value })} /></label>}
            <div className="toggle-row"><div><strong>Pertanyaan sesi</strong><small>Kumpulkan jawaban teks atau pilihan dari tamu setelah hasil diambil.</small></div><label className="switch"><input type="checkbox" aria-label="Aktifkan pertanyaan sesi" checked={draft.settings.surveyEnabled} onChange={(event) => {
              updateSettings({ surveyEnabled: event.target.checked });
              if (event.target.checked && draft.settings.surveyQuestions.length === 0 && draft.settings.surveyQuestion.trim()) {
                updateSettings({ surveyQuestions: [{ id: makeQuestionId(), prompt: draft.settings.surveyQuestion.trim(), type: "text", choices: [], required: false }] });
              }
            }} /><span /></label></div>
            {draft.settings.surveyEnabled && <div className="nested-field"><SurveyQuestionEditor questions={draft.settings.surveyQuestions} onChange={(surveyQuestions) => updateSettings({ surveyQuestions, surveyQuestion: surveyQuestions[0]?.prompt ?? draft.settings.surveyQuestion })} onError={setError} /></div>}
          </section>

          <section className="editor-section">
            <div className="editor-section-heading"><span className="section-number">09</span><div><h2>Galeri & keamanan</h2><p>Atur slideshow hasil dan kunci PIN agar booth hanya bisa dibuka operator.</p></div></div>
            <div className="toggle-row"><div><strong>Slideshow galeri</strong><small>Tampilkan tombol putar untuk menayangkan hasil secara bergantian.</small></div><label className="switch"><input type="checkbox" aria-label="Aktifkan slideshow galeri" checked={draft.settings.slideshowEnabled} onChange={(event) => updateSettings({ slideshowEnabled: event.target.checked })} /><span /></label></div>
            {draft.settings.slideshowEnabled && <div className="form-grid nested-settings"><label className="field"><span>Durasi per hasil (detik)</span><input type="number" min={3} max={30} value={draft.settings.slideshowSeconds} onChange={(event) => updateSettings({ slideshowSeconds: Number(event.target.value) })} /></label></div>}
            <div className="pin-setup-block">
              <div className="pin-setup-heading"><Lock size={16} /><div><strong>{pinActive ? "PIN booth aktif" : "PIN booth belum diatur"}</strong><small>{pinActive ? "Booth meminta PIN sebelum sesi tamu dibuka dan saat keluar dari booth." : "Atur PIN 4-6 angka untuk mengunci booth dari tamu."}</small></div></div>
              <div className="form-grid">
                <label className="field"><span>{pinActive ? "PIN baru" : "PIN"}</span><input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pinDraft} onChange={(event) => setPinDraft(event.target.value.replace(/\D/g, ""))} placeholder="4-6 angka" /></label>
                <label className="field"><span>Konfirmasi PIN</span><input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pinConfirm} onChange={(event) => setPinConfirm(event.target.value.replace(/\D/g, ""))} placeholder="Ulangi PIN" /></label>
              </div>
              <div className="pin-setup-actions">
                <button type="button" className="button button-secondary button-small" onClick={() => void applyBoothPin()} disabled={pinBusy || !pinDraft}>{pinActive ? "Perbarui PIN" : "Aktifkan PIN"}</button>
                {pinActive && <button type="button" className="button button-quiet button-small" onClick={removeBoothPin}>Nonaktifkan PIN</button>}
              </div>
              <small>Perubahan PIN tersimpan saat menekan Simpan event. PIN disimpan sebagai hash SHA-256, bukan teks biasa.</small>
            </div>
          </section>
        </div>

        <aside className="editor-preview-column" aria-label="Pratinjau event">
          <div className="preview-sticky">
            <div className="preview-header"><span>{previewMode === "print" ? <Printer size={15} /> : <Monitor size={15} />} Pratinjau {previewMode === "print" ? "cetak" : "sambutan"}</span><span className="preview-live"><i /> LANGSUNG</span></div>
            <div className="preview-mode-switch" role="group" aria-label="Mode pratinjau"><button type="button" aria-pressed={previewMode === "print"} onClick={() => setPreviewMode("print")}>Cetak</button><button type="button" aria-pressed={previewMode === "welcome"} onClick={() => setPreviewMode("welcome")}>Sambutan</button></div>
            {previewMode === "print" ? <><div className="template-live-preview-wrap"><TemplatePrintPreview template={draft.settings.printTemplate} /></div><div className="preview-print-meta"><span>{draft.settings.printTemplate.paperSize === "2x6" ? "2 × 6 inci" : "4 × 6 inci"}</span><span>{draft.settings.printTemplate.slots.length} slot foto</span></div></> : <>
              <div className="welcome-preview" style={{ "--preview-accent": draft.settings.accentColor, backgroundImage: draft.settings.backgroundImage ? `linear-gradient(145deg, rgba(10, 18, 18, 0.7), rgba(18, 29, 25, 0.52)), url("${draft.settings.backgroundImage}")` : undefined, backgroundSize: "cover", backgroundPosition: "center" } as React.CSSProperties}>
                <div className={`preview-layout preview-layout-${draft.settings.layout}`}><i /><i /><i /></div>
                <span className="preview-logo"><Sparkles size={15} /> FLASHFOLD</span>
                <div className="preview-event-name">{draft.title || "Nama event kamu"}</div>
                <p>{draft.settings.welcomeMessage || "Pesan sambutan"}</p>
                <div className="preview-mode-icons">{draft.settings.enabledModes.map((mode) => <span key={mode}>{mode === "photo" ? "◉" : mode === "video" ? "▶" : mode === "gif" ? "↻" : mode === "boomerang" ? "⇄" : "⟳"}<small>{modes.find((item) => item.id === mode)?.title}</small></span>)}</div>
                <span className="preview-start">Sentuh untuk mulai</span>
              </div>
              <div className="preview-controls"><div><Palette size={15} /><strong>Warna event</strong></div><div className="swatches">{swatches.map((color) => <button key={color} type="button" className={`swatch${draft.settings.accentColor === color ? " is-picked" : ""}`} style={{ backgroundColor: color }} onClick={() => updateSettings({ accentColor: color })} aria-label={`Pilih warna ${color}`} aria-pressed={draft.settings.accentColor === color} />)}</div></div>
              <div className="preview-controls preview-layout-control"><div><strong>Susunan foto</strong></div><div className="segmented-control">{(["classic", "strip", "portrait"] as const).map((layout) => <button key={layout} type="button" className={draft.settings.layout === layout ? "is-active" : ""} onClick={() => updateSettings({ layout })}>{layout === "classic" ? "Klasik" : layout === "strip" ? "Strip" : "Potret"}</button>)}</div></div>
            </>}
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="editor-save-mobile"><button type="submit" form="event-form" className="button button-primary" disabled={saving || templateUploading}><Save size={16} /> {templateUploading ? "Memproses gambar…" : saving ? "Menyimpan…" : "Simpan event"}</button></div>
        </aside>
      </form>
    </div>
  );
}
