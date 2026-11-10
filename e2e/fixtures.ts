import { expect, test as base, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
    page.on("response", (response) => {
      if (response.status() >= 500) errors.push(`${response.status()}: ${response.url()}`);
    });
    await use(page);
    expect(errors, errors.join("\n")).toEqual([]);
  },
});

export { AxeBuilder, expect };

export const testPngBytes = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 8, 215, 99, 248, 207, 192, 240, 31, 0, 5, 0, 1, 255, 137, 153, 61, 29, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130];

export async function resetLocalEvents(page: Page) {
  await page.goto("/");
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("flashfold-local", 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      database.createObjectStore("events", { keyPath: "id" });
      const mediaStore = database.createObjectStore("media", { keyPath: "id" });
      mediaStore.createIndex("eventId", "eventId", { unique: false });
      const sessionStore = database.createObjectStore("sessions", { keyPath: "id" });
      sessionStore.createIndex("eventId", "eventId", { unique: false });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(["events", "media", "sessions"], "readwrite");
      transaction.objectStore("events").clear();
      transaction.objectStore("media").clear();
      transaction.objectStore("sessions").clear();
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    };
  }));
  await page.reload();
}

export async function createEvent(page: Page, title: string, options: { consent?: boolean; survey?: boolean; gif?: boolean } = {}) {
  await page.getByRole("button", { name: "Event baru" }).click();
  await page.getByLabel(/Nama event/).fill(title);
  if (options.gif) await page.getByRole("button", { name: /GIF Animasi singkat/ }).click();
  if (options.consent) await page.getByRole("checkbox", { name: "Aktifkan disclaimer sebelum sesi" }).check();
  if (options.survey) await page.getByRole("checkbox", { name: "Aktifkan pertanyaan singkat" }).check();
  await page.getByRole("button", { name: "Simpan event" }).click();
  await expect(page.getByRole("heading", { name: "Atur pengalaman booth" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Simpan event" })).toBeEnabled();
  return new URL(page.url()).pathname.split("/")[2];
}

export async function addTestPhoto(page: Page, eventId: string, mediaId = "e2e-photo") {
  await page.evaluate(async ({ eventId, mediaId, bytes }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("flashfold-local", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(["media", "sessions"], "readwrite");
      const now = new Date().toISOString();
      const sessionId = `${mediaId}-session`;
      transaction.objectStore("sessions").add({ id: sessionId, eventId, mode: "photo", consent: null, answer: "", startedAt: now, completedAt: now });
      const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
      transaction.objectStore("media").add({ id: mediaId, eventId, sessionId, type: "photo", blob, createdAt: now, size: blob.size });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    };
  }), { eventId, mediaId, bytes: testPngBytes });
}

export async function checkAccessibility(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}