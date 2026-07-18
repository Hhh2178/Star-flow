// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import AdvancedJsonEditor from "../components/providers/AdvancedJsonEditor.vue";
import ProviderModelEditor from "../components/providers/ProviderModelEditor.vue";
import ProviderProtocolEditor from "../components/providers/ProviderProtocolEditor.vue";

const model = {
  providerId: "provider-a", modelId: "vision-chat", displayName: "视觉对话", capability: "text" as const,
  executionMode: "sync" as const, inputProfile: {}, capabilityTags: ["text_chat"],
  inputCapabilities: { prompt: true, systemPrompt: true, imageReference: { enabled: false, min: 0, max: 0 }, frameModes: [], mask: false, videoReference: false, audioReference: false },
  parameterSchema: { temperature: { type: "number", min: 0, max: 2, default: 0.7 } },
  advancedConfig: {}, protocolOverride: null, outputMapping: {}, enabled: true, revision: 2,
};

describe("Provider model editor", () => {
  it("edits understanding and reasoning capabilities structurally", async () => {
    const wrapper = mount(ProviderModelEditor, { props: { model, creating: false, canUpdate: true, busy: false } });
    await wrapper.get('[data-testid="tag-image_understanding"]').setValue(true);
    await wrapper.get('[data-testid="tag-reasoning"]').setValue(true);
    await wrapper.get('[data-testid="tag-reasoning_control"]').setValue(true);
    await wrapper.get('[data-testid="model-save"]').trigger("click");
    expect(wrapper.emitted("save")?.[0]?.[0]).toMatchObject({
      capabilityTags: ["text_chat", "image_understanding", "reasoning", "reasoning_control"],
    });
  });

  it("keeps capability changes non-destructive until a template is explicitly applied", async () => {
    const wrapper = mount(ProviderModelEditor, { props: { model, creating: false, canUpdate: true, busy: false } });
    await wrapper.get('[data-testid="model-capability"]').setValue("video");
    expect(wrapper.text()).toContain("可应用视频模型建议模板");
    expect((wrapper.get('[data-testid="tag-text_chat"]').element as HTMLInputElement).checked).toBe(true);
    await wrapper.get('[data-testid="apply-capability-template"]').trigger("click");
    expect((wrapper.get('[data-testid="tag-video_generation"]').element as HTMLInputElement).checked).toBe(true);
    expect((wrapper.get('[data-testid="tag-text_chat"]').element as HTMLInputElement).checked).toBe(false);
  });

  it("edits multi-reference limits and valid first/last-frame combinations", async () => {
    const video = structuredClone({ ...model, capability: "video" as const, capabilityTags: ["video_generation"], protocolOverride: "async_task_poll_result" as const });
    const wrapper = mount(ProviderModelEditor, { props: { model: video, creating: false, canUpdate: true, busy: false } });
    await wrapper.get('[data-testid="reference-enabled"]').setValue(true);
    await wrapper.get('[data-testid="reference-min"]').setValue(1);
    await wrapper.get('[data-testid="reference-max"]').setValue(4);
    await wrapper.get('[data-testid="frame-first_frame"]').setValue(true);
    await wrapper.get('[data-testid="frame-first_last_frame"]').setValue(true);
    await wrapper.get('[data-testid="model-save"]').trigger("click");
    expect(wrapper.emitted("save")?.[0]?.[0]).toMatchObject({
      inputCapabilities: { imageReference: { enabled: true, min: 1, max: 4 }, frameModes: ["first_frame", "first_last_frame"] },
    });
  });

  it("previews Provider defaults merged with model overrides", async () => {
    const configured = structuredClone({ ...model, advancedConfig: { request: { fixedBody: { model: "vision-chat" } } } });
    const wrapper = mount(ProviderModelEditor, { props: { model: configured, providerAdvancedConfig: { request: { fixedBody: { region: "cn" } } }, creating: false, canUpdate: true, busy: false } });
    await wrapper.get('[data-testid="advanced-json-preview"]').trigger("click");
    const preview = wrapper.get('[data-testid="advanced-json-merged-preview"]').text();
    expect(preview).toContain('"region": "cn"');
    expect(preview).toContain('"model": "vision-chat"');
  });
});

describe("Advanced JSON editor", () => {
  it("formats valid JSON and reports invalid or unsafe content", async () => {
    const wrapper = mount(AdvancedJsonEditor, { props: { modelValue: {}, label: "模型高级配置", canUpdate: true } });
    const editor = wrapper.get('[data-testid="advanced-json-input"]');
    await editor.setValue('{"request":{"method":"POST"}}');
    await wrapper.get('[data-testid="advanced-json-format"]').trigger("click");
    expect((editor.element as HTMLTextAreaElement).value).toContain('\n  "request"');
    await editor.setValue('{"request":');
    await wrapper.get('[data-testid="advanced-json-validate"]').trigger("click");
    expect(wrapper.text()).toContain("JSON 格式不正确");
    await editor.setValue('{"request":{"headers":{"authorization":"secret"}}}');
    await wrapper.get('[data-testid="advanced-json-validate"]').trigger("click");
    expect(wrapper.text()).toContain("不能保存敏感凭据");
  });

  it("confirms reset and shows a redacted merged preview", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const wrapper = mount(AdvancedJsonEditor, { props: {
      modelValue: { request: { fixedBody: { model: "demo" } } },
      baseValue: { request: { fixedBody: { shared: true }, headers: { authorization: "hidden" } } },
      label: "模型高级配置", canUpdate: true,
    } });
    await wrapper.get('[data-testid="advanced-json-preview"]').trigger("click");
    expect(wrapper.get('[data-testid="advanced-json-merged-preview"]').text()).toContain('"shared": true');
    expect(wrapper.get('[data-testid="advanced-json-merged-preview"]').text()).toContain('"model": "demo"');
    expect(wrapper.get('[data-testid="advanced-json-merged-preview"]').text()).not.toContain("hidden");
    expect(wrapper.get('[data-testid="advanced-json-merged-preview"]').text()).toContain("[已隐藏]");
    await wrapper.get('[data-testid="advanced-json-reset"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([{}]);
  });
});

describe("Provider protocol editor", () => {
  it("offers all approved protocol templates and structured polling fields", async () => {
    const provider = { providerId: "provider-a", displayName: "服务商 A", enabled: true, migrationState: "native" as const, adapterId: "native", note: "", advancedConfig: {}, revision: 3, protocolType: "poll", protocolEnabled: true, credential: { configured: true, preview: "****1234", updatedAt: 1 }, modelCount: 1 };
    const protocol = { providerId: "provider-a", protocolType: "poll" as const, config: { baseUrl: "https://api.invalid/v1", modelProtocolTemplate: "async_task_poll_result", submitPath: "/tasks", statusPath: "/tasks/{id}", pollIntervalMs: 2000, pollTimeoutMs: 120000 }, enabled: true, revision: 2 };
    const wrapper = mount(ProviderProtocolEditor, { props: { provider, protocol, canUpdate: true, busy: false } });
    const options = wrapper.findAll('[data-testid="protocol-template"] option').map((item) => item.attributes("value"));
    expect(options).toEqual(["sync_inline_result", "async_task_poll_result", "async_task_poll_then_final_lookup", "webhook_callback", "runninghub_app", "runninghub_workflow", "legacy_adapter"]);
    expect(wrapper.find('[data-testid="poll-interval"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="poll-timeout"]').exists()).toBe(true);
  });
});
