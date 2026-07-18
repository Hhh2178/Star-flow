import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Creator pricing surfaces", () => {
  it("blocks image generation until a one-image estimate allows submission", () => {
    const image = source("src/views/assets/components/generateImage.vue");
    expect(image).toContain('taskType: "image"');
    expect(image).toContain('units: { requests: 1, images: 1 }');
    expect(image).toContain(':disabled="pricingBlocked"');
    expect(image).toContain("formatEstimatedCost");
  });

  it("re-estimates video by model and duration and blocks generateVideo", () => {
    const video = source("src/views/production/components/workbench/generate/index.vue");
    expect(video).toContain('taskType: "video"');
    expect(video).toContain("seconds: modelParmas.value.duration");
    expect(video).toContain("pricingBlocked.value");
    expect(video).toContain("formatEstimatedCost");
  });

  it("estimates the universalAi fallback reservation before novel batch enqueue", () => {
    const novel = source("src/views/novel/components/importNovel.vue");
    expect(novel).toContain('taskType: "text"');
    expect(novel).toContain('model: "universalAi"');
    expect(novel).toContain("requests: selectedRows.value.length");
    expect(novel).toContain("formatEstimatedCost");
    expect(novel).toContain("runCreatorPricedBatchEnqueue");
  });

  it("keeps Creator pricing code away from Admin pricing and credential fields", () => {
    const creatorPricingSources = [
      "src/utils/creatorPricing.ts",
      "src/views/assets/components/generateImage.vue",
      "src/views/production/components/workbench/generate/index.vue",
      "src/views/novel/components/importNovel.vue",
    ].map(source).join("\n");
    expect(creatorPricingSources).toContain("/generation/getPricingEstimate");
    expect(creatorPricingSources).not.toMatch(/\/admin\/providers\/(?:updatePricing|getPricing)/);
    expect(creatorPricingSources).not.toMatch(/credential|inputValues|apiKey/);
  });

  it("announces pricing status and errors to assistive technology", () => {
    const surfaces = [
      source("src/views/assets/components/generateImage.vue"),
      source("src/views/production/components/workbench/generate/index.vue"),
      source("src/views/novel/components/importNovel.vue"),
    ];
    for (const surface of surfaces) {
      expect(surface).toContain(':role="pricingError ? \'alert\' : \'status\'"');
      expect(surface).toContain(':aria-live="pricingError ? \'assertive\' : \'polite\'"');
    }
  });

  it("invalidates active pricing requests when surfaces close or unmount", () => {
    const image = source("src/views/assets/components/generateImage.vue");
    const video = source("src/views/production/components/workbench/generate/index.vue");
    const novel = source("src/views/novel/components/importNovel.vue");
    expect(image).toMatch(/function handleCancel\(\)\s*{\s*latestPricing\.invalidate\(\);/);
    expect(novel).toMatch(/if \(!newVal\)\s*{\s*latestPricing\.invalidate\(\);/);
    for (const surface of [image, video, novel]) {
      expect(surface).toMatch(/onUnmounted\(\(\) =>\s*{\s*latestPricing\.invalidate\(\);/);
    }
  });
});
