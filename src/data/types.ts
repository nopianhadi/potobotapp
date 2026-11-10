export type CaptureMode = "photo" | "gif" | "boomerang" | "video" | "360";
export type MediaType = "photo" | "gif" | "video";
export type PrintPaperSize = "4x6" | "2x6";

export interface PrintPhotoSlot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sourceIndex?: 0 | 1;
}

export interface PrintTemplate {
  paperSize: PrintPaperSize;
  backgroundColor: string;
  backgroundImage: string;
  slots: PrintPhotoSlot[];
}

export type SurveyQuestionType = "text" | "choice";

export interface SurveyQuestion {
  id: string;
  prompt: string;
  type: SurveyQuestionType;
  choices: string[];
  required: boolean;
}

export interface SurveyAnswer {
  questionId: string;
  prompt: string;
  answer: string;
}

export interface GreenScreenSettings {
  enabled: boolean;
  keyColor: string;
  tolerance: number;
  backgroundImage: string;
}

export interface EventSettings {
  accentColor: string;
  welcomeMessage: string;
  layout: "classic" | "strip" | "portrait";
  backgroundImage: string;
  consentEnabled: boolean;
  consentText: string;
  surveyEnabled: boolean;
  surveyQuestion: string;
  surveyQuestions: SurveyQuestion[];
  enabledModes: CaptureMode[];
  cameraFacingMode: "user" | "environment";
  cameraAudioEnabled: boolean;
  reviewSeconds: number;
  sessionLimit: number;
  maxPrintsPerEvent: number;
  maxPrintsPerSession: number;
  slideshowEnabled: boolean;
  slideshowSeconds: number;
  boothPinHash: string;
  greenScreen: GreenScreenSettings;
  printTemplate: PrintTemplate;
}

export interface BoothEvent {
  id: string;
  title: string;
  date: string;
  timezone: string;
  experience: CaptureMode;
  status: "draft" | "ready" | "active" | "completed" | "archived";
  settings: EventSettings;
  createdAt: string;
  updatedAt: string;
}

export interface SavedSession {
  id: string;
  eventId: string;
  mode: CaptureMode;
  consent: boolean | null;
  answer: string;
  answers: SurveyAnswer[];
  startedAt: string;
  completedAt: string;
}

export interface MediaItem {
  id: string;
  eventId: string;
  sessionId: string;
  type: MediaType;
  blob: Blob;
  createdAt: string;
  size: number;
}

export type ShareChannel = "download" | "web_share" | "qr";

export interface ShareRecord {
  id: string;
  eventId: string;
  mediaId: string | null;
  channel: ShareChannel;
  createdAt: string;
}

export interface PrintRecord {
  id: string;
  eventId: string;
  mediaId: string;
  copies: number;
  createdAt: string;
}

export interface NewEventInput {
  title: string;
  date: string;
  experience: CaptureMode;
  settings: EventSettings;
  status?: BoothEvent["status"];
}

export const defaultEventSettings: EventSettings = {
  accentColor: "#246A5A",
  welcomeMessage: "Satu momen untuk dikenang",
  layout: "classic",
  backgroundImage: "",
  consentEnabled: false,
  consentText: "I agree that my photos may be included in this event gallery.",
  surveyEnabled: false,
  surveyQuestion: "What should we remember about tonight?",
  surveyQuestions: [],
  enabledModes: ["photo"],
  cameraFacingMode: "user",
  cameraAudioEnabled: false,
  reviewSeconds: 0,
  sessionLimit: 0,
  maxPrintsPerEvent: 0,
  maxPrintsPerSession: 0,
  slideshowEnabled: false,
  slideshowSeconds: 5,
  boothPinHash: "",
  greenScreen: { enabled: false, keyColor: "#00B140", tolerance: 90, backgroundImage: "" },
  printTemplate: {
    paperSize: "4x6",
    backgroundColor: "#FFFFFF",
    backgroundImage: "",
    slots: [{ id: "photo-1", x: 8, y: 8, width: 84, height: 84 }],
  },
};

const hexColorPattern = /^#[\da-fA-F]{6}$/;

