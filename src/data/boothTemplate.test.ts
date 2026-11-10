import { describe, expect, it } from "vitest";
import { applyBoothTemplateMarkdown, createBoothTemplateMarkdown } from "./boothTemplate";
import { printTemplatePresets } from "./printTemplate";
import { defaultEventSettings, type EventSettings } from "./types";

describe("booth template Markdown", () => {
  it("round-trips booth settings through Markdown front matter", () => {
    const settings: EventSettings = { ...defaultEventSettings, layout: "strip", enabledModes: ["photo", "gif"], printTemplate: printTemplatePresets[2].template };
    const result = applyBoothTemplateMarkdown(createBoothTemplateMarkdown(settings), defaultEventSettings);

    expect(result).toEqual(settings);
  });

  it("rejects Markdown without valid template metadata", () => {
    expect(() => applyBoothTemplateMarkdown("# Not a booth template", defaultEventSettings)).toThrow("metadata YAML");
    expect(() => applyBoothTemplateMarkdown("---\nlayout: diagonal\n---", defaultEventSettings)).toThrow("layout harus");
    expect(() => applyBoothTemplateMarkdown("---\nprintTemplate:\n  paperSize: 4x6\n  backgroundColor: '#ffffff'\n  slots: []\n---", defaultEventSettings)).toThrow("printTemplate harus");
  });
});