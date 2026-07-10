import { describe, expect, it } from "vitest";
import { resolveRuntimeApiBaseUrl } from "@/stores/setting";

describe("runtime API base URL", () => {
  it("forces same-origin API paths for hosted Creator builds", () => {
    expect(resolveRuntimeApiBaseUrl("http://localhost:10588/api", "http:")).toBe("/api");
    expect(resolveRuntimeApiBaseUrl("http://127.0.0.1:10588/api", "https:")).toBe("/api");
  });

  it("preserves the configured backend for Electron file builds", () => {
    expect(resolveRuntimeApiBaseUrl("http://localhost:10588/api", "file:")).toBe("http://localhost:10588/api");
  });
});
