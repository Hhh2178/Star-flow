import { describe, expect, it } from "vitest";
import { shouldProbeElectronRuntime } from "@/utils/runtimeEnvironment";

describe("Electron runtime probing", () => {
  it("never requests the custom protocol in hosted browser builds", () => {
    expect(shouldProbeElectronRuntime("https:", "Mozilla/5.0 Chrome/140")).toBe(false);
    expect(shouldProbeElectronRuntime("http:", "Mozilla/5.0 Chrome/140")).toBe(false);
  });

  it("preserves packaged and Electron development runtime discovery", () => {
    expect(shouldProbeElectronRuntime("file:", "Mozilla/5.0")).toBe(true);
    expect(shouldProbeElectronRuntime("http:", "Mozilla/5.0 Electron/38.0")).toBe(true);
  });
});
