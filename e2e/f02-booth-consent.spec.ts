import { createEvent, expect, resetLocalEvents, test, testPngBytes } from "./fixtures";

test("F02/F05 requires guest consent and shows camera permission recovery", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new DOMException("Permission denied", "NotAllowedError")) },
    });
  });
  await resetLocalEvents(page);
  const eventId = await createEvent(page, "Sesi dengan consent", { consent: true, survey: true });
  await page.goto(`/events/${eventId}/booth`);
  await page.getByRole("button", { name: "Mulai sesi" }).click();
  await expect(page.getByRole("alert")).toContainText("Setujui disclaimer");
  await page.getByRole("checkbox", { name: /I agree/ }).check();
  await page.getByRole("button", { name: "Mulai sesi" }).click();
  await expect(page.getByRole("heading", { name: "Lihat ke kamera." })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Izin kamera ditolak");
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.getByRole("alert")).toContainText("Izin kamera ditolak");
  await expect(page.getByRole("button", { name: "Kembali ke sambutan" })).toBeVisible();
});

test("F02-E3 reports a missing camera and offers retry", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new DOMException("No camera", "NotFoundError")) },
    });
  });
  await resetLocalEvents(page);
  const eventId = await createEvent(page, "Tanpa kamera");
  await page.getByLabel("Gambar latar").setInputFiles({ name: "booth-background.png", mimeType: "image/png", buffer: Buffer.from(testPngBytes) });
  await expect(page.locator(".template-canvas")).toHaveCSS("background-image", /data:image\/png;base64/);
  await page.getByRole("button", { name: "Simpan event" }).click();
  await page.reload();
  await expect(page.locator(".template-canvas")).toHaveCSS("background-image", /data:image\/png;base64/);
  await page.goto(`/events/${eventId}/booth`);
  await expect(page.locator(".booth-page")).toHaveCSS("background-image", /data:image\/png;base64/);
  await page.getByRole("button", { name: "Mulai sesi" }).click();
  await expect(page.getByRole("alert")).toContainText("Kamera tidak ditemukan");
  await expect(page.getByRole("button", { name: "Coba lagi" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kembali ke sambutan" })).toBeVisible();
});

test("F02-H2 attaches the granted camera stream before enabling capture", async ({ page }) => {
  await page.addInitScript(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const context = canvas.getContext("2d");
    context?.fillRect(0, 0, canvas.width, canvas.height);
    const stream = canvas.captureStream(10);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => stream,
        enumerateDevices: async () => [{ deviceId: "fake-camera", kind: "videoinput", label: "Simulated camera", groupId: "fake" }],
      },
    });
  });
  await resetLocalEvents(page);
  const eventId = await createEvent(page, "Preview kamera sintetis");
  await page.getByRole("button", { name: "Dua bingkai" }).click();
  await page.getByRole("button", { name: "Simpan event" }).click();
  await page.goto(`/events/${eventId}/booth`);
  await page.getByRole("button", { name: "Mulai sesi" }).click();
  const preview = page.getByLabel("Preview kamera");
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((video: HTMLVideoElement) => video.videoWidth)).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Ambil foto" })).toBeEnabled();
  await page.getByRole("button", { name: "Ambil foto" }).click();
  await expect(page.getByRole("heading", { name: "Lihat hasilnya." })).toBeVisible({ timeout: 8_000 });
  await expect(page.locator(".review-media-template .template-live-slot img")).toHaveCount(2);
  await page.getByRole("button", { name: "Simpan hasil" }).click();
  await expect(page.getByRole("heading", { name: "Momen kamu aman." })).toBeVisible();
  await page.getByRole("link", { name: "Lihat galeri" }).click();
  await expect(page.getByRole("heading", { name: "Preview kamera sintetis" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Buka photo/ })).toBeVisible();
});