function clampCount(value: unknown, fallback: number, maximum: number): number {
  const parsed = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), maximum);
}

export function normalizeSurveyQuestions(input: unknown, legacyQuestion: string): SurveyQuestion[] {
  const raw = Array.isArray(input) ? input : [];
  const questions: SurveyQuestion[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const question = entry as Partial<SurveyQuestion>;
    const prompt = typeof question.prompt === "string" ? question.prompt.trim().slice(0, 140) : "";
    if (!prompt) continue;
    const type = question.type === "choice" ? "choice" : "text";
    const choices = Array.isArray(question.choices)
      ? question.choices.filter((choice): choice is string => typeof choice === "string" && choice.trim().length > 0).map((choice) => choice.trim().slice(0, 60)).slice(0, 6)
      : [];
    if (type === "choice" && choices.length < 2) continue;
    questions.push({
      id: typeof question.id === "string" && question.id.trim() ? question.id.trim() : makeQuestionId(),
      prompt,
      type,
      choices,
      required: question.required === true,
    });
  }
  if (questions.length === 0 && legacyQuestion.trim()) {
    questions.push({ id: makeQuestionId(), prompt: legacyQuestion.trim().slice(0, 140), type: "text", choices: [], required: false });
  }
  return questions.slice(0, 8);
}

let questionCounter = 0;
export function makeQuestionId(): string {
  questionCounter += 1;
  return `question-${Date.now().toString(36)}-${questionCounter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function sessionAnswersText(answers: SurveyAnswer[]): string {
  return answers.map((entry) => entry.answer.trim()).filter(Boolean).join(" · ").slice(0, 300);
}

export function normalizeEventSettings(settings: Partial<EventSettings> = {}): EventSettings {
  const legacyQuestion = typeof settings.surveyQuestion === "string" ? settings.surveyQuestion : "";
  const greenScreenInput: Partial<GreenScreenSettings> = settings.greenScreen && typeof settings.greenScreen === "object" ? settings.greenScreen : {};
  const normalized: EventSettings = {
    ...defaultEventSettings,
    ...settings,
    surveyQuestions: normalizeSurveyQuestions(settings.surveyQuestions, legacyQuestion),
    enabledModes: Array.isArray(settings.enabledModes)
      ? settings.enabledModes.filter((mode): mode is CaptureMode => ["photo", "gif", "boomerang", "video", "360"].includes(mode))
      : [],
    reviewSeconds: clampCount(settings.reviewSeconds, defaultEventSettings.reviewSeconds, 30),
    sessionLimit: clampCount(settings.sessionLimit, defaultEventSettings.sessionLimit, 9999),
    maxPrintsPerEvent: clampCount(settings.maxPrintsPerEvent, defaultEventSettings.maxPrintsPerEvent, 9999),
    maxPrintsPerSession: clampCount(settings.maxPrintsPerSession, defaultEventSettings.maxPrintsPerSession, 99),
    slideshowSeconds: clampCount(settings.slideshowSeconds, defaultEventSettings.slideshowSeconds, 30),
    boothPinHash: typeof settings.boothPinHash === "string" ? settings.boothPinHash : "",
    greenScreen: {
      enabled: greenScreenInput.enabled === true,
      keyColor: typeof greenScreenInput.keyColor === "string" && hexColorPattern.test(greenScreenInput.keyColor) ? greenScreenInput.keyColor : defaultEventSettings.greenScreen.keyColor,
      tolerance: clampCount(greenScreenInput.tolerance, defaultEventSettings.greenScreen.tolerance, 180),
      backgroundImage: typeof greenScreenInput.backgroundImage === "string" ? greenScreenInput.backgroundImage : "",
    },
    printTemplate: settings.printTemplate
      ? { ...structuredClone(defaultEventSettings.printTemplate), ...structuredClone(settings.printTemplate), backgroundImage: settings.printTemplate.backgroundImage ?? "" }
      : structuredClone(defaultEventSettings.printTemplate),
  };
  if (normalized.enabledModes.length === 0) normalized.enabledModes = ["photo"];
  return normalized;
}
