import { normalizeEventSettings, sessionAnswersText, type BoothEvent, type MediaItem, type PrintRecord, type SavedSession, type ShareRecord } from "./types";
import type { AppRepository } from "./repository";

const databaseName = "flashfold-local";
const databaseVersion = 2;

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `ff-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("events")) database.createObjectStore("events", { keyPath: "id" });
      if (!database.objectStoreNames.contains("media")) {
        const mediaStore = database.createObjectStore("media", { keyPath: "id" });
        mediaStore.createIndex("eventId", "eventId", { unique: false });
      }
      if (!database.objectStoreNames.contains("sessions")) {
        const sessionStore = database.createObjectStore("sessions", { keyPath: "id" });
        sessionStore.createIndex("eventId", "eventId", { unique: false });
      }
      if (!database.objectStoreNames.contains("prints")) {
        const printStore = database.createObjectStore("prints", { keyPath: "id" });
        printStore.createIndex("eventId", "eventId", { unique: false });
      }
      if (!database.objectStoreNames.contains("shares")) {
        const shareStore = database.createObjectStore("shares", { keyPath: "id" });
        shareStore.createIndex("eventId", "eventId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local event storage."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local storage request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Local storage transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local storage transaction was cancelled."));
  });
}

export const localRepository: AppRepository = {
  async listEvents() {
    const database = await openDatabase();
    const result = await requestResult<BoothEvent[]>(database.transaction("events").objectStore("events").getAll());
    database.close();
    return result.map((event) => ({ ...event, settings: normalizeEventSettings(event.settings) }))
      .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
  },

  async getEvent(id) {
    const database = await openDatabase();
    const result = await requestResult<BoothEvent | undefined>(database.transaction("events").objectStore("events").get(id));
    database.close();
    return result ? { ...result, settings: normalizeEventSettings(result.settings) } : result;
  },

  async saveEvent(input, id) {
    const database = await openDatabase();
    const existing = id
      ? await requestResult<BoothEvent | undefined>(database.transaction("events").objectStore("events").get(id))
      : undefined;
    const now = new Date().toISOString();
    const event: BoothEvent = {
      id: existing?.id ?? makeId(),
      title: input.title.trim(),
      date: input.date,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      experience: input.experience,
      status: input.status ?? existing?.status ?? "draft",
      settings: structuredClone(normalizeEventSettings(input.settings)),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const transaction = database.transaction("events", "readwrite");
    transaction.objectStore("events").put(event);
    await transactionDone(transaction);
    database.close();
    return event;
  },

  async duplicateEvent(id) {
    const source = await this.getEvent(id);
    if (!source) throw new Error("Event tidak ditemukan.");
    return this.saveEvent({
      title: `${source.title} (salinan)`,
      date: source.date,
      experience: source.experience,
      settings: structuredClone(source.settings),
      status: "draft",
    });
  },

  async deleteEvent(id) {
    const database = await openDatabase();
    const transaction = database.transaction(["events", "media", "sessions", "prints", "shares"], "readwrite");
    const mediaStore = transaction.objectStore("media");
    const sessionStore = transaction.objectStore("sessions");
    const printStore = transaction.objectStore("prints");
    const shareStore = transaction.objectStore("shares");
    const media = await requestResult<MediaItem[]>(mediaStore.index("eventId").getAll(id));
    const sessions = await requestResult<SavedSession[]>(sessionStore.index("eventId").getAll(id));
    const prints = await requestResult<PrintRecord[]>(printStore.index("eventId").getAll(id));
    const shares = await requestResult<ShareRecord[]>(shareStore.index("eventId").getAll(id));
    for (const item of media) mediaStore.delete(item.id);
    for (const session of sessions) sessionStore.delete(session.id);
    for (const print of prints) printStore.delete(print.id);
    for (const share of shares) shareStore.delete(share.id);
    transaction.objectStore("events").delete(id);
    await transactionDone(transaction);
    database.close();
  },

  async listMedia(eventId) {
    const database = await openDatabase();
    const result = await requestResult<MediaItem[]>(database.transaction("media").objectStore("media").index("eventId").getAll(eventId));
    database.close();
    return result.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  },

  async countMedia(eventId) {
    const database = await openDatabase();
    const count = await requestResult<number>(database.transaction("media").objectStore("media").index("eventId").count(eventId));
    database.close();
    return count;
  },

  async getMedia(id) {
    const database = await openDatabase();
    const result = await requestResult<MediaItem | undefined>(database.transaction("media").objectStore("media").get(id));
    database.close();
    return result;
  },

  async saveCapture(input) {
    const database = await openDatabase();
    const now = new Date().toISOString();
    const answers = input.answers.map((entry) => ({ ...entry, answer: entry.answer.trim().slice(0, 300) }));
    const session: SavedSession = {
      id: makeId(),
      eventId: input.eventId,
      mode: input.mode,
      consent: input.consent,
      answer: sessionAnswersText(answers) || input.answer.trim(),
      answers,
      startedAt: input.startedAt,
      completedAt: now,
    };
    const media: MediaItem = {
      id: makeId(),
      eventId: input.eventId,
      sessionId: session.id,
      type: input.mediaType,
      blob: input.blob,
      createdAt: now,
      size: input.blob.size,
    };
    const transaction = database.transaction(["media", "sessions"], "readwrite");
    transaction.objectStore("media").add(media);
    transaction.objectStore("sessions").add(session);
    await transactionDone(transaction);
    database.close();
    return { media, session };
  },

  async deleteMedia(id) {
    const database = await openDatabase();
    const transaction = database.transaction(["media", "prints", "shares"], "readwrite");
    const mediaStore = transaction.objectStore("media");
    const prints = await requestResult<PrintRecord[]>(transaction.objectStore("prints").getAll());
    const shares = await requestResult<ShareRecord[]>(transaction.objectStore("shares").getAll());
    for (const print of prints) if (print.mediaId === id) transaction.objectStore("prints").delete(print.id);
    for (const share of shares) if (share.mediaId === id) transaction.objectStore("shares").delete(share.id);
    mediaStore.delete(id);
    await transactionDone(transaction);
    database.close();
  },

  async listSessions(eventId) {
    const database = await openDatabase();
    const result = await requestResult<SavedSession[]>(database.transaction("sessions").objectStore("sessions").index("eventId").getAll(eventId));
    database.close();
    return result.sort((first, second) => second.completedAt.localeCompare(first.completedAt));
  },

  async recordPrint(input) {
    const database = await openDatabase();
    const now = new Date().toISOString();
    const record: PrintRecord = {
      id: makeId(),
      eventId: input.eventId,
      mediaId: input.mediaId,
      copies: Math.max(1, Math.floor(input.copies) || 1),
      createdAt: now,
    };
    const transaction = database.transaction("prints", "readwrite");
    transaction.objectStore("prints").add(record);
    await transactionDone(transaction);
    database.close();
    return record;
  },

  async listPrints(eventId) {
    const database = await openDatabase();
    const result = await requestResult<PrintRecord[]>(database.transaction("prints").objectStore("prints").index("eventId").getAll(eventId));
    database.close();
    return result.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  },

  async recordShare(input) {
    const database = await openDatabase();
    const now = new Date().toISOString();
    const record: ShareRecord = {
      id: makeId(),
      eventId: input.eventId,
      mediaId: input.mediaId,
      channel: input.channel,
      createdAt: now,
    };
    const transaction = database.transaction("shares", "readwrite");
    transaction.objectStore("shares").add(record);
    await transactionDone(transaction);
    database.close();
    return record;
  },

  async listShares(eventId) {
    const database = await openDatabase();
    const result = await requestResult<ShareRecord[]>(database.transaction("shares").objectStore("shares").index("eventId").getAll(eventId));
    database.close();
    return result.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  },
};
