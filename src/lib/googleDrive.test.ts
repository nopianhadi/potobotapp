import { describe, expect, it } from "vitest";
import { buildDriveBundle, formatDriveName } from "./googleDrive";

describe("googleDrive helpers", () => {
  it("sanitizes event folder names for Google Drive", () => {
    expect(formatDriveName("Launch / Event: 2026 ?")).toBe("Launch - Event- 2026 -");
  });

  it("builds a JSON bundle with event, media and session metadata", () => {
    const bundle = buildDriveBundle(
      {
        id: "evt-1",
        title: "Studio launch",
        date: "2026-11-09",
        timezone: "Asia/Jakarta",
        experience: "photo",
        status: "ready",
        settings: { consentEnabled: true },
      },
      [{ id: "med-1", type: "photo", createdAt: "2026-11-09T10:00:00Z", size: 1200 }],
      [{ id: "s-1", mode: "photo", consent: true, answer: "Nice!", startedAt: "2026-11-09T09:00:00Z", completedAt: "2026-11-09T09:00:10Z" }],
    );

    expect(bundle.eventId).toBe("evt-1");
    expect(bundle.media[0].type).toBe("photo");
    expect(bundle.sessions[0].answer).toBe("Nice!");
  });
});
