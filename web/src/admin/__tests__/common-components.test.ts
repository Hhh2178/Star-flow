// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import EmptyState from "../components/EmptyState.vue";
import ErrorState from "../components/ErrorState.vue";
import LoadingState from "../components/LoadingState.vue";
import PageHeader from "../components/PageHeader.vue";
import StatusText from "../components/StatusText.vue";
import { ADMIN_DATE_FORMATTER, formatAdminDate } from "../components/adminDate";

describe("admin common components", () => {
  it("formats page timestamps through the shared admin formatter", () => {
    expect(formatAdminDate(1000)).toBe(ADMIN_DATE_FORMATTER.format(1000));
  });

  it("renders missing timestamps without a Unix epoch date", () => {
    expect(formatAdminDate(null)).toBe("-");
    expect(formatAdminDate(undefined)).toBe("-");
  });

  it.each([
    ["queued", "排队中"],
    ["running", "执行中"],
    ["recovering", "恢复中"],
    ["needs_attention", "需要处理"],
    ["succeeded", "已完成"],
    ["failed", "失败"],
    ["cancelled", "已取消"],
  ] as const)("maps %s to %s", (status, label) => {
    const wrapper = mount(StatusText, { props: { status } });
    expect(wrapper.text()).toBe(label);
    expect(wrapper.attributes("data-status")).toBe(status);
  });

  it("renders a compact page header with an action slot", () => {
    const wrapper = mount(PageHeader, {
      props: { title: "队列与并发", description: "监控生成任务" },
      slots: { actions: "<button>刷新</button>" },
    });
    expect(wrapper.get("h1").text()).toBe("队列与并发");
    expect(wrapper.text()).toContain("监控生成任务");
    expect(wrapper.get("button").text()).toBe("刷新");
  });

  it("renders reusable loading, empty and error states", () => {
    const iconStubs = { ILoadingThree: true, IInbox: true, IAttention: true };
    expect(mount(LoadingState, { global: { stubs: iconStubs } }).text()).toContain("加载中");
    expect(mount(EmptyState, { props: { text: "暂无任务" }, global: { stubs: iconStubs } }).text()).toContain("暂无任务");
    const error = mount(ErrorState, { props: { message: "加载失败" }, global: { stubs: iconStubs } });
    expect(error.attributes("role")).toBe("alert");
    expect(error.text()).toContain("加载失败");
  });

  it("renders a retry command and emits retry from the real DOM button", async () => {
    const onRetry = vi.fn();
    const wrapper = mount(ErrorState, {
      props: { message: "加载失败", retryable: true, onRetry },
      global: {
        stubs: {
          IAttention: true,
          TButton: {
            emits: ["click"],
            template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    });

    await wrapper.get("button").trigger("click");

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
