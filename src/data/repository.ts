import type { BoothEvent, CaptureMode, MediaItem, NewEventInput, PrintRecord, SavedSession, ShareChannel, ShareRecord } from "./types";

export interface AppRepository {
  listEvents(): Promise<BoothEvent[]>;
  getEvent(id: string): Promise<BoothEvent | undefined>;
  saveEvent(input: NewEventInput, id?: string): Promise<BoothEvent>;
  duplicateEvent(id: string): Promise<BoothEvent>;
  deleteEvent(id: string): Promise<void>;
  listMedia(eventId: string): Promise<MediaItem[]>;
  countMedia(eventId: string): Promise<number>;
  getMedia(id: string): Promise<MediaItem | undefined>;
  saveCapture(input: {
    eventId: string;
    mode: CaptureMode;
    mediaType: MediaItem["type"];
    blob: Blob;
    consent: boolean | null;
    answer: string;
    answers: SavedSession["answers"];
    startedAt: string;
  }): Promise<{ media: MediaItem; session: SavedSession }>;
  deleteMedia(id: string): Promise<void>;
  listSessions(eventId: string): Promise<SavedSession[]>;
  recordPrint(input: { eventId: string; mediaId: string; copies: number }): Promise<PrintRecord>;
  listPrints(eventId: string): Promise<PrintRecord[]>;
  recordShare(input: { eventId: string; mediaId: string | null; channel: ShareChannel }): Promise<ShareRecord>;
  listShares(eventId: string): Promise<ShareRecord[]>;
}
