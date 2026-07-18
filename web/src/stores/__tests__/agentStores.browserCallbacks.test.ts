import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("Agent stores", () => {
  it("does not register browser callbacks as Agent execution dependencies", () => {
    const scriptAgent = source("../scriptAgent.ts");
    const productionAgent = source("../productionAgent.ts");

    expect(scriptAgent).not.toMatch(/\.on\(["']getPlanData["']/);
    expect(productionAgent).not.toMatch(/\.on\(["'](?:getFlowData|addDeriveAsset|delDeriveAsset|generateDeriveAsset|generateStoryboard|addStoryboard)["']/);
  });

  it("renders the safe Agent queue status in both chat clients", () => {
    const scriptView = source("../../views/scriptAgent/index.vue");
    const productionChat = source("../../views/production/components/rightChatBox/index.vue");

    for (const client of [scriptView, productionChat]) {
      expect(client).toContain("agentJobStatusText");
      expect(client).toContain("agentQueueStatus");
      expect(client).toContain("agentJobBusy");
    }
  });
});
