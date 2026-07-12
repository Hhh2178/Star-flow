// @vitest-environment jsdom
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, type Component } from "vue";

const api = vi.hoisted(() => ({
  getProviderOverview: vi.fn(), getModelPricing: vi.fn(), updateModelPricing: vi.fn(), updateProvider: vi.fn(), testProviderConnection: vi.fn(), getAiConfigOverview: vi.fn(),
  updateAiDeployment: vi.fn(), updateAiUseMode: vi.fn(), getSystemOverview: vi.fn(),
  updateDevelopmentSettings: vi.fn(), adminErrorText: vi.fn((error: unknown, fallback: string) => (error as Error)?.message || fallback),
}));
vi.mock("../api/adminApi", () => api);

import ProvidersPage from "../pages/ProvidersPage.vue";
import AiConfigPage from "../pages/AiConfigPage.vue";
import SystemPage from "../pages/SystemPage.vue";

const ButtonStub = defineComponent({ emits: ["click"], template: '<button @click="$emit(\'click\')"><slot name="icon"/><slot/></button>' });
const SwitchStub = defineComponent({ props: { value: Boolean }, emits: ["change"], template: '<button data-testid="switch" @click="$emit(\'change\', !value)">{{ value }}</button>' });
const IconStub = { template: "<i />" };
const InputStub = defineComponent({ props: ["modelValue"], emits: ["update:modelValue"], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' });
const common = { "t-button": ButtonStub, "t-switch": SwitchStub, "t-tag": { template: "<span><slot/></span>" }, "t-segmented-control": { props: ["value"], emits: ["change"], template: '<button data-testid="mode" @click="$emit(\'change\', value === \'0\' ? \'1\' : \'0\')">mode</button>' }, "t-dialog": { template: "<div><slot/></div>" }, "t-input": InputStub, "t-input-number": { template: "<input type='number'/>" }, "t-select": { props: ["modelValue", "options"], emits: ["update:modelValue"], template: "<select :value='modelValue' @change='$emit(\"update:modelValue\", $event.target.value)'><option v-for='item in options' :key='item.value' :value='item.value'>{{ item.label }}</option></select>" }, "i-refresh": IconStub, "i-edit": IconStub, "i-key": IconStub, "i-play-circle": IconStub, "i-loading-three": IconStub };
const provider = { id: "provider-a", name: "Provider A", enabled: true, configured: true, inputs: [{ key: "apiKey", label: "API Key", type: "password", required: true, configured: true }], modelCount: 3, modelTypes: [{ type: "text", count: 1 }, { type: "image", count: 1 }, { type: "video", count: 1 }], models: [{ name: "Text A", modelName: "text-a", type: "text" }, { name: "Image A", modelName: "image-a", type: "image" }, { name: "Video A", modelName: "video-a", type: "video" }] };
const deployment = { id: 1, name: "剧本 Agent", description: "剧本规划", vendorId: "provider-a", model: "Text A", modelName: "text-a", temperature: 0.7, maxOutputTokens: 2048, disabled: false, configured: true };
let wrapper: VueWrapper | undefined;

async function mountPage(component: Component) {
  wrapper = mount(component, { global: { stubs: common } });
  await flushPromises();
  return wrapper;
}

describe("admin settings pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getModelPricing.mockResolvedValue({ items: [] });
    api.updateModelPricing.mockResolvedValue({ pricingId: 1, providerId: "provider-a", modelId: "text-a", taskType: "text", billingMode: "per_request", requestPrice: 0.1, currency: "CNY", version: 2, effectiveAt: 2 });
    api.updateProvider.mockResolvedValue({ id: "provider-a", updated: true }); api.testProviderConnection.mockResolvedValue({ providerId: "provider-a", modelName: "text-a", status: "available", modelAvailable: true, latencyMs: 12, checkedAt: 1 }); api.updateAiUseMode.mockResolvedValue({ agentUseMode: "1" }); api.updateDevelopmentSettings.mockResolvedValue({ aiDevToolsEnabled: true });
    api.getSystemOverview.mockResolvedValue({ database: { tables: [{ name: "o_user", rowCount: 3 }] }, development: { aiDevToolsEnabled: false }, runtime: { nodeVersion: "v22", platform: "win32", environment: "dev" }, capabilities: { updateDevelopment: true, clearDatabase: false, importDatabase: false, exportDatabase: false } });
  });
  afterEach(() => wrapper?.unmount());

  it("普通 Admin 只读查看 Provider 与 AI 配置", async () => {
    api.getProviderOverview.mockResolvedValue({ providers: [provider], capabilities: { read: true, update: false } });
    const providers = await mountPage(ProvidersPage);
    expect(providers.text()).toContain("当前账号仅可查看"); expect(providers.find('[data-testid="switch"]').exists()).toBe(false);
    expect(providers.find('[data-testid="open-pricing"]').exists()).toBe(false);
    expect(api.getModelPricing).not.toHaveBeenCalled();
    expect(providers.text()).not.toContain("未配置");
    providers.unmount();
    api.getAiConfigOverview.mockResolvedValue({ useMode: "0", deployments: [deployment], capabilities: { read: true, update: false } });
    const ai = await mountPage(AiConfigPage);
    expect(ai.text()).toContain("当前账号仅可查看"); expect(ai.find('[data-testid="mode"]').exists()).toBe(false); expect(ai.text()).not.toContain("编辑");
  });

  it("Super Admin 可以切换 Provider 和 AI 模式", async () => {
    api.getProviderOverview.mockResolvedValue({ providers: [provider], capabilities: { read: true, update: true } });
    const providers = await mountPage(ProvidersPage); await providers.get('[data-testid="switch"]').trigger("click"); await flushPromises();
    expect(api.updateProvider).toHaveBeenCalledWith({ id: "provider-a", enabled: false });
    providers.unmount();
    api.getAiConfigOverview.mockResolvedValue({ useMode: "0", deployments: [deployment], capabilities: { read: true, update: true } });
    const ai = await mountPage(AiConfigPage); await ai.get('[data-testid="mode"]').trigger("click"); await flushPromises();
    expect(api.updateAiUseMode).toHaveBeenCalledWith("1");
  });

  it("Super Admin 为每个模型显示计价入口", async () => {
    api.getProviderOverview.mockResolvedValue({ providers: [provider], capabilities: { read: true, update: true } });
    const providers = await mountPage(ProvidersPage);
    expect(providers.findAll('[data-testid="open-pricing"]')).toHaveLength(provider.models.length);
    expect(api.getModelPricing).toHaveBeenCalledTimes(1);
  });

  it("校验价格必填且最多六位小数", async () => {
    api.getProviderOverview.mockResolvedValue({ providers: [provider], capabilities: { read: true, update: true } });
    const providers = await mountPage(ProvidersPage);
    await providers.get('[data-testid="open-pricing"]').trigger("click");
    await providers.get('[data-testid="save-pricing"]').trigger("click");
    expect(providers.text()).toContain("请填写每次价格");
    await providers.get<HTMLInputElement>('[data-testid="pricing-request-price"]').setValue("0.1234567");
    await providers.get('[data-testid="save-pricing"]').trigger("click");
    expect(providers.text()).toContain("最多保留 6 位小数");
    expect(api.updateModelPricing).not.toHaveBeenCalled();
  });

  it.each([
    ["per_request", "text-a", "text", { requestPrice: 0.123456 }],
    ["per_second", "text-a", "text", { secondPrice: 0.03 }],
    ["per_token", "text-a", "text", { inputPricePerMillion: 2, outputPricePerMillion: 8, fallbackRequestPrice: 0.05 }],
  ] as const)("保存并刷新 %s 计价", async (billingMode, modelId, taskType, prices) => {
    api.getProviderOverview.mockResolvedValue({ providers: [provider], capabilities: { read: true, update: true } });
    const providers = await mountPage(ProvidersPage);
    await providers.get('[data-testid="open-pricing"]').trigger("click");
    await providers.get('[data-testid="pricing-mode"]').setValue(billingMode);
    if ("requestPrice" in prices) await providers.get<HTMLInputElement>('[data-testid="pricing-request-price"]').setValue(String(prices.requestPrice));
    if ("secondPrice" in prices) await providers.get<HTMLInputElement>('[data-testid="pricing-second-price"]').setValue(String(prices.secondPrice));
    if ("inputPricePerMillion" in prices) {
      await providers.get<HTMLInputElement>('[data-testid="pricing-input-token-price"]').setValue(String(prices.inputPricePerMillion));
      await providers.get<HTMLInputElement>('[data-testid="pricing-output-token-price"]').setValue(String(prices.outputPricePerMillion));
      await providers.get<HTMLInputElement>('[data-testid="pricing-fallback-price"]').setValue(String(prices.fallbackRequestPrice));
    }
    await providers.get('[data-testid="save-pricing"]').trigger("click");
    await flushPromises();
    expect(api.updateModelPricing).toHaveBeenCalledWith({ providerId: "provider-a", modelId, taskType, billingMode, currency: "CNY", ...prices });
    expect(api.updateModelPricing).toHaveBeenCalledTimes(1);
    expect(api.getProviderOverview).toHaveBeenCalledTimes(2);
    expect(api.getModelPricing).toHaveBeenCalledTimes(2);
    expect(providers.text()).toContain("模型计价已更新");
    expect(providers.text()).not.toContain("模型计价更新失败");
  });

  it("Super Admin 可以对单个模型执行连接测试", async () => {
    api.getProviderOverview.mockResolvedValue({ providers: [provider], capabilities: { read: true, update: true } });
    const providers = await mountPage(ProvidersPage);
    await providers.get('[data-testid="open-connection-test"]').trigger("click");
    await providers.get('[data-testid="run-connection-test"]').trigger("click");
    await flushPromises();
    expect(api.testProviderConnection).toHaveBeenCalledWith({ id: "provider-a", modelName: "text-a" });
    expect(providers.text()).toContain("连接正常");
    expect(providers.text()).toContain("12 ms");
  });

  it("Provider 页面不暴露上游兼容标识", async () => {
    api.getProviderOverview.mockResolvedValue({
      providers: [{ ...provider, id: "toonflow", name: "Stars Flow 服务平台" }],
      capabilities: { read: true, update: true },
    });

    const providers = await mountPage(ProvidersPage);
    expect(providers.text()).toContain("#stars-flow-service");
    expect(providers.text()).not.toContain("#toonflow");
  });

  it("系统页显示运行状态并更新开发开关", async () => {
    const system = await mountPage(SystemPage); expect(system.text()).toContain("o_user"); expect(system.text()).toContain("v22");
    await system.get('[data-testid="switch"]').trigger("click"); await flushPromises();
    expect(api.updateDevelopmentSettings).toHaveBeenCalledWith(true);
  });
});
