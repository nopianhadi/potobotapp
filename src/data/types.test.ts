import { describe, expect, it } from "vitest";
import { defaultEventSettings, normalizeEventSettings, normalizeSurveyQuestions, type CaptureMode } from "./types";

describe("defaultEventSettings", () => {
  it("includes per-event camera and design defaults", () => {
    expect(defaultEventSettings).toMatchObject({
      cameraFacingMode: "user",
      cameraAudioEnabled: false,
      backgroundImage: "",
    });
  });

  it("fills the print layout default for events created before the editor", () => {
    expect(normalizeEventSettings({ layout: "strip" })).toMatchObject({
      layout: "strip",
      printTemplate: defaultEventSettings.printTemplate,
    });
  });
});

describe("normalizeSurveyQuestions", () => {
  it("migrates the legacy single question into a text question", () => {
    const questions = normalizeSurveyQuestions([], "How was the night?");
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({ prompt: "How was the night?", type: "text", required: false });
  });

  it("keeps valid choice questions and drops incomplete ones", () => {
    const questions = normalizeSurveyQuestions([
      { id: "a", prompt: "Pick a band", type: "choice", choices: ["One", " Two ", ""], required: true },
      { id: "b", prompt: "Only one choice", type: "choice", choices: ["Solo"], required: false },
      { prompt: "   ", type: "text", choices: [], required: false },
    ], "");
    expect(questions).toEqual([
      { id: "a", prompt: "Pick a band", type: "choice", choices: ["One", "Two"], required: true },
    ]);
  });

  it("caps the question list at eight entries", () => {
    const many = Array.from({ length: 12 }, (_, index) => ({ prompt: `Question ${index}`, type: "text", choices: [], required: false }));
    expect(normalizeSurveyQuestions(many, "")).toHaveLength(8);
  });
});

describe("normalizeEventSettings limits and green screen", () => {
  it("clamps operational limits into their supported ranges", () => {
    const settings = normalizeEventSettings({
      reviewSeconds: 999,
      sessionLimit: -5,
      maxPrintsPerEvent: 42,
      maxPrintsPerSession: 999,
      slideshowSeconds: 4,
    });
    expect(settings.reviewSeconds).toBe(30);
    expect(settings.sessionLimit).toBe(0);
    expect(settings.maxPrintsPerEvent).toBe(42);
    expect(settings.maxPrintsPerSession).toBe(99);
    expect(settings.slideshowSeconds).toBe(4);
  });

  it("fills green screen defaults and keeps a valid key color", () => {
    const settings = normalizeEventSettings({
      greenScreen: { enabled: true, keyColor: "", tolerance: -1, backgroundImage: "" },
    });
    expect(settings.greenScreen).toMatchObject({ enabled: true, keyColor: "#00B140", tolerance: 90, backgroundImage: "" });
    const withColor = normalizeEventSettings({ greenScreen: { enabled: true, keyColor: "#112233", tolerance: 60, backgroundImage: "" } });
    expect(withColor.greenScreen.keyColor).toBe("#112233");
    expect(withColor.greenScreen.tolerance).toBe(60);
  });

  it("keeps boomerang in enabled modes and falls back to photo when empty", () => {
    expect(normalizeEventSettings({ enabledModes: ["boomerang", "photo"] }).enabledModes).toEqual(["boomerang", "photo"]);
    expect(normalizeEventSettings({ enabledModes: ["hologram" as CaptureMode] }).enabledModes).toEqual(["photo"]);
  });
});
