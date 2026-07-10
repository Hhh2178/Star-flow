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
const usageResult = { summary: { recordCount: 1, estimatedCost: 1.2 }, breakdown: [{ taskType: "image", recordCount: 1, estimatedCost: 1.2 }], page: 1, pageSize: 20, total: 1, items: [{ id: 501, jobId: 401, groupId: 30, groupName: "验收一组", userId: 4, userName: "创作者甲", projectId: 201, projectName: "验收项目", providerId: "provider-a", modelId: "image-a", taskType: "image", estimatedCost: 1.2, currency: "CNY", result: "succeeded", createdAt: 3 }] };
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
  it("renders usage totals, breakdown and ledger", async () => { wrapper = await mountPage(UsagePage, "super_admin"); expect(wrapper.text()).toContain("1.200000"); expect(wrapper.text()).toContain("图片"); expect(wrapper.text()).toContain("provider-a"); expect(api.listGroups).toHaveBeenCalled(); });
});
