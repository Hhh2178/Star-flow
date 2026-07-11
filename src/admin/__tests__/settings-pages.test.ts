// @vitest-environment jsdom
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, type Component } from "vue";

const api = vi.hoisted(() => ({
  getProviderOverview: vi.fn(), updateProvider: vi.fn(), getAiConfigOverview: vi.fn(),
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
const common = { "t-button": ButtonStub, "t-switch": SwitchStub, "t-tag": { template: "<span><slot/></span>" }, "t-segmented-control": { props: ["value"], emits: ["change"], template: '<button data-testid="mode" @click="$emit(\'change\', value === \'0\' ? \'1\' : \'0\')">mode</button>' }, "t-dialog": { template: "<div><slot/></div>" }, "t-input": { template: "<input/>" }, "t-input-number": { template: "<input type='number'/>" }, "i-refresh": IconStub, "i-edit": IconStub, "i-key": IconStub, "i-loading-three": IconStub };
const provider = { id: "provider-a", name: "Provider A", enabled: true, configured: true, inputs: [{ key: "apiKey", label: "API Key", type: "password", required: true, configured: true }], modelCount: 1, modelTypes: [{ type: "text", count: 1 }], models: [{ name: "Text A", type: "text" }] };
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
    api.updateProvider.mockResolvedValue({ id: "provider-a", updated: true }); api.updateAiUseMode.mockResolvedValue({ agentUseMode: "1" }); api.updateDevelopmentSettings.mockResolvedValue({ aiDevToolsEnabled: true });
    api.getSystemOverview.mockResolvedValue({ database: { tables: [{ name: "o_user", rowCount: 3 }] }, development: { aiDevToolsEnabled: false }, runtime: { nodeVersion: "v22", platform: "win32", environment: "dev" }, capabilities: { updateDevelopment: true, clearDatabase: false, importDatabase: false, exportDatabase: false } });
  });
  afterEach(() => wrapper?.unmount());

  it("普通 Admin 只读查看 Provider 与 AI 配置", async () => {
    api.getProviderOverview.mockResolvedValue({ providers: [provider], capabilities: { read: true, update: false } });
    const providers = await mountPage(ProvidersPage);
    expect(providers.text()).toContain("当前账号仅可查看"); expect(providers.find('[data-testid="switch"]').exists()).toBe(false);
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
