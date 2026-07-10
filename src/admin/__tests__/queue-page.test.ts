// @vitest-environment jsdom

import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listJobs: vi.fn(),
  cancelJob: vi.fn(),
  reprioritizeJob: vi.fn(),
  getPolicies: vi.fn(),
  updateGroupPolicy: vi.fn(),
  updateUserPolicy: vi.fn(),
  listGroups: vi.fn(),
  listUsers: vi.fn(),
  adminErrorText: vi.fn((error: unknown) => error instanceof Error ? error.message : "请求失败"),
}));

vi.mock("../api/adminApi", () => api);

import QueuePage from "../pages/QueuePage.vue";
import { useAdminSessionStore } from "../session";

const TButtonStub = defineComponent({
  props: { disabled: Boolean, loading: Boolean, type: { type: String, default: "button" } },
  template: '<button :type="type" :disabled="disabled" :data-loading="String(loading)"><slot name="icon" /><slot /></button>',
});

const TSelectStub = defineComponent({
  props: { modelValue: [String, Number], options: Array, disabled: Boolean },
  emits: ["update:modelValue", "change"],
  methods: {
    update(event: Event) {
      const raw = (event.target as HTMLSelectElement).value;
      const value = /^\\d+$/.test(raw) ? Number(raw) : raw;
      this.$emit("update:modelValue", value);
      this.$emit("change", value);
    },
  },
  template: '<select :value="modelValue" :disabled="disabled" @change="update"><option value="">全部</option><option v-for="item in options" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
});

const TInputNumberStub = defineComponent({
  props: { modelValue: Number, disabled: Boolean },
  emits: ["update:modelValue"],
  methods: {
    update(event: Event) {
      this.$emit("update:modelValue", Number((event.target as HTMLInputElement).value));
    },
  },
  template: '<input type="number" :value="modelValue" :disabled="disabled" @input="update" />',
});

const TDialogStub = defineComponent({
  props: { visible: Boolean },
  emits: ["update:visible"],
  template: '<div v-if="visible" role="dialog"><slot /><slot name="footer" /></div>',
});

const counts = {
  queued: 1,
  running: 1,
  recovering: 0,
  needs_attention: 0,
  succeeded: 0,
  failed: 0,
  cancelled: 0,
};

const jobs = [
  {
    id: 11,
    groupId: 3,
    ownerUserId: 7,
    projectId: 9,
    taskType: "image",
    status: "queued",
    priority: 2,
    queuePosition: 3,
    queuedAt: 1000,
    startedAt: null,
    finishedAt: null,
    errorMessage: null,
  },
  {
    id: 12,
    groupId: 3,
    ownerUserId: 8,
    projectId: 10,
    taskType: "video",
    status: "running",
    priority: 0,
    queuePosition: null,
    queuedAt: 2000,
    startedAt: 3000,
    finishedAt: null,
    errorMessage: null,
  },
];

const groups = [
  { id: 3, name: "内容一组", adminUserId: 2, creatorLimit: 5, status: "enabled", createdAt: 1, updatedAt: 1 },
  { id: 4, name: "内容二组", adminUserId: 5, creatorLimit: 5, status: "enabled", createdAt: 1, updatedAt: 1 },
];

const users = [
  { id: 2, name: "组管理员", role: "admin", groupId: 3, status: "enabled", mustChangePassword: false, createdAt: 1, updatedAt: 1, lastLoginAt: null },
  { id: 7, name: "创作者甲", role: "creator", groupId: 3, status: "enabled", mustChangePassword: false, createdAt: 1, updatedAt: 1, lastLoginAt: null },
  { id: 8, name: "创作者乙", role: "creator", groupId: 4, status: "enabled", mustChangePassword: false, createdAt: 1, updatedAt: 1, lastLoginAt: null },
];

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

  const wrapper = mount(QueuePage, {
    global: {
      plugins: [pinia],
      stubs: {
        TButton: TButtonStub,
        TSelect: TSelectStub,
        TInputNumber: TInputNumberStub,
        TDialog: TDialogStub,
        TTooltip: { template: "<span><slot /></span>" },
        IRefresh: true,
        IClose: true,
        IEdit: true,
        ISave: true,
        ILoadingThree: true,
        IInbox: true,
        IAttention: true,
      },
    },
  });
  await flushPromises();
  await nextTick();
  return wrapper;
}

let wrapper: VueWrapper | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  api.listJobs.mockResolvedValue({ items: jobs, counts });
  api.listGroups.mockResolvedValue(groups);
  api.listUsers.mockResolvedValue(users);
  api.getPolicies.mockResolvedValue({
    group: { total: 8, text: 4, image: 3, video: 2 },
    user: { total: 4, text: 2, image: 1, video: 1 },
  });
  api.cancelJob.mockResolvedValue({});
  api.reprioritizeJob.mockResolvedValue({});
  api.updateGroupPolicy.mockResolvedValue({});
  api.updateUserPolicy.mockResolvedValue({});
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.restoreAllMocks();
});

