import { addTestPhoto, createEvent, expect, resetLocalEvents, test, testPngBytes } from "./fixtures";

test("F04 opens a print-ready media page", async ({ page }) => {
  await resetLocalEvents(page);
  const eventId = await createEvent(page, "Cetak uji browser");
  await page.getByLabel("Gambar latar").setInputFiles({ name: "print-background.png", mimeType: "image/png", buffer: Buffer.from(testPngBytes) });
  await expect(page.locator(".template-canvas")).toHaveCSS("background-image", /data:image\/png;base64/);
  await page.getByRole("button", { name: "Simpan event" }).click();
  await page.reload();
  await expect(page.locator(".template-canvas")).toHaveCSS("background-image", /data:image\/png;base64/);
  await addTestPhoto(page, eventId);
  await page.goto(`/events/${eventId}/gallery`);
  await page.getByRole("button", { name: /Buka photo/ }).click();
  await page.evaluate(() => {
    const openWindow = window.open.bind(window);
    window.open = (url, target, features) => {
      const popup = openWindow(url, target, features);
      if (popup) popup.print = () => undefined;
      return popup;
    };
  });
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Cetak" }).click();
  const popup = await popupPromise;
  await expect(popup.locator(".print-background")).toHaveCount(1);
  await expect(popup.locator(".print-background")).toHaveAttribute("src", /^data:image\/png;base64,/);
  await expect(page.getByRole("status")).toContainText("Dialog cetak dibuka");
});