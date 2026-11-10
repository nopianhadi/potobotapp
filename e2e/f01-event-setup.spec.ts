import { checkAccessibility, createEvent, expect, resetLocalEvents, test, testPngBytes } from "./fixtures";

test("F01-H1 creates an event, saves its modes, and remains usable on mobile", async ({ page }) => {
  await resetLocalEvents(page);
  await checkAccessibility(page);
  const eventId = await createEvent(page, "Acara uji browser", { gif: true, consent: true, survey: true });
  await expect(page.getByRole("heading", { name: "Atur pengalaman booth" })).toBeVisible();
  await page.getByRole("button", { name: "Strip tiga foto" }).click();
  await expect(page.locator(".template-photo-slot")).toHaveCount(3);
  await expect(page.locator(".template-live-preview.is-strip .template-live-slot")).toHaveCount(3);
  await page.getByRole("button", { name: "Tambah foto" }).click();
  await expect(page.locator(".template-photo-slot")).toHaveCount(4);
  await page.getByLabel("Gambar latar").setInputFiles({
    name: "print-background.png",
    mimeType: "image/png",
    buffer: Buffer.from(testPngBytes),
  });
  await expect(page.locator(".template-canvas")).toHaveCSS("background-image", /data:image\/png;base64/);
  await expect(page.locator(".template-live-preview")).toHaveCSS("background-image", /data:image\/png;base64/);
  await page.getByRole("button", { name: "Sambutan" }).click();
  await expect(page.getByText("Pratinjau sambutan")).toBeVisible();
  await page.getByRole("button", { name: "Cetak" }).click();
  await page.getByRole("button", { name: "Simpan event" }).click();
  await checkAccessibility(page);

  await page.reload();
  await expect(page.getByLabel(/Nama event/)).toHaveValue("Acara uji browser");
  await expect(page.locator(".template-canvas.is-strip")).toBeVisible();
  await expect(page.locator(".template-photo-slot")).toHaveCount(4);
  await expect(page.locator(".template-canvas")).toHaveCSS("background-image", /data:image\/png;base64/);
  await expect(page.getByRole("checkbox", { name: "Aktifkan disclaimer sebelum sesi" })).toBeChecked();
  await page.getByRole("button", { name: "Duplikasi" }).click();
  await expect(page.getByLabel(/Nama event/)).toHaveValue("Acara uji browser (salinan)");
  await expect(page.locator(".template-photo-slot")).toHaveCount(4);
  await expect(page.getByRole("checkbox", { name: "Aktifkan pertanyaan singkat" })).toBeChecked();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:4173/");
  await expect(page.getByText("Acara uji browser", { exact: true }).first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("navigation", { name: "Navigasi bawah" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto(`/events/${eventId}/booth`);
  await expect(page.getByRole("button", { name: /GIF/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Satu momen untuk dikenang" })).toBeVisible();
});