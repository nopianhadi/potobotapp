export interface CameraRequestResult {
  stream: MediaStream;
  audioAvailable: boolean;
}

export function isExternalCameraDevice(device: Pick<MediaDeviceInfo, "label">): boolean {
  const label = device.label.toLowerCase();
  return /usb|otg|external|webcam|uvc|camlink|logitech|sony|canon|nikon|panasonic|gopro|elgato|obs|streamcam|c922|c920|mirrorless|dslr|capture card|system camera|video camera/i.test(label);
}

export function chooseCameraDevice(
  devices: MediaDeviceInfo[],
  facingMode: "user" | "environment",
  preferredId?: string,
): MediaDeviceInfo | undefined {
  if (preferredId) {
    const existing = devices.find((device) => device.deviceId === preferredId);
    if (existing) return existing;
  }

  const external = devices.filter(isExternalCameraDevice);
  if (external.length > 0) return external[0];

  const relevantLabel = facingMode === "user" ? /front|user|self|facetime|inner/i : /back|rear|environment|world|outer|main/i;
  const byFacing = devices.find((device) => relevantLabel.test(device.label));
  return byFacing ?? devices[0];
}

export async function requestCameraStream(
  mediaDevices: Pick<MediaDevices, "getUserMedia">,
  facingMode: "user" | "environment",
  wantsAudio: boolean,
  deviceId?: string,
): Promise<CameraRequestResult> {
  const baseVideo: MediaTrackConstraints = {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    aspectRatio: { ideal: 1.7777777778 },
    frameRate: { ideal: 24, max: 30 },
  };

  const preferredVideo: MediaTrackConstraints = {
    ...baseVideo,
    facingMode: { ideal: facingMode },
  };

  const deviceSpecificVideo: MediaTrackConstraints = {
    ...baseVideo,
    ...(deviceId ? { deviceId: { ideal: deviceId } } : {}),
  };

  if (deviceId) preferredVideo.deviceId = { ideal: deviceId };

  const attempts: MediaStreamConstraints[] = [
    ...(deviceId ? [{ video: deviceSpecificVideo, audio: wantsAudio }] : []),
    { video: preferredVideo, audio: wantsAudio },
  ];

  if (wantsAudio) {
    attempts.push({ video: { ...baseVideo, facingMode: { ideal: facingMode }, ...(deviceId ? { deviceId: { ideal: deviceId } } : {}) }, audio: false });
    if (deviceId) {
      attempts.push({ video: { ...baseVideo, ...(deviceId ? { deviceId: { ideal: deviceId } } : {}) }, audio: false });
    }
    attempts.push({ video: { facingMode: { ideal: facingMode } }, audio: false });
  }

  if (wantsAudio) {
    attempts.push({ video: true, audio: false });
    attempts.push({ video: { ...baseVideo }, audio: false });
  } else {
    attempts.push({ video: true, audio: false });
    if (deviceId) {
      attempts.push({ video: { ...baseVideo, ...(deviceId ? { deviceId: { ideal: deviceId } } : {}) }, audio: false });
    }
    attempts.push({ video: { facingMode: { ideal: facingMode } }, audio: false });
    attempts.push({ video: { ...baseVideo }, audio: false });
  }

  let lastError: unknown;
  for (const [index, constraints] of attempts.entries()) {
    try {
      const stream = await mediaDevices.getUserMedia(constraints);
      return { stream, audioAvailable: wantsAudio && stream.getAudioTracks().length > 0 };
    } catch (error) {
      lastError = error;
      if (error instanceof DOMException && error.name === "NotAllowedError" && !(wantsAudio && index === 0)) throw error;
    }
  }
  throw lastError ?? new Error("Camera request failed.");
}

export function cameraErrorMessage(error: unknown, secureContext: boolean): string {
  if (!secureContext) return "Browser memblokir kamera pada koneksi ini. Buka aplikasi melalui HTTPS atau localhost.";
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Izin kamera ditolak. Izinkan kamera untuk situs ini di pengaturan browser, lalu coba lagi.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "Kamera tidak ditemukan. Sambungkan kamera atau pilih kamera lain, lalu coba lagi.";
  if (name === "NotReadableError" || name === "TrackStartError") return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut, lalu coba lagi.";
  if (name === "OverconstrainedError") return "Kamera tersedia, tetapi tidak mendukung pengaturan yang diminta. Coba kamera lain.";
  return "Kamera gagal dibuka. Periksa koneksi kamera dan izin browser, lalu coba lagi.";
}