import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { localRepository } from "./localRepository";
import { defaultEventSettings } from "./types";

async function clearDatabase() {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("flashfold-local");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Database cleanup was blocked."));
  });
}

describe("localRepository", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it("creates, updates, and lists events in most-recently-updated order", async () => {
    const first = await localRepository.saveEvent({
      title: "Evening reception",
      date: "2026-11-07",
      experience: "photo",
      settings: defaultEventSettings,
    });
    const updated = await localRepository.saveEvent({
      title: "Garden reception",
      date: "2026-11-08",
      experience: "photo",
      settings: defaultEventSettings,
    }, first.id);

    expect(updated.id).toBe(first.id);
    expect(updated.createdAt).toBe(first.createdAt);
    expect(updated.title).toBe("Garden reception");
    expect((await localRepository.listEvents()).map((event) => event.id)).toEqual([first.id]);
  });

  it("saves media and session metadata together", async () => {
    const event = await localRepository.saveEvent({
      title: "Studio test",
      date: "2026-11-07",
      experience: "photo",
      settings: defaultEventSettings,
    });
    const blob = new Blob(["photo bytes"], { type: "image/jpeg" });
    const saved = await localRepository.saveCapture({
      eventId: event.id,
      mode: "photo",
      mediaType: "photo",
      blob,
      consent: true,
      answer: "A lovely evening",
      answers: [{ questionId: "q1", prompt: "How was it?", answer: "A lovely evening" }],
      startedAt: new Date().toISOString(),
    });

    expect((await localRepository.listMedia(event.id))[0]).toMatchObject({
      id: saved.media.id,
      sessionId: saved.session.id,
      size: blob.size,
    });
    expect(await localRepository.countMedia(event.id)).toBe(1);
    expect((await localRepository.listSessions(event.id))[0]).toMatchObject({
      id: saved.session.id,
      consent: true,
      answer: "A lovely evening",
    });
    expect(saved.session.answers).toEqual([{ questionId: "q1", prompt: "How was it?", answer: "A lovely evening" }]);
  });

  it("keeps boomerang captures as gif media", async () => {
    const event = await localRepository.saveEvent({
      title: "Boomerang night",
      date: "2026-11-09",
      experience: "boomerang",
      settings: defaultEventSettings,
    });
    const saved = await localRepository.saveCapture({
      eventId: event.id,
      mode: "boomerang",
      mediaType: "gif",
      blob: new Blob(["gif bytes"], { type: "image/gif" }),
      consent: null,
      answer: "",
      answers: [],
      startedAt: new Date().toISOString(),
    });

    expect(saved.media.type).toBe("gif");
    expect(saved.session.mode).toBe("boomerang");
  });

  it("records prints and shares and removes them with the event", async () => {
    const event = await localRepository.saveEvent({
      title: "Print night",
      date: "2026-11-09",
      experience: "photo",
      settings: defaultEventSettings,
    });
    const saved = await localRepository.saveCapture({
      eventId: event.id,
      mode: "photo",
      mediaType: "photo",
      blob: new Blob(["image"], { type: "image/jpeg" }),
      consent: null,
      answer: "",
      answers: [],
      startedAt: new Date().toISOString(),
    });

    const print = await localRepository.recordPrint({ eventId: event.id, mediaId: saved.media.id, copies: 2 });
    const share = await localRepository.recordShare({ eventId: event.id, mediaId: null, channel: "qr" });

    expect(print.copies).toBe(2);
    expect(share.channel).toBe("qr");
    expect((await localRepository.listPrints(event.id)).map((entry) => entry.id)).toEqual([print.id]);
    expect((await localRepository.listShares(event.id)).map((entry) => entry.id)).toEqual([share.id]);

    await localRepository.deleteEvent(event.id);

    expect(await localRepository.listPrints(event.id)).toEqual([]);
    expect(await localRepository.listShares(event.id)).toEqual([]);
  });

  it("removes print and share records when media is deleted", async () => {
    const event = await localRepository.saveEvent({
      title: "Cleanup night",
      date: "2026-11-09",
      experience: "photo",
      settings: defaultEventSettings,
    });
    const saved = await localRepository.saveCapture({
      eventId: event.id,
      mode: "photo",
      mediaType: "photo",
      blob: new Blob(["image"], { type: "image/jpeg" }),
      consent: null,
      answer: "",
      answers: [],
      startedAt: new Date().toISOString(),
    });
    await localRepository.recordPrint({ eventId: event.id, mediaId: saved.media.id, copies: 1 });
    await localRepository.recordShare({ eventId: event.id, mediaId: saved.media.id, channel: "download" });

    await localRepository.deleteMedia(saved.media.id);

    expect(await localRepository.listPrints(event.id)).toEqual([]);
    expect(await localRepository.listShares(event.id)).toEqual([]);
    expect(await localRepository.getMedia(saved.media.id)).toBeUndefined();
  });

  it("duplicates event settings without copying captured media", async () => {
    const source = await localRepository.saveEvent({
      title: "Original evening",
      date: "2026-11-07",
      experience: "photo",
      settings: { ...defaultEventSettings, welcomeMessage: "A different welcome" },
    });
    await localRepository.saveCapture({
      eventId: source.id,
      mode: "photo",
      mediaType: "photo",
      blob: new Blob(["image"], { type: "image/jpeg" }),
      consent: null,
      answer: "",
      answers: [],
      startedAt: new Date().toISOString(),
    });

    const copy = await localRepository.duplicateEvent(source.id);

    expect(copy.id).not.toBe(source.id);
    expect(copy.title).toBe("Original evening (salinan)");
    expect(copy.status).toBe("draft");
    expect(copy.settings.welcomeMessage).toBe("A different welcome");
    expect(await localRepository.listMedia(copy.id)).toEqual([]);
    expect(await localRepository.listSessions(copy.id)).toEqual([]);
  });

  it("removes an event and its related local media and sessions", async () => {
    const event = await localRepository.saveEvent({
      title: "Delete me",
      date: "2026-11-07",
      experience: "photo",
      settings: defaultEventSettings,
    });
    const saved = await localRepository.saveCapture({
      eventId: event.id,
      mode: "photo",
      mediaType: "photo",
      blob: new Blob(["image"], { type: "image/jpeg" }),
      consent: null,
      answer: "",
      answers: [],
      startedAt: new Date().toISOString(),
    });

    await localRepository.deleteEvent(event.id);

    expect(await localRepository.getEvent(event.id)).toBeUndefined();
    expect(await localRepository.getMedia(saved.media.id)).toBeUndefined();
    expect(await localRepository.listSessions(event.id)).toEqual([]);
  });
});
