// @vitest-environment jsdom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";

const api = vi.hoisted(() => ({
  listRuntimeProviders: vi.fn(), listRuntimeModels: vi.fn(), getRuntimeProtocol: vi.fn(), listRuntimeTestHistory: vi.fn(),
  getProviderOverview: vi.fn(), getModelPricing: vi.fn(), updateRuntimeProvider: vi.fn(), updateRuntimeModel: vi.fn(), upsertRuntimeProtocol: vi.fn(),
  updateProvider: vi.fn(), testProviderConnection: vi.fn(), adminErrorText: vi.fn((_cause: unknown, fallback: string) => fallback),
}));
vi.mock("../api/adminApi", () => api);
import ProvidersPage from "../pages/ProvidersPage.vue";

const providers = Array.from({ length: 20 }, (_, index) => ({ providerId: `provider-${index}`, displayName: `Provider ${index}`, enabled: index % 3 !== 0, migrationState: index === 0 ? "shadow" : "legacy", adapterId: "legacy", revision: 1, protocolType: index % 2 ? "standard" : "legacy", protocolEnabled: true, modelCount: 5 }));
const models = Array.from({ length: 100 }, (_, index) => ({ providerId: `provider-${Math.floor(index / 5)}`, modelId: `model-${index}`, displayName: `Model ${index}`, capability: index % 2 ? "image" : "text", executionMode: "sync", inputProfile: {}, parameterSchema: {}, outputMapping: {}, enabled: true, revision: 1 }));

const Button = defineComponent({ props: ["disabled"], emits: ["click"], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot/></button>' });
const common = { "t-button": Button, "t-tag": { template: "<span><slot/></span>" }, "t-input": { props: ["modelValue"], emits: ["update:modelValue"], template: "<input :value='modelValue' />" }, "t-select": { template: "<select />" }, "t-switch": { template: "<button />" }, "t-drawer": { template: "<aside><slot/></aside>" }, "t-textarea": { template: "<textarea />" }, "i-refresh": { template: "<i />" }, "i-edit": { template: "<i />" } };

describe("fixed Provider runtime console", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listRuntimeProviders.mockResolvedValue(providers);
    api.listRuntimeModels.mockImplementation(async ({ providerId }: { providerId: string }) => ({ page: 1, pageSize: 20, total: 5, items: models.filter((item) => item.providerId === providerId) }));
    api.getRuntimeProtocol.mockResolvedValue(null); api.listRuntimeTestHistory.mockResolvedValue([]); api.getProviderOverview.mockResolvedValue({ providers: [], capabilities: { read: true, update: true } }); api.getModelPricing.mockResolvedValue({ items: [] });
  });

  it("20 Providers and 100 models render only the stable selected Provider model set", async () => {
    const wrapper = mount(ProvidersPage, { global: { stubs: common } });
    await flushPromises();
    expect(wrapper.find('[data-testid="provider-rail"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="provider-rail-item"]')).toHaveLength(20);
    await wrapper.findAll(".tabs button")[2].trigger("click");
    expect(wrapper.text()).toContain("Model 0"); expect(wrapper.text()).toContain("Model 4"); expect(wrapper.text()).not.toContain("Model 5");
    await wrapper.findAll('[data-testid="provider-rail-item"]')[1].trigger("click"); await flushPromises();
    expect(wrapper.text()).toContain("Model 5"); expect(wrapper.text()).toContain("Model 9"); expect(wrapper.text()).not.toContain("Model 0");
    expect(api.listRuntimeModels).toHaveBeenLastCalledWith(expect.objectContaining({ providerId: "provider-1" }));
    expect(wrapper.find('[data-testid="provider-workspace"]').attributes("data-selected-provider")).toBe("provider-1");
  });

  it("exposes the five approved tabs and no TypeScript editor", async () => {
    const wrapper = mount(ProvidersPage, { global: { stubs: common } }); await flushPromises();
    for (const label of ["概览", "凭据", "模型", "协议与执行", "测试历史"]) expect(wrapper.text()).toContain(label);
    expect(wrapper.text()).not.toContain("TypeScript"); expect(wrapper.text()).not.toContain("源码编辑");
  });
});
