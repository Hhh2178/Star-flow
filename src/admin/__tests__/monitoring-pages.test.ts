// @vitest-environment jsdom

import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listGroups: vi.fn(), listUsers: vi.fn(), listProjects: vi.fn(), listTasks: vi.fn(), getUsageOverview: vi.fn(),
  adminErrorText: vi.fn((error: unknown) => error instanceof Error ? error.message : "请求失败"),
}));
vi.mock("../api/adminApi", () => api);
import ProjectsPage from "../pages/ProjectsPage.vue";
import TasksPage from "../pages/TasksPage.vue";
import UsagePage from "../pages/UsagePage.vue";
import { useAdminSessionStore } from "../session";

const TButtonStub = defineComponent({ props: { disabled: Boolean, loading: Boolean }, template: '<button :disabled="disabled"><slot name="icon"/><slot/></button>' });
const TInputStub = defineComponent({ props: { modelValue: [String, Number] }, emits: ["update:modelValue"], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' });
const TSelectStub = defineComponent({ props: { modelValue: [String, Number], options: Array }, emits: ["update:modelValue", "change"], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value); $emit(\'change\')"><option v-for="item in options" :value="item.value">{{ item.label }}</option></select>' });
const stubs = { TButton: TButtonStub, TInput: TInputStub, TSelect: TSelectStub, IRefresh: true, ISearch: true, ILoadingThree: true, IInbox: true, IAttention: true };
const projectResult = { page: 1, pageSize: 20, total: 1, items: [{ id: 201, name: "验收项目", projectType: "series", type: "漫剧", ownerUserId: 4, ownerName: "创作者甲", groupId: 30, groupName: "验收一组", createTime: 1, taskCount: 2 }] };
const taskResult = { page: 1, pageSize: 20, total: 1, items: [{ id: 301, projectId: 201, projectName: "验收项目", ownerUserId: 4, ownerName: "创作者甲", groupId: 30, groupName: "验收一组", taskClass: "image", model: "image-a", description: null, state: "failed", startTime: 2, reason: "生成失败" }] };
const usageBase = { groupId: 30, groupName: "验收一组", userId: 4, userName: "创作者甲", projectId: 201, projectName: "验收项目", providerId: "provider-a", currency: "CNY", result: "succeeded" };
const snapshotBase = { pricingId: 1, providerId: "provider-a", taskType: "text", currency: "CNY", effectiveAt: 1 };
const usageResult = {
  summary: { recordCount: 3, estimatedCost: 0.68 }, breakdown: [{ taskType: "text", recordCount: 1, estimatedCost: 0.05 }, { taskType: "image", recordCount: 1, estimatedCost: 0.18 }, { taskType: "video", recordCount: 1, estimatedCost: 0.45 }],
  page: 1, pageSize: 20, total: 3,
  items: [
    { ...usageBase, id: 501, jobId: 401, modelId: "image-a", taskType: "image", estimatedCost: 0.18, units: { requests: 1, images: 1 }, pricingSnapshot: { ...snapshotBase, modelId: "image-a", taskType: "image", billingMode: "per_request", requestPrice: 0.18, version: 2 }, billingMode: "per_request", finalCost: 0.18, createdAt: 3 },
    { ...usageBase, id: 502, jobId: 402, modelId: "video-a", taskType: "video", estimatedCost: 0.45, units: { requests: 1, seconds: 15 }, pricingSnapshot: { ...snapshotBase, modelId: "video-a", taskType: "video", billingMode: "per_second", secondPrice: 0.03, version: 4 }, billingMode: "per_second", finalCost: 0.45, createdAt: 2 },
    { ...usageBase, id: 503, jobId: 403, modelId: "text-a", taskType: "text", estimatedCost: 0.05, units: { requests: 1, inputTokens: 125000, outputTokens: 25000 }, pricingSnapshot: { ...snapshotBase, modelId: "text-a", billingMode: "per_token", inputPricePerMillion: 0.2, outputPricePerMillion: 1, fallbackRequestPrice: 0.05, version: 7 }, billingMode: "per_token", finalCost: 0.05, createdAt: 1 },
  ],
};
async function flush() { await new Promise((resolve) => setTimeout(resolve, 0)); await nextTick(); }
async function mountPage(component: object, role: "admin" | "super_admin" = "admin") {
  const pinia = createPinia(); setActivePinia(pinia); const store = useAdminSessionStore();
  store.session = role === "admin" ? { id: 2, name: "组管理员", role, groupId: 30, groupName: "验收一组" } : { id: 1, name: "平台管理员", role, groupId: null, groupName: null }; store.token = "Bearer token";
  const wrapper = mount(component, { global: { plugins: [pinia], stubs } }); await flush(); return wrapper;
}
let wrapper: VueWrapper | undefined;
beforeEach(() => { vi.clearAllMocks(); api.listGroups.mockResolvedValue([{ id: 30, name: "验收一组", adminUserId: 2, creatorLimit: 5, status: "enabled", createdAt: 1, updatedAt: 1 }]); api.listUsers.mockResolvedValue([{ id: 4, name: "创作者甲", role: "creator", status: "enabled", groupId: 30, mustChangePassword: false, createdAt: 1, updatedAt: 1, lastLoginAt: null }]); api.listProjects.mockResolvedValue(projectResult); api.listTasks.mockResolvedValue(taskResult); api.getUsageOverview.mockResolvedValue(usageResult); });
afterEach(() => { wrapper?.unmount(); wrapper = undefined; });

describe("admin monitoring pages", () => {
  it("renders scoped projects without loading global groups for Admin", async () => { wrapper = await mountPage(ProjectsPage); expect(wrapper.text()).toContain("验收项目"); expect(wrapper.text()).toContain("2 个任务"); expect(api.listGroups).not.toHaveBeenCalled(); expect(api.listProjects).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 20 })); });
  it("renders failed tasks and their safe reason", async () => { wrapper = await mountPage(TasksPage); expect(wrapper.text()).toContain("验收项目"); expect(wrapper.text()).toContain("生成失败"); expect(wrapper.text()).toContain("失败"); });
  it("renders request, second and Token units with snapshot versions and final costs", async () => {
    wrapper = await mountPage(UsagePage, "super_admin");
    expect(wrapper.text()).toContain("0.680000");
    expect(wrapper.text()).toContain("1 张");
    expect(wrapper.text()).toContain("15 秒");
    expect(wrapper.text()).toContain("输入 125000 / 输出 25000 Token");
    expect(wrapper.text()).toContain("按次");
    expect(wrapper.text()).toContain("按秒");
    expect(wrapper.text()).toContain("Token");
    expect(wrapper.text()).toContain("快照 v2");
    expect(wrapper.text()).toContain("快照 v4");
    expect(wrapper.text()).toContain("快照 v7");
    expect(wrapper.text()).toContain("0.180000 CNY");
    expect(wrapper.text()).toContain("0.450000 CNY");
    expect(wrapper.text()).toContain("0.050000 CNY");
    expect(api.listGroups).toHaveBeenCalled();
  });

  it("renders normalized historical usage without a pricing snapshot", async () => {
    api.getUsageOverview.mockResolvedValueOnce({
      summary: { recordCount: 1, estimatedCost: 1.2 },
      breakdown: [{ taskType: "image", recordCount: 1, estimatedCost: 1.2 }],
      page: 1, pageSize: 20, total: 1,
      items: [{ ...usageBase, id: 504, jobId: 404, modelId: "legacy-image", taskType: "image", estimatedCost: 1.2, units: {}, pricingSnapshot: null, billingMode: null, finalCost: 1.2, createdAt: 4 }],
    });

    wrapper = await mountPage(UsagePage, "super_admin");
    expect(wrapper.text()).toContain("历史记录");
    expect(wrapper.text()).toContain("1.200000 CNY");
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });
});
