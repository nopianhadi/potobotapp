import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { ArrowLeft, Camera, CameraOff, Check, CircleAlert, Delete, FlipHorizontal, ImagePlus, Lock, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import TemplatePrintPreview from "../components/TemplatePrintPreview";
import { useAppData } from "../data/AppDataContext";
import { type CaptureMode, type MediaItem, type SurveyAnswer, sessionAnswersText } from "../data/types";
import { cameraErrorMessage, chooseCameraDevice, requestCameraStream } from "../lib/camera";
import { boomerangFrameCount, boomerangFrameDelayMs, boomerangFrameOrder } from "../lib/boomerang";
import { prepareGreenScreen } from "../lib/greenScreen";
import { verifyBoothPin } from "../lib/pin";

const modeLabels: Record<CaptureMode, string> = { photo: "Foto", gif: "GIF", boomerang: "Boomerang", video: "Video", "360": "360 / Slow-mo" };
const modeIcons: Record<CaptureMode, string> = { photo: "◉", gif: "↻", boomerang: "⇄", video: "▶", "360": "⟳" };
const modeTaglines: Record<CaptureMode, string> = { photo: "Ambil foto", gif: "Buat animasi", boomerang: "Geri maju", video: "Rekam klip", "360": "Video gerak" };
type Stage = "welcome" | "capture" | "review" | "saved";

function mediaTypeFor(mode: CaptureMode): MediaItem["type"] {
  if (mode === "gif" || mode === "boomerang") return "gif";
  if (mode === "video" || mode === "360") return "video";
  return "photo";
}

function captureHint(mode: CaptureMode) {
  if (mode === "gif") return "Klik area kamera atau tombol rana untuk membangun GIF dari beberapa frame.";
  if (mode === "boomerang") return "Klik tombol rana untuk merekam gerakan maju-mundur yang berulang.";
  if (mode === "video") return "Klik tombol rekam untuk merekam klip singkat. Perekaman berhenti otomatis setelah lima detik.";
  if (mode === "360") return "Klik tombol rekam untuk merekam video. Mode ini tetap memakai kamera normal tanpa efek slow motion.";
  return "Klik area kamera atau tombol rana untuk menangkap momen tanpa hitung mundur.";
}

function PinGate({ title, subtitle, expectedHash, onCancel, onUnlocked, cancelLabel }: { title: string; subtitle: string; expectedHash: string; onCancel: () => void; onUnlocked: () => void; cancelLabel: string }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function submit() {
    if (checking || !pin) return;
    setChecking(true);
    const ok = await verifyBoothPin(pin, expectedHash);
    setChecking(false);
    if (ok) {
      setPin("");
      setError("");
      onUnlocked();
    } else {
      setPin("");
      setError("PIN tidak cocok. Coba lagi.");
    }
  }

  return <section className="booth-pin-gate" role="dialog" aria-modal="true" aria-label="Kunci PIN booth">
    <div className="booth-pin-card">
      <span className="booth-pin-icon"><Lock size={22} /></span>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <div className="pin-dots" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span key={index} className={index < pin.length ? "is-filled" : ""} />)}</div>
      <p className="pin-entry-hint" aria-live="polite">{error || `${pin.length} dari 4-6 angka dimasukkan`}</p>
      <div className="pin-keypad" role="group" aria-label="Papan tombol PIN">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => <button key={digit} type="button" onClick={() => setPin((current) => current.length < 6 ? current + digit : current)} disabled={checking}>{digit}</button>)}
        <button type="button" className="pin-key-action" onClick={() => setPin((current) => current.slice(0, -1))} disabled={checking || !pin} aria-label="Hapus satu angka"><Delete size={18} /></button>
        <button type="button" onClick={() => setPin((current) => current.length < 6 ? current + "0" : current)} disabled={checking}>0</button>
        <button type="button" className="pin-key-confirm" onClick={() => void submit()} disabled={checking || pin.length < 4} aria-label="Konfirmasi PIN"><Check size={18} /></button>
      </div>
      <button type="button" className="button button-quiet button-small" onClick={onCancel} disabled={checking}>{cancelLabel}</button>
    </div>
  </section>;
}

