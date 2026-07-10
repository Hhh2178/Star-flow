import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../../shared/api", () => ({ createApiClient: vi.fn(() => client) }));

import {
  AdminApiError,
  getAiConfigOverview,
  getProviderOverview,
  getSystemOverview,
  updateAiUseMode,
  updateDevelopmentSettings,
  updateProvider,
} from "../api/adminApi";

const ok = <T>(data: T) => ({ data: { code: 200, data, message: "成功" } });
const providerOverview = {
  providers: [{
    id: "provider-a", name: "Provider A", enabled: true, configured: true, inputs: [{ key: "apiKey", label: "API Key", type: "password", required: true, configured: true }], modelCount: 2,
    modelTypes: [{ type: "text", count: 1 }, { type: "image", count: 1 }],
    models: [{ name: "Text A", type: "text" }, { name: "Image A", type: "image" }],
  }],
  capabilities: { read: true, update: false },
};
const aiOverview = {
  useMode: "0",
  deployments: [{
    id: 1, name: "剧本 Agent", description: "剧本规划", vendorId: "provider-a",
    model: "Text A", modelName: "text-a", temperature: 0.7, maxOutputTokens: 2048,
    disabled: false, configured: true,
  }],
  capabilities: { read: true, update: false },
};
const systemOverview = {
  database: { tables: [{ name: "o_user", rowCount: 3 }] },
  development: { aiDevToolsEnabled: false },
  runtime: { nodeVersion: "v22.0.0", platform: "win32", environment: "dev" },
  capabilities: { updateDevelopment: true, clearDatabase: false, importDatabase: false, exportDatabase: false },
};

describe("admin settings API", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["Provider", getProviderOverview, providerOverview],
    ["AI", getAiConfigOverview, aiOverview],
    ["系统", getSystemOverview, systemOverview],
  ] as const)("校验%s概览响应", async (_, call, value) => {
    client.get.mockResolvedValueOnce(ok(value));
    await expect(call()).resolves.toEqual(value);
    client.get.mockResolvedValueOnce(ok({ ...value, capabilities: { read: "yes" } }));
    await expect(call()).rejects.toBeInstanceOf(AdminApiError);
  });

  it("使用后台设置专用写接口", async () => {
    client.post
      .mockResolvedValueOnce(ok({ id: "provider-a", updated: true }))
      .mockResolvedValueOnce(ok({ agentUseMode: "1" }))
      .mockResolvedValueOnce(ok({ aiDevToolsEnabled: true }));
    await updateProvider({ id: "provider-a", enabled: false });
    await updateAiUseMode("1");
    await updateDevelopmentSettings(true);
    expect(client.post.mock.calls.map(([url]) => url)).toEqual([
      "/admin/providers/updateProvider",
      "/admin/ai-config/updateUseMode",
      "/admin/system/updateDevelopment",
    ]);
  });
});
