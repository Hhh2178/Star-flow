// @vitest-environment jsdom

import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listAudit: vi.fn(),
  listGroups: vi.fn(),
  adminErrorText: vi.fn((error: unknown) => error instanceof Error ? error.message : "请求失败"),
}));

vi.mock("../api/adminApi", () => api);

import AuditPage from "../pages/AuditPage.vue";
import { useAdminSessionStore } from "../session";

const TButtonStub = defineComponent({
  props: { disabled: Boolean, loading: Boolean },
  template: '<button :disabled="disabled" :data-loading="String(loading)"><slot name="icon" /><slot /></button>',
});
const TSelectStub = defineComponent({
  props: { modelValue: [String, Number], options: Array },
  emits: ["update:modelValue", "change"],
  methods: {
    update(event: Event) {
      const raw = (event.target as HTMLSelectElement).value;
      const value = /^\\d+$/.test(raw) ? Number(raw) : raw;
      this.$emit("update:modelValue", value);
      this.$emit("change", value);
    },
  },
  template: '<select :value="modelValue" @change="update"><option value="">全部分组</option><option v-for="item in options" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
});

const groups = [
  { id: 3, name: "内容一组", adminUserId: 2, creatorLimit: 5, status: "enabled", createdAt: 1, updatedAt: 1 },
  { id: 4, name: "内容二组", adminUserId: 5, creatorLimit: 5, status: "enabled", createdAt: 1, updatedAt: 1 },
];
const auditResult = {
  page: 1,
  pageSize: 20,
  total: 21,
  items: [{
    id: 90,
    actorUserId: 1,
    actorRole: "super_admin",
    actorRoleLabel: "超级管理员",
    groupId: 3,
    action: "quota.adjust",
    actionLabel: "额度调整",
    targetType: "quota_account",
    targetTypeLabel: "额度账户",
    targetId: "3",
    targetRole: null,
    summary: {
      entryType: "manual_credit",
      amount: 10,
      reason: "运营补偿",
      password: "raw-password",
      apiKey: "provider-secret",
      nested: { token: "nested-secret" },
    },
    result: "success",
    resultLabel: "成功",
    requestId: "req-safe-id",
    createdAt: 1000,
  }],
};

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function mountPage(role: "admin" | "super_admin" = "super_admin") {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useAdminSessionStore();
  store.session = role === "super_admin"
    ? { id: 1, name: "平台管理员", role, groupId: null, groupName: null }
    : { id: 2, name: "组管理员", role, groupId: 3, groupName: "内容一组" };
  store.token = "Bearer token";
  const mounted = mount(AuditPage, {
    global: {
      plugins: [pinia],
      stubs: {
        TButton: TButtonStub,
        TSelect: TSelectStub,
        IRefresh: true,
        ILeft: true,
        IRight: true,
        ILoadingThree: true,
        IInbox: true,
        IAttention: true,
      },
    },
  });
  await flushPromises();
  await nextTick();
  return mounted;
}

let wrapper: VueWrapper | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  api.listGroups.mockResolvedValue(groups);
  api.listAudit.mockResolvedValue(auditResult);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe("AuditPage", () => {
  it("renders paged audit rows and only allowlisted scalar summary fields", async () => {
    wrapper = await mountPage();

    expect(wrapper.text()).toContain("额度调整");
    expect(wrapper.text()).toContain("额度账户 #3");
    expect(wrapper.text()).toContain("调整类型：手工加额");
    expect(wrapper.text()).toContain("金额：10");
    expect(wrapper.text()).toContain("原因：运营补偿");
    expect(wrapper.text()).not.toContain("raw-password");
    expect(wrapper.text()).not.toContain("provider-secret");
    expect(wrapper.text()).not.toContain("nested-secret");
  });

  it("does not expose a group filter or call listGroups for Admin", async () => {
    wrapper = await mountPage("admin");

    expect(wrapper.find('[data-testid="audit-group-filter"]').exists()).toBe(false);
    expect(api.listGroups).not.toHaveBeenCalled();
    expect(api.listAudit).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it("filters by group only for Super Admin", async () => {
    wrapper = await mountPage();
    await wrapper.get('[data-testid="audit-group-filter"]').setValue("4");
    await flushPromises();

    expect(api.listAudit).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, groupId: 4 });
  });

  it("loads the next page", async () => {
    wrapper = await mountPage();
    await wrapper.get('[data-testid="next-page"]').trigger("click");
    await flushPromises();

    expect(api.listAudit).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 });
  });

  it("keeps pagination within bounds and exposes the current page in the DOM", async () => {
    wrapper = await mountPage();

    expect(wrapper.get('[data-testid="previous-page"]').attributes()).toHaveProperty("disabled");
    expect(wrapper.get('[data-testid="audit-page-indicator"]').text()).toContain("第 1 / 2 页");
    api.listAudit.mockResolvedValueOnce({ ...auditResult, page: 2 });
    await wrapper.get('[data-testid="next-page"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="next-page"]').attributes()).toHaveProperty("disabled");
    expect(wrapper.get('[data-testid="audit-page-indicator"]').text()).toContain("第 2 / 2 页");
  });

  it("resets to the first page when the Super Admin changes group filter", async () => {
    wrapper = await mountPage();
    await wrapper.get('[data-testid="next-page"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="audit-group-filter"]').setValue("4");
    await flushPromises();

    expect(api.listAudit).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, groupId: 4 });
  });

  it("returns to the last valid page when the total shrinks below the requested page", async () => {
    wrapper = await mountPage();
    api.listAudit
      .mockResolvedValueOnce({ page: 2, pageSize: 20, total: 0, items: [] })
      .mockResolvedValueOnce({ page: 1, pageSize: 20, total: 0, items: [] });

    await wrapper.get('[data-testid="next-page"]').trigger("click");
    await flushPromises();
    await flushPromises();

    expect(api.listAudit).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 });
    expect(wrapper.get('[data-testid="audit-page-indicator"]').text()).toContain("第 1 / 1 页");
  });

  it("renders empty and failed states", async () => {
    api.listAudit.mockResolvedValueOnce({ page: 1, pageSize: 20, total: 0, items: [] });
    wrapper = await mountPage();
    expect(wrapper.text()).toContain("暂无审计日志");
    wrapper.unmount();

    api.listAudit.mockRejectedValueOnce(new Error("审计日志加载失败"));
    wrapper = await mountPage();
    expect(wrapper.get('[role="alert"]').text()).toContain("审计日志加载失败");
  });
});
