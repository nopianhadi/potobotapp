export const GOOGLE_DRIVE_ROOT_FOLDER = "Flashfold Events";
export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_DRIVE_TOKEN_KEY = "flashfold-google-drive-token";

interface GoogleTokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; error_description?: string }) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

export function getGoogleDriveClientId(): string {
  return String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "");
}

export function getGoogleDriveToken(): string | null {
  return localStorage.getItem(GOOGLE_DRIVE_TOKEN_KEY);
}

export function setGoogleDriveToken(token: string | null) {
  if (!token) {
    localStorage.removeItem(GOOGLE_DRIVE_TOKEN_KEY);
    return;
  }
  localStorage.setItem(GOOGLE_DRIVE_TOKEN_KEY, token);
}

export async function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Tidak dapat memuat Google Identity Services.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.dataset.googleIdentity = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Tidak dapat memuat Google Identity Services."));
    document.head.appendChild(script);
  });
}

export async function ensureGoogleDriveAccess(): Promise<string> {
  const clientId = getGoogleDriveClientId();
  if (!clientId) throw new Error("Tambahkan VITE_GOOGLE_CLIENT_ID ke file .env agar Google Drive bisa terhubung.");
  await loadGoogleIdentityScript();

  const existingToken = getGoogleDriveToken();
  if (existingToken) return existingToken;

  const google = window.google;
  if (!google?.accounts?.oauth2) throw new Error("Google Identity Services belum siap.");

  return await new Promise<string>((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || "Autentikasi Google Drive gagal."));
          return;
        }
        if (!response.access_token) {
          reject(new Error("Google Drive tidak mengembalikan token akses."));
          return;
        }
        setGoogleDriveToken(response.access_token);
        resolve(response.access_token);
      },
    });
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

export function disconnectGoogleDrive() {
  setGoogleDriveToken(null);
}

export function formatDriveName(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, "-").trim().slice(0, 80) || "event";
}

export function buildDriveBundle(event: { id: string; title: string; date: string; timezone: string; experience: string; status: string; settings: Record<string, unknown> }, media: Array<{ id: string; type: string; createdAt: string; size: number }>, sessions: Array<{ id: string; mode: string; consent: boolean | null; answer: string; startedAt: string; completedAt: string }>) {
  return {
    eventId: event.id,
    title: event.title,
    date: event.date,
    timezone: event.timezone,
    experience: event.experience,
    status: event.status,
    settings: event.settings,
    exportedAt: new Date().toISOString(),
    media: media.map((item) => ({ id: item.id, type: item.type, createdAt: item.createdAt, size: item.size })),
    sessions: sessions.map((session) => ({ id: session.id, mode: session.mode, consent: session.consent, answer: session.answer, startedAt: session.startedAt, completedAt: session.completedAt })),
  };
}

async function driveRequest<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google Drive error (${response.status}): ${message}`);
  }
  return response.json() as Promise<T>;
}

async function findOrCreateFolderInParent(token: string, parentId: string | undefined, folderName: string): Promise<string> {
  const query = encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${parentId}' in parents` : ""}`);
  const list = await driveRequest<{ files?: Array<{ id: string; name: string }> }>(
    token,
    `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name)&orderBy=name`,
  );

  if (list.files?.[0]?.id) return list.files[0].id;

  const created = await driveRequest<{ id: string }>(token, "https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : [],
    }),
  });
  return created.id;
}

async function uploadFileToFolder(token: string, parentId: string, file: File): Promise<{ id: string; name: string }> {
  const metadata = {
    name: file.name,
    parents: [parentId],
  };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Upload gagal: ${message}`);
  }

  return response.json() as Promise<{ id: string; name: string }>;
}

export async function syncEventToGoogleDrive(input: {
  event: { id: string; title: string; date: string; timezone: string; experience: string; status: string; settings: Record<string, unknown> };
  media: Array<{ id: string; type: string; createdAt: string; size: number; blob?: Blob }>;
  sessions: Array<{ id: string; mode: string; consent: boolean | null; answer: string; startedAt: string; completedAt: string }>;
}): Promise<{ folderId: string; exportFileId: string; mediaCount: number }> {
  const token = await ensureGoogleDriveAccess();
  const rootFolderId = await findOrCreateFolderInParent(token, undefined, GOOGLE_DRIVE_ROOT_FOLDER);
  const eventFolderName = formatDriveName(input.event.title);
  const eventFolderId = await findOrCreateFolderInParent(token, rootFolderId, eventFolderName);

  const metadata = buildDriveBundle(input.event, input.media.map((item) => ({ id: item.id, type: item.type, createdAt: item.createdAt, size: item.size })), input.sessions);
  const metadataFile = new File([JSON.stringify(metadata, null, 2)], `${formatDriveName(eventFolderName)}-event.json`, { type: "application/json" });
  const exportFile = await uploadFileToFolder(token, eventFolderId, metadataFile);

  const mediaFiles = input.media.filter((item) => item.blob instanceof Blob);
  for (const item of mediaFiles) {
    const extension = item.type === "photo" ? "jpg" : item.type === "gif" ? "gif" : "webm";
    const file = new File([item.blob as Blob], `${item.id}.${extension}`, { type: item.blob?.type || "application/octet-stream" });
    await uploadFileToFolder(token, eventFolderId, file);
  }

  return { folderId: eventFolderId, exportFileId: exportFile.id, mediaCount: mediaFiles.length };
}