export default function BoothPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { events, ready, refreshEvents, repository } = useAppData();
  const event = events.find((item) => item.id === eventId);
  const [stage, setStage] = useState<Stage>("welcome");
  const [mode, setMode] = useState<CaptureMode>("photo");
  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "ready" | "error">("idle");
  const [previewReady, setPreviewReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraNotice, setCameraNotice] = useState("");
  const [cameraSide, setCameraSide] = useState<"user" | "environment">("user");
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [cameraRetry, setCameraRetry] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [consent, setConsent] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState("");
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [reviewCountdown, setReviewCountdown] = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinPrompt, setPinPrompt] = useState<"entry" | "exit" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const pinSet = Boolean(event?.settings.boothPinHash);

  useEffect(() => {
    if (!event) return;
    const availableMode = event.settings.enabledModes[0] ?? "photo";
    setMode((current) => event.settings.enabledModes.includes(current) ? current : availableMode);
    setCameraSide(event.settings.cameraFacingMode ?? "user");
    setSelectedCameraId("");
    setPinUnlocked(false);
    setPinPrompt(pinSet ? "entry" : null);
  }, [event?.id]);

  useEffect(() => {
    if (!event) return;
    let active = true;
    void repository.listSessions(event.id)
      .then((list) => { if (active) setSessionCount(list.length); })
      .catch(() => { if (active) setSessionCount(null); });
    return () => { active = false; };
  }, [event?.id, repository, saved]);

  useEffect(() => {
    if (stage !== "capture") return;
    let disposed = false;
    setCameraState("requesting");
    setPreviewReady(false);
    setCameraError("");
    setCameraNotice("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("error");
      setCameraError(cameraErrorMessage(new Error("Camera API unavailable"), window.isSecureContext));
      return;
    }
    const wantsAudio = (mode === "video" || mode === "360") && (event?.settings.cameraAudioEnabled ?? false);
    void requestCameraStream(navigator.mediaDevices, cameraSide, wantsAudio, selectedCameraId || undefined)
      .then(({ stream, audioAvailable }) => {
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        setCameraNotice(wantsAudio && !audioAvailable ? "Kamera siap, tetapi mikrofon tidak ditemukan. Video akan direkam tanpa audio." : "");
        setCameraState("ready");
        void navigator.mediaDevices.enumerateDevices()
          .then((devices) => {
            if (disposed) return;
            const videoDevices = devices.filter((device) => device.kind === "videoinput");
            setCameraDevices(videoDevices);
            const preferred = chooseCameraDevice(videoDevices, cameraSide, selectedCameraId || undefined);
            if (preferred && preferred.deviceId !== selectedCameraId) {
              setSelectedCameraId(preferred.deviceId);
            }
          })
          .catch(() => { if (!disposed) setCameraDevices([]); });
      })
      .catch((cause: unknown) => {
        if (disposed) return;
        setCameraState("error");
        setCameraError(cameraErrorMessage(cause, window.isSecureContext));
      });
    return () => {
      disposed = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [stage, cameraSide, mode, selectedCameraId, cameraRetry, event]);

  useEffect(() => {
    if (stage !== "capture" || cameraState !== "ready") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    let active = true;
    const markPreviewReady = () => {
      if (active && video.videoWidth > 0 && video.videoHeight > 0) setPreviewReady(true);
    };
    video.addEventListener("loadedmetadata", markPreviewReady);
    video.addEventListener("canplay", markPreviewReady);
    video.srcObject = stream;
    void video.play().then(markPreviewReady).catch(() => {
      if (!active) return;
      setCameraState("error");
      setCameraError("Kamera terhubung, tetapi preview tidak dapat diputar. Coba lagi atau muat ulang halaman.");
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    });
    markPreviewReady();
    return () => {
      active = false;
      video.removeEventListener("loadedmetadata", markPreviewReady);
      video.removeEventListener("canplay", markPreviewReady);
    };
  }, [cameraState, stage]);

  useEffect(() => {
    if (!pendingBlob) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(pendingBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingBlob]);

  if (!ready) return <main className="booth-loading">Memuat booth…</main>;
  if (!eventId) {
    return <main className="booth-picker"><Link to="/" className="back-link"><ArrowLeft size={16} /> Ruang kerja</Link><p className="eyebrow">PILIH EVENT</p><h1>Booth mana yang akan dibuka?</h1><p className="page-subtitle">Pilih event tersimpan untuk memulai pengalaman tamu.</p>{events.length ? <div className="picker-list">{events.map((item) => <Link key={item.id} to={`/events/${item.id}/booth`} className="picker-item"><span className="picker-icon"><Camera size={19} /></span><span><strong>{item.title}</strong><small>{item.settings.enabledModes.map((itemMode) => modeLabels[itemMode]).join(" · ")}</small></span><ArrowLeft className="picker-arrow" size={17} /></Link>)}</div> : <div className="empty-state"><h2>Belum ada event</h2><Link to="/events/new" className="button button-primary">Buat event</Link></div>}</main>;
  }
  if (!event) return <main className="booth-loading">Event tidak ditemukan.</main>;

  const surveyQuestions = event.settings.surveyEnabled ? event.settings.surveyQuestions : [];
  const sessionLimit = event.settings.sessionLimit;
  const sessionLimitReached = sessionLimit > 0 && sessionCount !== null && sessionCount >= sessionLimit;
  const greenScreenActive = event.settings.greenScreen.enabled;
  const greenScreenSettings = event.settings.greenScreen;

  function beginCapture() {
    const currentEvent = event;
    if (!currentEvent) return;
    if (sessionLimitReached) {
      setFeedback("Kuota sesi event ini sudah terpakai. Hubungi operator untuk membuka sesi baru.");
      return;
    }
    if (currentEvent.settings.consentEnabled && !consent) {
      setFeedback("Setujui disclaimer untuk melanjutkan.");
      return;
    }
    setFeedback("");
    setStartedAt(new Date().toISOString());
    setPendingBlob(null);
    setSaved(false);
    setStage("capture");
  }

  async function grabFrameCanvas(width: number, height: number) {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || !video.videoHeight) throw new Error("Preview kamera belum siap. Coba lagi beberapa saat.");
    if (greenScreenActive) {
      const compositor = await prepareGreenScreen({
        keyColor: greenScreenSettings.keyColor,
        tolerance: greenScreenSettings.tolerance,
        backgroundImage: greenScreenSettings.backgroundImage,
      });
      return compositor.compose(video, width, height);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Foto tidak dapat diproses di browser ini.");
    context.drawImage(video, 0, 0, width, height);
    return canvas;
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || !video.videoHeight) {
      setCameraError("Preview kamera belum siap. Coba lagi beberapa saat.");
      return;
    }
    const width = Math.min(video.videoWidth, 1440);
    const height = Math.round(width * video.videoHeight / video.videoWidth);
    const canvas = await grabFrameCanvas(width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error("Foto tidak dapat diproses.");
    setPendingBlob(blob);
    setStage("review");
  }

  async function collectFrames(frameCount: number, delayMs: number): Promise<ImageData[]> {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) throw new Error("Preview kamera belum siap.");
    const width = Math.min(video.videoWidth, 480);
    const height = Math.round(width * video.videoHeight / video.videoWidth);
    const compositor = greenScreenActive ? await prepareGreenScreen({
      keyColor: greenScreenSettings.keyColor,
      tolerance: greenScreenSettings.tolerance,
      backgroundImage: greenScreenSettings.backgroundImage,
    }) : null;
    const frames: ImageData[] = [];
    for (let frame = 0; frame < frameCount; frame += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      const canvas = compositor ? compositor.compose(video, width, height) : await grabFrameCanvas(width, height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Animasi tidak dapat diproses di browser ini.");
      frames.push(context.getImageData(0, 0, width, height));
    }
    return frames;
  }

  async function captureGif() {
    const frames = await collectFrames(8, 180);
    const palette = quantize(frames[0].data, 128);
    const encoder = GIFEncoder();
    frames.forEach((frame) => encoder.writeFrame(applyPalette(frame.data, palette), frame.width, frame.height, { palette, delay: 180, repeat: 0 }));
    encoder.finish();
    setPendingBlob(new Blob([encoder.bytes().buffer as ArrayBuffer], { type: "image/gif" }));
    setStage("review");
  }

  async function captureBoomerang() {
    const frames = await collectFrames(boomerangFrameCount, boomerangFrameDelayMs);
    const order = boomerangFrameOrder(frames.length);
    const palette = quantize(frames[0].data, 128);
    const encoder = GIFEncoder();
    order.forEach((index) => {
      const frame = frames[index];
      encoder.writeFrame(applyPalette(frame.data, palette), frame.width, frame.height, { palette, delay: boomerangFrameDelayMs, repeat: 0 });
    });
    encoder.finish();
    setPendingBlob(new Blob([encoder.bytes().buffer as ArrayBuffer], { type: "image/gif" }));
    setStage("review");
  }

  async function captureVideo() {
    const stream = streamRef.current;
    if (!stream || !window.MediaRecorder) throw new Error("Perekaman video tidak didukung browser ini.");
    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((candidate) => MediaRecorder.isTypeSupported(candidate));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: BlobPart[] = [];
    setRecording(true);
    await new Promise<void>((resolve, reject) => {
      recorder.ondataavailable = (captureEvent) => { if (captureEvent.data.size) chunks.push(captureEvent.data); };
      recorder.onerror = () => reject(new Error("Perekaman gagal. Periksa izin mikrofon dan kamera."));
      recorder.onstop = () => resolve();
      recorder.start();
      window.setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 5000);
    });
    setRecording(false);
    setPendingBlob(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
    setStage("review");
  }

  async function takeCapture() {
    if (capturing || cameraState !== "ready" || !previewReady) return;
    setCapturing(true);
    setFeedback("");
    try {
      if (mode === "video" || mode === "360") {
        await captureVideo();
      } else if (mode === "gif") {
        await captureGif();
      } else if (mode === "boomerang") {
        await captureBoomerang();
      } else {
        await capturePhoto();
      }
    } catch (cause) {
      setCameraError(cause instanceof Error ? cause.message : "Hasil tidak dapat diproses.");
    } finally {
      setCountdown(null);
      setCapturing(false);
      setRecording(false);
    }
  }

  async function saveResult() {
    const currentEvent = event;
    if (!currentEvent || !pendingBlob || saved || savingResult) return;
    const missingRequired = surveyQuestions.find((question) => question.required && !(answers[question.id] ?? "").trim());
    if (missingRequired) {
      setFeedback("Jawab pertanyaan yang wajib sebelum menyimpan.");
      return;
    }
    setSavingResult(true);
    try {
      const surveyAnswers: SurveyAnswer[] = surveyQuestions
        .map((question) => ({ questionId: question.id, prompt: question.prompt, answer: (answers[question.id] ?? "").trim().slice(0, 300) }))
        .filter((entry) => entry.answer.length > 0);
      await repository.saveCapture({
        eventId: currentEvent.id,
        mode,
        mediaType: mediaTypeFor(mode),
        blob: pendingBlob,
        consent: currentEvent.settings.consentEnabled ? consent : null,
        answer: sessionAnswersText(surveyAnswers),
        answers: surveyAnswers,
        startedAt,
      });
      await repository.saveEvent({ ...currentEvent, status: "active" }, currentEvent.id);
      await refreshEvents();
      setSessionCount((current) => current === null ? null : current + 1);
      setSaved(true);
      setStage("saved");
    } catch {
      setFeedback("Penyimpanan browser penuh atau tidak tersedia. Unduh hasil ini sebelum keluar.");
    } finally {
      setSavingResult(false);
    }
  }

  useEffect(() => {
    if (stage !== "review" || !pendingBlob) return;
    const seconds = event.settings.reviewSeconds;
    if (!seconds) {
      setReviewCountdown(null);
      return;
    }
    setReviewCountdown(seconds);
    const timer = window.setInterval(() => {
      setReviewCountdown((current) => {
        if (current === null) return null;
        if (current <= 1) {
          window.clearInterval(timer);
          void saveResult();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stage, pendingBlob, event.settings.reviewSeconds]);

  function exitBooth() {
    if (!event) return;
    if (pinSet) {
      setPinPrompt("exit");
      return;
    }
    navigate(`/events/${event.id}/setup`);
  }

  function switchCamera() {
    if (cameraDevices.length > 1) {
      const activeId = streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId ?? selectedCameraId;
      const activeIndex = cameraDevices.findIndex((device) => device.deviceId === activeId);
      const nextDevice = cameraDevices[(activeIndex + 1) % cameraDevices.length];
      setSelectedCameraId(nextDevice.deviceId);
      return;
    }
    setSelectedCameraId("");
    setCameraSide((side) => side === "user" ? "environment" : "user");
  }

  function markPreviewReady() {
    const video = videoRef.current;
    if (video && video.videoWidth > 0 && video.videoHeight > 0) setPreviewReady(true);
  }

  const boothBackgroundImage = event.settings.backgroundImage || event.settings.printTemplate.backgroundImage;
  const reviewProgress = reviewCountdown !== null && event.settings.reviewSeconds > 0
    ? Math.max(0, (event.settings.reviewSeconds - reviewCountdown) / event.settings.reviewSeconds)
    : 0;

  return (
    <main
      className="booth-page"
      style={{
        "--booth-accent": event.settings.accentColor,
        backgroundImage: boothBackgroundImage ? `linear-gradient(180deg, rgba(20,33,29,0.85), rgba(20,33,29,0.82)), url("${boothBackgroundImage}")` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      } as React.CSSProperties}
    >
      <header className="booth-topbar"><button type="button" className="booth-exit" onClick={exitBooth} aria-label="Keluar dari booth"><X size={18} /></button><div className="booth-event-brand"><Sparkles size={15} /><span>{event.title}</span></div><span className="booth-mode-indicator">{modeLabels[mode]}</span></header>

      {stage === "welcome" && <section className="booth-welcome">
        <div className="booth-welcome-copy"><span className="booth-overline">FLASHFOLD PHOTO MOMENT</span><h1>{event.settings.welcomeMessage}</h1><p>{event.title}</p></div>
        <div className="booth-welcome-actions">
          {sessionLimitReached ? <>
            <p className="booth-select-label">SESI HARI INI SELESAI</p>
            <div className="booth-limit-note"><Lock size={18} /><p>Kuota {sessionLimit} sesi untuk event ini sudah tercapai. Operator dapat menaikkan batas di pengaturan event.</p></div>
          </> : <>
            <p className="booth-select-label">PILIH PENGALAMAN</p>
            <div className="booth-mode-list">{event.settings.enabledModes.map((itemMode) => <button key={itemMode} type="button" className={`booth-mode-button${mode === itemMode ? " is-selected" : ""}`} onClick={() => setMode(itemMode)} aria-pressed={mode === itemMode}><span>{modeIcons[itemMode]}</span><strong>{modeLabels[itemMode]}</strong><small>{modeTaglines[itemMode]}</small></button>)}</div>
            <p className="booth-mode-hint">{captureHint(mode)}{greenScreenActive && mode !== "video" && mode !== "360" ? " Latar green screen aktif: hasil foto memakai latar khusus." : ""}</p>
            {sessionLimit > 0 && sessionCount !== null && <p className="booth-session-quota">Sesi tersisa: {Math.max(0, sessionLimit - sessionCount)} dari {sessionLimit}</p>}
          </>}
          {event.settings.consentEnabled && <label className="consent-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{event.settings.consentText}</span></label>}
          {feedback && <p className="booth-feedback" role="alert">{feedback}</p>}
          <button type="button" className="booth-start-button" onClick={beginCapture} disabled={sessionLimitReached}>{sessionLimitReached ? "Sesi penuh" : <><Camera size={18} /> Mulai sesi</>}</button>
        </div>
        <div className="booth-welcome-index"><span>EVENT</span><strong>{event.date || "—"}</strong><span>MODE LOKAL</span></div>
      </section>}

      {stage === "capture" && <section className="booth-capture-stage">
        <div className="capture-instructions"><span className="booth-overline">{cameraState === "requesting" ? "MENYIAPKAN KAMERA" : "SIAPKAN POSE KAMU"}</span><h1>{cameraState === "requesting" ? "Menyalakan kamera…" : recording ? "Merekam momen" : mode === "boomerang" ? "Gerakkan tubuhmu." : "Lihat ke kamera."}</h1><p>{mode === "video" || mode === "360" ? "Klik tombol rekam untuk memulai perekaman. Klip akan berhenti otomatis setelah lima detik." : mode === "boomerang" ? "Klik tombol rana; rekaman singkat akan diputar maju lalu mundur secara berulang." : "Klik area kamera atau tombol rana untuk menangkap momen tanpa hitung mundur."}</p></div>
        <div className="camera-stage-frame" onClick={() => { if (mode !== "video" && mode !== "360" && cameraState === "ready" && previewReady && !capturing) void takeCapture(); }} role="button" tabIndex={0} onKeyDown={(captureEvent) => { if ((captureEvent.key === "Enter" || captureEvent.key === " ") && mode !== "video" && mode !== "360" && cameraState === "ready" && previewReady && !capturing) { captureEvent.preventDefault(); void takeCapture(); } }}>
          {cameraState === "ready" ? <><video ref={videoRef} className="camera-video" onLoadedMetadata={markPreviewReady} onCanPlay={markPreviewReady} autoPlay playsInline muted aria-label="Preview kamera" />{!previewReady && <div className="camera-preview-status" role="status"><span className="camera-loader" /><p>Menyiapkan preview kamera…</p></div>}</> : <div className="camera-placeholder">{cameraState === "error" ? <CameraOff size={28} /> : <span className="camera-loader" />}<p>{cameraState === "error" ? "Kamera belum siap" : "Menghubungkan kamera"}</p></div>}
          <span className="camera-frame-corner camera-corner-tl" /><span className="camera-frame-corner camera-corner-tr" /><span className="camera-frame-corner camera-corner-bl" /><span className="camera-frame-corner camera-corner-br" />
          {countdown !== null && <span className="capture-countdown" aria-live="assertive">{countdown}</span>}
          {recording && <span className="recording-indicator"><i /> REC</span>}
          <span className="camera-mode-tag">{modeLabels[mode]}</span>
          {greenScreenActive && mode !== "video" && mode !== "360" && <span className="camera-effect-tag">GREEN SCREEN</span>}
        </div>
        <div className="capture-controls">
          <button type="button" className="booth-secondary-button" onClick={switchCamera} disabled={cameraState !== "ready" || !previewReady}><FlipHorizontal size={17} /> {cameraDevices.length > 1 ? "Ganti kamera" : "Balik kamera"}</button>
          <button type="button" className="shutter-button" onClick={(captureEvent) => { captureEvent.stopPropagation(); void takeCapture(); }} disabled={cameraState !== "ready" || !previewReady || capturing} aria-label={mode === "video" || mode === "360" ? "Rekam video" : "Ambil hasil"}><span>{capturing && !recording ? <span className="shutter-countdown">{countdown ?? "…"}</span> : <Camera size={22} />}</span></button>
          <button type="button" className="booth-secondary-button" onClick={() => setStage("welcome")}><X size={16} /> Batal</button>
        </div>
        {cameraDevices.length > 0 && (
          <p className="camera-message" role="status">
            <span aria-hidden="true">📷</span>
            {chooseCameraDevice(cameraDevices, cameraSide, selectedCameraId || undefined)?.label || "Kamera siap"}
          </p>
        )}
        {cameraError && <p className="camera-message" role="alert"><CircleAlert size={16} /> {cameraError}</p>}
        {cameraNotice && <p className="camera-message" role="status">{cameraNotice}</p>}
        {cameraState === "error" && <div className="camera-recovery-actions"><button className="button button-secondary" type="button" onClick={() => setCameraRetry((attempt) => attempt + 1)}>Coba lagi</button><button className="button button-quiet" type="button" onClick={() => { setCameraState("idle"); setStage("welcome"); }}>Kembali ke sambutan</button></div>}
      </section>}

      {stage === "review" && previewUrl && <section className="booth-review-stage">
        <div className="review-copy"><span className="booth-overline">MOMEN TERTANGKAP</span><h1>Lihat hasilnya.</h1><p>{reviewCountdown !== null ? `Hasil akan disimpan otomatis dalam ${reviewCountdown} detik.` : "Hasil disimpan di browser ini dan dapat dibuka dari galeri event."}</p>{reviewCountdown !== null && <div className="review-countdown-track" role="status" aria-label={`Simpan otomatis dalam ${reviewCountdown} detik`}><span style={{ width: `${Math.round(reviewProgress * 100)}%` }} /></div>}</div>
        <div className={`review-media review-media-${mediaTypeFor(mode)}${mediaTypeFor(mode) === "video" ? "" : " review-media-template"}`}>{mediaTypeFor(mode) === "video" ? <video src={previewUrl} controls playsInline /> : <TemplatePrintPreview template={event.settings.printTemplate} photoUrl={previewUrl} variant="review" />}</div>
        <div className="review-actions">
          {surveyQuestions.length > 0 && <fieldset className="survey-fieldset">
            <legend className="booth-overline">PERTANYAAN SESI</legend>
            {surveyQuestions.map((question) => <label key={question.id} className="field survey-field"><span>{question.prompt}{question.required ? " *" : ""}</span>{question.type === "choice"
              ? <select value={answers[question.id] ?? ""} onChange={(changeEvent) => setAnswers((current) => ({ ...current, [question.id]: changeEvent.target.value }))}><option value="">Pilih jawaban…</option>{question.choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}</select>
              : <textarea rows={2} maxLength={300} value={answers[question.id] ?? ""} onChange={(changeEvent) => setAnswers((current) => ({ ...current, [question.id]: changeEvent.target.value }))} placeholder="Tulis jawaban singkat…" />}</label>)}
          </fieldset>}
          <div className="review-button-row"><button type="button" className="button button-secondary" onClick={() => { setPendingBlob(null); setReviewCountdown(null); setStage("capture"); }}><RotateCcw size={16} /> Ulangi</button><button type="button" className="button button-primary" onClick={() => void saveResult()} disabled={savingResult || saved}>{savingResult ? "Menyimpan…" : <><Check size={17} /> Simpan hasil</>}</button></div>
          {feedback && <p className="booth-feedback" role="alert">{feedback}</p>}
        </div>
      </section>}

      {stage === "saved" && <section className="booth-saved-stage"><span className="saved-check"><Check size={28} /></span><span className="booth-overline">TERSIMPAN DI EVENT</span><h1>Momen kamu aman.</h1><p>Hasil sesi ini tersedia di galeri event pada browser ini.</p><div className="saved-actions"><Link className="button button-primary" to={`/events/${event.id}/gallery`}><ImagePlus size={17} /> Lihat galeri</Link><button type="button" className="button button-secondary" onClick={() => { setConsent(false); setAnswers({}); setStage("welcome"); }}>Sesi berikutnya</button></div></section>}
      <footer className="booth-footer"><span><Sparkles size={13} /> FLASHFOLD</span><span>Setiap momen punya tempat.</span></footer>

      {pinPrompt === "entry" && !pinUnlocked && <PinGate title="Booth terkunci" subtitle="Masukkan PIN operator untuk membuka booth tamu." expectedHash={event.settings.boothPinHash} onCancel={() => navigate(`/events/${event.id}/setup`)} onUnlocked={() => { setPinUnlocked(true); setPinPrompt(null); }} cancelLabel="Kembali ke pengaturan" />}
      {pinPrompt === "exit" && <PinGate title="Keluar dari booth" subtitle="Masukkan PIN operator untuk menutup sesi tamu." expectedHash={event.settings.boothPinHash} onCancel={() => setPinPrompt(null)} onUnlocked={() => { setPinPrompt(null); navigate(`/events/${event.id}/setup`); }} cancelLabel="Batal" />}
    </main>
  );
}
