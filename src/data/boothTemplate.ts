import { parse, stringify } from "yaml";
import type { CaptureMode, EventSettings, SurveyQuestion } from "./types";
import { isPrintTemplate } from "./printTemplate";

const modes = new Set<CaptureMode>(["photo", "gif", "boomerang", "video", "360"]);
const layouts = new Set<EventSettings["layout"]>(["classic", "strip", "portrait"]);

export function createBoothTemplateMarkdown(settings: EventSettings): string {
  const metadata = {
    accentColor: settings.accentColor,
    welcomeMessage: settings.welcomeMessage,
    layout: settings.layout,
    consentEnabled: settings.consentEnabled,
    consentText: settings.consentText,
    surveyEnabled: settings.surveyEnabled,
    surveyQuestions: settings.surveyQuestions,
    enabledModes: settings.enabledModes,
    cameraFacingMode: settings.cameraFacingMode,
    cameraAudioEnabled: settings.cameraAudioEnabled,
    reviewSeconds: settings.reviewSeconds,
    sessionLimit: settings.sessionLimit,
    maxPrintsPerEvent: settings.maxPrintsPerEvent,
    maxPrintsPerSession: settings.maxPrintsPerSession,
    slideshowEnabled: settings.slideshowEnabled,
    slideshowSeconds: settings.slideshowSeconds,
    greenScreen: settings.greenScreen,
    printTemplate: settings.printTemplate,
  };
  return `---\n${stringify(metadata)}---\n\n# Template Booth\n\nEdit nilai di bagian metadata, lalu terapkan di pengaturan event.\n`;
}