describe("QueuePage", () => {
  it("shows Chinese status counts, queue position, errors and Super operations", async () => {
    wrapper = await mountPage("super_admin");

    expect(wrapper.text()).toContain("排队中1");
    expect(wrapper.text()).toContain("执行中1");
    expect(wrapper.text()).toContain("预计第 3 位");
    expect(wrapper.find('[data-testid="reprioritize-11"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="save-group-policy"]').exists()).toBe(true);
    expect(wrapper.findAll('input[type="number"]').map((input) => input.element.value)).toEqual([
      "8", "4", "3", "2", "4", "2", "1", "1",
    ]);
  });

  it("keeps group policy read-only for Admin and limits user targets to same-group Creators", async () => {
    wrapper = await mountPage("admin");

    expect(api.listGroups).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="save-group-policy"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="reprioritize-11"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="concurrency-group"]').attributes()).toHaveProperty("disabled");
    const targetText = wrapper.get('[data-testid="concurrency-user"]').text();
    expect(targetText).toContain("创作者甲");
    expect(targetText).not.toContain("组管理员");
    expect(targetText).not.toContain("创作者乙");
    const policyInputs = wrapper.findAll('input[type="number"]');
    expect(policyInputs.slice(0, 4).every((input) => input.attributes("disabled") !== undefined)).toBe(true);
    expect(policyInputs.slice(4).every((input) => input.attributes("disabled") === undefined)).toBe(true);
  });

  it("applies status, type and user filters", async () => {
    wrapper = await mountPage("super_admin");

    await wrapper.get('[data-testid="filter-status"]').setValue("queued");
    await wrapper.get('[data-testid="filter-type"]').setValue("image");
    await wrapper.get('[data-testid="filter-user"]').setValue("7");
    await flushPromises();

    expect(api.listJobs).toHaveBeenLastCalledWith({ status: "queued", taskType: "image", ownerUserId: 7 });
  });

  it("renders empty and failed loading states", async () => {
    api.listJobs.mockResolvedValueOnce({ items: [], counts: { ...counts, queued: 0, running: 0 } });
    wrapper = await mountPage();
    expect(wrapper.text()).toContain("暂无队列任务");
    wrapper.unmount();

    api.listJobs.mockRejectedValueOnce(new Error("队列加载失败"));
    wrapper = await mountPage();
    expect(wrapper.get('[role="alert"]').text()).toContain("队列加载失败");
  });

  it("cancels an active job and refreshes the queue", async () => {
    wrapper = await mountPage();
    await wrapper.get('[data-testid="cancel-11"]').trigger("click");
    await flushPromises();

    expect(api.cancelJob).toHaveBeenCalledWith(11);
    expect(api.listJobs).toHaveBeenCalledTimes(2);
  });

  it("shows the refresh button as busy while a manual refresh is pending", async () => {
    wrapper = await mountPage();
    let resolveRefresh: ((value: { items: typeof jobs; counts: typeof counts }) => void) | undefined;
    api.listJobs.mockImplementationOnce(() => new Promise((resolve) => {
      resolveRefresh = resolve;
    }));

    await wrapper.get('[data-testid="refresh-queue"]').trigger("click");
    await nextTick();

    expect(wrapper.get('[data-testid="refresh-queue"]').attributes("data-loading")).toBe("true");
    resolveRefresh?.({ items: jobs, counts });
    await flushPromises();
    expect(wrapper.get('[data-testid="refresh-queue"]').attributes("data-loading")).toBe("false");
  });

  it("requires a reason before a Super Admin reprioritizes a queued job", async () => {
    wrapper = await mountPage();
    await wrapper.get('[data-testid="reprioritize-11"]').trigger("click");
    await wrapper.get('[data-testid="submit-priority"]').trigger("click");
    expect(wrapper.text()).toContain("请填写调整原因");
    expect(api.reprioritizeJob).not.toHaveBeenCalled();

    await wrapper.get<HTMLInputElement>('[data-testid="priority-value"]').setValue("9");
    await wrapper.get<HTMLInputElement>('[data-testid="priority-reason"]').setValue("紧急项目插队");
    await wrapper.get('[data-testid="submit-priority"]').trigger("click");
    await flushPromises();

    expect(api.reprioritizeJob).toHaveBeenCalledWith({ id: 11, priority: 9, reason: "紧急项目插队" });
  });

  it("shows the Chinese over-group error when an Admin updates a Creator policy", async () => {
    api.updateUserPolicy.mockRejectedValueOnce(new Error("个人总并发不能超过分组总并发"));
    wrapper = await mountPage("admin");
    await wrapper.get('[data-testid="save-user-policy"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("个人总并发不能超过分组总并发");
  });

  it("polls every five seconds and clears the timer on unmount", async () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    wrapper = await mountPage();

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
    const timer = setIntervalSpy.mock.results[0]?.value;
    wrapper.unmount();
    wrapper = undefined;
    expect(clearIntervalSpy).toHaveBeenCalledWith(timer);
  });
});
