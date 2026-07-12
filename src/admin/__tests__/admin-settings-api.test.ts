import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../../shared/api", () => ({ createApiClient: vi.fn(() => client) }));

import {
  AdminApiError,
  getAiConfigOverview,
  getModelPricing,
  getProviderOverview,
  getQuotaOverview,
  getSystemOverview,
  getUsageOverview,
  testProviderConnection,
  updateAiUseMode,
  updateDevelopmentSettings,
  updateModelPricing,
  updateProvider,
} from "../api/adminApi";

const ok = <T>(data: T) => ({ data: { code: 200, data, message: "成功" } });
const providerOverview = {
  providers: [{
    id: "provider-a", name: "Provider A", enabled: true, configured: true, inputs: [{ key: "apiKey", label: "API Key", type: "password", required: true, configured: true }], modelCount: 2,
    modelTypes: [{ type: "text", count: 1 }, { type: "image", count: 1 }],
    models: [{ name: "Text A", modelName: "text-a", type: "text" }, { name: "Image A", modelName: "image-a", type: "image" }],
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
const pricingBase = {
  pricingId: 1, providerId: "provider-a", modelId: "text-a", taskType: "text" as const,
  requestPrice: null, secondPrice: null, inputPricePerMillion: null, outputPricePerMillion: null,
  fallbackRequestPrice: null, currency: "CNY" as const, version: 3, effectiveAt: 1,
};
const pricingCases = [
  { ...pricingBase, billingMode: "per_request" as const, requestPrice: 0.123456 },
  { ...pricingBase, billingMode: "per_second" as const, secondPrice: 0.03 },
  { ...pricingBase, billingMode: "per_token" as const, inputPricePerMillion: 2, outputPricePerMillion: 8, fallbackRequestPrice: 0.05 },
];
const quotaOverview = {
  summary: { balance: 10, reservedBalance: 2, availableBalance: 8, billingStatus: "debt", totalRecharge: 20, totalUsage: 10 },
  groups: [{ groupId: 3, groupName: "内容一组", balance: 10, reservedBalance: 2, availableBalance: 8, billingStatus: "debt", totalRecharge: 20, totalUsage: 10 }],
  logs: [],
};
const usageItem = {
  id: 1, jobId: 2, groupId: 3, groupName: "内容一组", userId: 4, userName: "创作者甲",
  projectId: null, projectName: null, providerId: "provider-a", modelId: "text-a", taskType: "text",
  estimatedCost: 0.123456, currency: "CNY", result: "succeeded", units: { requests: 1 },
  pricingSnapshot: { ...pricingBase, billingMode: "per_request" as const, requestPrice: 0.123456, secondPrice: undefined, inputPricePerMillion: undefined, outputPricePerMillion: undefined, fallbackRequestPrice: undefined },
  billingMode: "per_request" as const, finalCost: 0.123456, createdAt: 1,
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

  it("拒绝未知 Provider model.type", async () => {
    client.get.mockResolvedValueOnce(ok({
      ...providerOverview,
      providers: [{
        ...providerOverview.providers[0],
        models: [{ name: "Audio A", modelName: "audio-a", type: "audio" }],
      }],
    }));

    await expect(getProviderOverview()).rejects.toBeInstanceOf(AdminApiError);
  });

  it("使用后台设置专用写接口", async () => {
    client.post
      .mockResolvedValueOnce(ok({ id: "provider-a", updated: true }))
      .mockResolvedValueOnce(ok({ providerId: "provider-a", modelName: "text-a", status: "available", modelAvailable: true, latencyMs: 12, checkedAt: 1 }))
      .mockResolvedValueOnce(ok({ agentUseMode: "1" }))
      .mockResolvedValueOnce(ok({ aiDevToolsEnabled: true }));
    await updateProvider({ id: "provider-a", enabled: false });
    await testProviderConnection({ id: "provider-a", modelName: "text-a" });
    await updateAiUseMode("1");
    await updateDevelopmentSettings(true);
    expect(client.post.mock.calls.map(([url]) => url)).toEqual([
      "/admin/providers/updateProvider",
      "/admin/providers/testConnection",
      "/admin/ai-config/updateUseMode",
      "/admin/system/updateDevelopment",
    ]);
  });

  it.each(pricingCases)("严格校验 $billingMode 模型计价响应", async (pricing) => {
    client.get.mockResolvedValueOnce(ok({ items: [pricing] }));
    await expect(getModelPricing()).resolves.toEqual({ items: [pricing] });
    expect(client.get).toHaveBeenLastCalledWith("/admin/providers/getPricing");
  });

  it.each([
    { ...pricingCases[0], requestPrice: null },
    { ...pricingCases[1], requestPrice: 0.1 },
    { ...pricingCases[2], outputPricePerMillion: null },
    { ...pricingCases[0], version: 1.5 },
  ])("拒绝字段不完整或模式不匹配的模型计价响应", async (pricing) => {
    client.get.mockResolvedValueOnce(ok({ items: [pricing] }));
    await expect(getModelPricing()).rejects.toBeInstanceOf(AdminApiError);
  });

  it.each([
    ["字符串价格", { ...pricingCases[0], requestPrice: "0.123456" }],
    ["unknown billingMode", { ...pricingCases[0], billingMode: "unknown" }],
    ["per_token 缺 fallbackRequestPrice", (({ fallbackRequestPrice: _omitted, ...pricing }) => pricing)(pricingCases[2])],
    ["缺 version", (({ version: _omitted, ...pricing }) => pricing)(pricingCases[0])],
  ])("拒绝明确畸形模型计价响应：%s", async (_, pricing) => {
    client.get.mockResolvedValueOnce(ok({ items: [pricing] }));
    await expect(getModelPricing()).rejects.toBeInstanceOf(AdminApiError);
  });

  it.each([
    ["per_request", { requestPrice: 0.123456 }],
    ["per_second", { secondPrice: 0.03 }],
    ["per_token", { inputPricePerMillion: 2, outputPricePerMillion: 8, fallbackRequestPrice: 0.05 }],
  ] as const)("通过 updateModelPricing 保存 %s 计价", async (billingMode, prices) => {
    const input = { providerId: "provider-a", modelId: "text-a", taskType: "text" as const, billingMode, currency: "CNY" as const, ...prices };
    const response = { ...pricingBase, pricingId: 4, ...input, version: 4, effectiveAt: 2 };
    client.post.mockResolvedValueOnce(ok(response));
    await expect(updateModelPricing(input)).resolves.toEqual(response);
    expect(client.post).toHaveBeenLastCalledWith("/admin/providers/updatePricing", input);
  });

  it("接受 updatePricing 返回的真实全字段 ModelPricing", async () => {
    const input = { providerId: "provider-a", modelId: "text-a", taskType: "text" as const, billingMode: "per_request" as const, currency: "CNY" as const, requestPrice: 0.123456 };
    const response = { ...pricingCases[0], pricingId: 4, version: 4, effectiveAt: 2 };
    client.post.mockResolvedValueOnce(ok(response));

    await expect(updateModelPricing(input)).resolves.toEqual(response);
    expect(client.post).toHaveBeenCalledOnce();
  });

  it("严格校验额度和用量中的计费字段", async () => {
    client.get.mockResolvedValueOnce(ok(quotaOverview));
    await expect(getQuotaOverview()).resolves.toEqual(quotaOverview);
    client.get.mockResolvedValueOnce(ok({ ...quotaOverview, summary: { ...quotaOverview.summary, availableBalance: "8" } }));
    await expect(getQuotaOverview()).rejects.toBeInstanceOf(AdminApiError);
    client.get.mockResolvedValueOnce(ok({ ...quotaOverview, summary: { ...quotaOverview.summary, reservedBalance: -1, availableBalance: 11 } }));
    await expect(getQuotaOverview()).rejects.toBeInstanceOf(AdminApiError);
    client.get.mockResolvedValueOnce(ok({ ...quotaOverview, summary: { ...quotaOverview.summary, availableBalance: 7 } }));
    await expect(getQuotaOverview()).rejects.toBeInstanceOf(AdminApiError);

    const usageOverview = { summary: { recordCount: 1, estimatedCost: 0.123456 }, breakdown: [{ taskType: "text", recordCount: 1, estimatedCost: 0.123456 }], page: 1, pageSize: 20, total: 1, items: [usageItem] };
    client.get.mockResolvedValueOnce(ok(usageOverview));
    await expect(getUsageOverview()).resolves.toEqual(usageOverview);
    const historicalUsageOverview = { ...usageOverview, items: [{ ...usageItem, pricingSnapshot: null, billingMode: null }] };
    client.get.mockResolvedValueOnce(ok(historicalUsageOverview));
    await expect(getUsageOverview()).resolves.toEqual(historicalUsageOverview);
    client.get.mockResolvedValueOnce(ok({ ...usageOverview, items: [{ ...usageItem, units: { requests: "1" } }] }));
    await expect(getUsageOverview()).rejects.toBeInstanceOf(AdminApiError);
    client.get.mockResolvedValueOnce(ok({ ...usageOverview, items: [{ ...usageItem, pricingSnapshot: { ...usageItem.pricingSnapshot, version: "3" } }] }));
    await expect(getUsageOverview()).rejects.toBeInstanceOf(AdminApiError);
  });
});