function parseCount(value: unknown, name: string, maximum: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${name} harus berupa angka 0 atau lebih besar.`);
  return Math.min(Math.floor(parsed), maximum);
}

function parseSurveyQuestions(value: unknown): SurveyQuestion[] {
  if (!Array.isArray(value)) throw new Error("surveyQuestions harus berupa daftar pertanyaan.");
  const questions: SurveyQuestion[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") throw new Error("Setiap pertanyaan harus memiliki prompt.");
    const question = entry as Partial<SurveyQuestion>;
    const prompt = typeof question.prompt === "string" ? question.prompt.trim() : "";
    if (!prompt) throw new Error("Setiap pertanyaan harus memiliki prompt yang tidak kosong.");
    const type = question.type === "choice" ? "choice" : "text";
    const choices = Array.isArray(question.choices)
      ? question.choices.map((choice) => String(choice).trim()).filter(Boolean)
      : [];
    if (type === "choice" && choices.length < 2) throw new Error("Pertanyaan pilihan harus memiliki minimal dua pilihan.");
    questions.push({
      id: typeof question.id === "string" && question.id.trim() ? question.id.trim() : `question-${questions.length + 1}`,
      prompt: prompt.slice(0, 140),
      type,
      choices: choices.slice(0, 6),
      required: question.required === true,
    });
  }
  return questions.slice(0, 8);
}

export function applyBoothTemplateMarkdown(markdown: string, current: EventSettings): EventSettings {
  const frontmatter = markdown.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!frontmatter) throw new Error("Template harus memiliki metadata YAML di antara dua baris ---.");

  let parsed: unknown;
  try {
    parsed = parse(frontmatter[1]);
  } catch {
    throw new Error("Metadata YAML tidak valid. Periksa format dan tanda kutipnya.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Metadata template harus berupa daftar pengaturan.");
  }

  const values = parsed as Record<string, unknown>;
  const allowedKeys = new Set([
    "accentColor", "welcomeMessage", "layout", "consentEnabled", "consentText",
    "surveyEnabled", "surveyQuestion", "surveyQuestions", "enabledModes", "cameraFacingMode", "cameraAudioEnabled",
    "reviewSeconds", "sessionLimit", "maxPrintsPerEvent", "maxPrintsPerSession",
    "slideshowEnabled", "slideshowSeconds", "greenScreen", "printTemplate",
  ]);
  const unknownKey = Object.keys(values).find((key) => !allowedKeys.has(key));
  if (unknownKey) throw new Error(`Pengaturan template tidak dikenal: ${unknownKey}.`);

  const result = structuredClone(current);
  if ("accentColor" in values) {
    if (typeof values.accentColor !== "string" || !/^#[\da-fA-F]{6}$/.test(values.accentColor)) throw new Error("accentColor harus berupa warna hex, contoh #246A5A.");
    result.accentColor = values.accentColor;
  }
  if ("welcomeMessage" in values) {
    if (typeof values.welcomeMessage !== "string") throw new Error("welcomeMessage harus berupa teks.");
    result.welcomeMessage = values.welcomeMessage;
  }
  if ("layout" in values) {
    if (typeof values.layout !== "string" || !layouts.has(values.layout as EventSettings["layout"])) throw new Error("layout harus classic, strip, atau portrait.");
    result.layout = values.layout as EventSettings["layout"];
  }
  if ("consentEnabled" in values) {
    if (typeof values.consentEnabled !== "boolean") throw new Error("consentEnabled harus true atau false.");
    result.consentEnabled = values.consentEnabled;
  }
  if ("consentText" in values) {
    if (typeof values.consentText !== "string") throw new Error("consentText harus berupa teks.");
    result.consentText = values.consentText;
  }
  if ("surveyEnabled" in values) {
    if (typeof values.surveyEnabled !== "boolean") throw new Error("surveyEnabled harus true atau false.");
    result.surveyEnabled = values.surveyEnabled;
  }
  if ("surveyQuestion" in values) {
    if (typeof values.surveyQuestion !== "string") throw new Error("surveyQuestion harus berupa teks.");
    result.surveyQuestion = values.surveyQuestion;
  }
  if ("surveyQuestions" in values) {
    result.surveyQuestions = parseSurveyQuestions(values.surveyQuestions);
    if (result.surveyQuestions.length > 0) result.surveyQuestion = result.surveyQuestions[0].prompt;
  }
  if ("enabledModes" in values) {
    if (!Array.isArray(values.enabledModes) || values.enabledModes.length === 0 || !values.enabledModes.every((mode) => typeof mode === "string" && modes.has(mode as CaptureMode))) {
      throw new Error("enabledModes harus berisi minimal satu mode: photo, gif, boomerang, video, atau 360.");
    }
    result.enabledModes = values.enabledModes as CaptureMode[];
  }
  if ("cameraFacingMode" in values) {
    if (values.cameraFacingMode !== "user" && values.cameraFacingMode !== "environment") throw new Error("cameraFacingMode harus user atau environment.");
    result.cameraFacingMode = values.cameraFacingMode;
  }
  if ("cameraAudioEnabled" in values) {
    if (typeof values.cameraAudioEnabled !== "boolean") throw new Error("cameraAudioEnabled harus true atau false.");
    result.cameraAudioEnabled = values.cameraAudioEnabled;
  }
  if ("reviewSeconds" in values) result.reviewSeconds = parseCount(values.reviewSeconds, "reviewSeconds", 30);
  if ("sessionLimit" in values) result.sessionLimit = parseCount(values.sessionLimit, "sessionLimit", 9999);
  if ("maxPrintsPerEvent" in values) result.maxPrintsPerEvent = parseCount(values.maxPrintsPerEvent, "maxPrintsPerEvent", 9999);
  if ("maxPrintsPerSession" in values) result.maxPrintsPerSession = parseCount(values.maxPrintsPerSession, "maxPrintsPerSession", 99);
  if ("slideshowEnabled" in values) {
    if (typeof values.slideshowEnabled !== "boolean") throw new Error("slideshowEnabled harus true atau false.");
    result.slideshowEnabled = values.slideshowEnabled;
  }
  if ("slideshowSeconds" in values) result.slideshowSeconds = parseCount(values.slideshowSeconds, "slideshowSeconds", 30);
  if ("greenScreen" in values) {
    if (!values.greenScreen || typeof values.greenScreen !== "object") throw new Error("greenScreen harus berupa pengaturan lengkap.");
    const greenScreen = values.greenScreen as Record<string, unknown>;
    if (typeof greenScreen.enabled !== "boolean") throw new Error("greenScreen.enabled harus true atau false.");
    if (typeof greenScreen.keyColor !== "string" || !/^#[\da-fA-F]{6}$/.test(greenScreen.keyColor)) throw new Error("greenScreen.keyColor harus berupa warna hex.");
    result.greenScreen = {
      enabled: greenScreen.enabled,
      keyColor: greenScreen.keyColor,
      tolerance: parseCount(greenScreen.tolerance, "greenScreen.tolerance", 180),
      backgroundImage: typeof greenScreen.backgroundImage === "string" ? greenScreen.backgroundImage : "",
    };
  }
  if ("printTemplate" in values) {
    if (!isPrintTemplate(values.printTemplate)) throw new Error("printTemplate harus memiliki ukuran kertas dan slot foto yang valid.");
    result.printTemplate = {
      ...current.printTemplate,
      ...values.printTemplate,
      backgroundImage: values.printTemplate.backgroundImage ?? "",
    };
  }
  return result;
}
