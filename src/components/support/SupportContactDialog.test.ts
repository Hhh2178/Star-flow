// @vitest-environment jsdom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";

const api = vi.hoisted(() => ({
  get: vi.fn(),
}));
vi.mock("@/utils/axios", () => ({ default: api }));

import SupportContactDialog from "./SupportContactDialog.vue";

const DialogStub = defineComponent({
  props: ["visible", "header"],
  emits: ["update:visible"],
  template: '<section v-if="visible"><h2>{{ header }}</h2><slot /></section>',
});

describe("SupportContactDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        enabled: true,
        type: "wechat",
        title: "联系 Stars Flow 支持",
        wechatId: "stars-flow-support",
        qrCodeUrl: "/oss/support/wechat-contact.png",
        description: "工作日 09:00-18:00",
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("打开后读取并显示公开微信联系方式", async () => {
    const wrapper = mount(SupportContactDialog, {
      props: { modelValue: true },
      global: {
        stubs: {
          "t-dialog": DialogStub,
          "t-button": { template: '<button><slot /></button>' },
        },
      },
    });
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith("/public/support/getContact");
    expect(wrapper.text()).toContain("联系 Stars Flow 支持");
    expect(wrapper.text()).toContain("stars-flow-support");
    expect(wrapper.get("img").attributes("src")).toBe("/oss/support/wechat-contact.png");
    await wrapper.get('[data-testid="copy-wechat"]').trigger("click");
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("stars-flow-support");
  });

  it("支持关闭时显示不可用状态且不渲染二维码", async () => {
    api.get.mockResolvedValue({
      data: { enabled: false, type: "wechat", title: "联系支持", wechatId: "", qrCodeUrl: null, description: "" },
    });
    const wrapper = mount(SupportContactDialog, {
      props: { modelValue: true },
      global: { stubs: { "t-dialog": DialogStub } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("当前暂未启用联系支持");
    expect(wrapper.find("img").exists()).toBe(false);
  });
});
