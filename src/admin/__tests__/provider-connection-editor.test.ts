// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import ProviderConnectionEditor from "../components/providers/ProviderConnectionEditor.vue";
import ProviderModelCatalog from "../components/providers/ProviderModelCatalog.vue";

const provider = {
  providerId: "provider-a", displayName: "服务商 A", enabled: true, migrationState: "legacy" as const, adapterId: "legacy",
  note: "", advancedConfig: {}, revision: 1, protocolType: "standard", protocolEnabled: true,
  credential: { configured: true, preview: "****1234", updatedAt: 1 }, modelCount: 1,
};
const protocol = { providerId: "provider-a", protocolType: "standard" as const, config: { baseUrl: "https://saved.invalid/v1" }, enabled: true, revision: 1 };

describe("Provider connection editor", () => {
  it("never redisplays credentials and clears a replacement after submit", async () => {
    const wrapper = mount(ProviderConnectionEditor, { props: { provider, protocol, canUpdate: true, busy: false } });
    expect(wrapper.text()).toContain("****1234");
    expect(wrapper.html()).not.toContain("saved-secret-value");
    const credential = wrapper.get('[data-testid="credential-input"]');
    expect((credential.element as HTMLInputElement).value).toBe("");
    await credential.setValue("replacement-secret-value");
    await wrapper.get('[data-testid="credential-replace"]').trigger("click");
    expect(wrapper.emitted("replace-credential")?.[0]).toEqual(["replacement-secret-value"]);
    expect((credential.element as HTMLInputElement).value).toBe("");
  });

  it("emits draft and saved probes and confirms credential clearing", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const wrapper = mount(ProviderConnectionEditor, { props: { provider, protocol, canUpdate: true, busy: false } });
    await wrapper.get('[data-testid="connection-base-url"]').setValue("https://draft.invalid/v1");
    await wrapper.get('[data-testid="credential-input"]').setValue("draft-secret-value");
    await wrapper.get('[data-testid="probe-draft"]').trigger("click");
    expect(wrapper.emitted("probe-draft")?.[0]).toEqual([{ baseUrl: "https://draft.invalid/v1", credential: "draft-secret-value", protocolType: "standard" }]);
    await wrapper.get('[data-testid="probe-saved"]').trigger("click");
    expect(wrapper.emitted("probe-saved")).toHaveLength(1);
    await wrapper.get('[data-testid="credential-clear"]').trigger("click");
    expect(confirm).toHaveBeenCalled();
    expect(wrapper.emitted("clear-credential")).toHaveLength(1);
  });
});

describe("Provider model catalog", () => {
  it("keeps discovery separate from selective import", async () => {
    const wrapper = mount(ProviderModelCatalog, {
      props: {
        models: { page: 1, pageSize: 20, total: 0, items: [] }, canUpdate: true, busy: false,
        candidates: [
          { modelId: "existing-chat", displayName: "Existing Chat", suggestedCapability: "text" as const, exists: true },
          { modelId: "new-video", displayName: "New Video", suggestedCapability: "video" as const, exists: false },
        ],
      },
    });
    await wrapper.get('[data-testid="model-fetch"]').trigger("click");
    expect(wrapper.emitted("fetch-models")).toHaveLength(1);
    expect(wrapper.emitted("import-models")).toBeUndefined();
    expect(wrapper.get('[data-testid="candidate-existing-chat"]').attributes("disabled")).toBeDefined();
    await wrapper.get('[data-testid="candidate-new-video"]').setValue(true);
    await wrapper.get('[data-testid="model-import"]').trigger("click");
    expect(wrapper.emitted("import-models")?.[0]).toEqual([[{ modelId: "new-video", displayName: "New Video", capability: "video" }]]);
  });
});
