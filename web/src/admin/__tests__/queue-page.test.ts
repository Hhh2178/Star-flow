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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
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

  it("shows a dedicated loading state while concurrency targets are pending", async () => {
    let resolveUsers: ((value: typeof users) => void) | undefined;
    api.listUsers.mockImplementationOnce(() => new Promise((resolve) => {
      resolveUsers = resolve;
    }));

    wrapper = await mountPage();

    expect(wrapper.get('[data-testid="target-loading"]').text()).toContain("加载并发目标");
    expect(wrapper.find('[data-testid="concurrency-group"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("暂无可管理的并发目标");

    resolveUsers?.(users);
    await flushPromises();
    await nextTick();
    expect(wrapper.find('[data-testid="target-loading"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="concurrency-group"]').exists()).toBe(true);
  });

  it("shows a retryable target error and recovers after loadTargets succeeds", async () => {
    api.listUsers.mockRejectedValueOnce(new Error("并发目标加载失败"));

    wrapper = await mountPage();

    const errorState = wrapper.get('[data-testid="target-error"]');
    expect(errorState.text()).toContain("并发目标加载失败");
    expect(errorState.get("button").text()).toContain("重试");
    expect(wrapper.text()).not.toContain("暂无可管理的并发目标");

    await errorState.get("button").trigger("click");
    await flushPromises();
    await nextTick();

    expect(api.listUsers).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="target-error"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="concurrency-group"]').exists()).toBe(true);
  });

  it("shows the target empty state only after a successful empty response", async () => {
    api.listUsers.mockResolvedValueOnce([]);
    api.listGroups.mockResolvedValueOnce([]);

    wrapper = await mountPage();

    expect(wrapper.get('[data-testid="target-empty"]').text()).toContain("暂无可管理的并发目标");
    expect(wrapper.find('[data-testid="target-loading"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="target-error"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="concurrency-group"]').exists()).toBe(false);
  });

  it("keeps the group selector available when the first Super Admin group has no manageable users", async () => {
    api.listGroups.mockResolvedValueOnce([
      { id: 1, name: "空分组", adminUserId: null, creatorLimit: 5, status: "enabled", createdAt: 1, updatedAt: 1 },
      ...groups,
    ]);

    wrapper = await mountPage("super_admin");

    expect(wrapper.get('[data-testid="concurrency-group"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="target-user-empty"]').text()).toContain("请选择有可管理账号的分组");

    await wrapper.get('[data-testid="concurrency-group"]').setValue("3");
    await flushPromises();
    await nextTick();

    expect(wrapper.get('[data-testid="concurrency-user"]').text()).toContain("创作者甲");
    expect(wrapper.get('[data-testid="save-group-policy"]').exists()).toBe(true);
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

  it("queues one rerun with the latest filters and never applies the stale response", async () => {
    wrapper = await mountPage();
    const staleRequest = deferred<{ items: typeof jobs; counts: typeof counts }>();
    const latestRequest = deferred<{ items: typeof jobs; counts: typeof counts }>();
    api.listJobs
      .mockImplementationOnce(() => staleRequest.promise)
      .mockImplementationOnce(() => latestRequest.promise);

    await wrapper.get('[data-testid="refresh-queue"]').trigger("click");
    await wrapper.get('[data-testid="filter-status"]').setValue("queued");
    await wrapper.get('[data-testid="filter-type"]').setValue("image");

    expect(api.listJobs).toHaveBeenCalledTimes(2);
    staleRequest.resolve({
      items: [{ ...jobs[0], id: 99, status: "succeeded", taskType: "text" }],
      counts: { ...counts, queued: 0, succeeded: 1 },
    });
    await flushPromises();

    expect(api.listJobs).toHaveBeenCalledTimes(3);
    expect(wrapper.text()).not.toContain("#99");
    latestRequest.resolve({
      items: [{ ...jobs[0], id: 77 }],
      counts,
    });
    await flushPromises();

    expect(api.listJobs).toHaveBeenLastCalledWith({ status: "queued", taskType: "image" });
    expect(wrapper.text()).toContain("#77");
  });

  it("does not overlap interval polls and coalesces repeated ticks into one rerun", async () => {
    let intervalCallback: (() => void) | undefined;
    vi.spyOn(window, "setInterval").mockImplementation(((handler: TimerHandler) => {
      if (typeof handler === "function") intervalCallback = handler;
      return 41;
    }) as typeof window.setInterval);
    vi.spyOn(window, "clearInterval").mockImplementation(() => undefined);
    wrapper = await mountPage();
    const pollRequest = deferred<{ items: typeof jobs; counts: typeof counts }>();
    api.listJobs.mockImplementationOnce(() => pollRequest.promise);

    intervalCallback?.();
    intervalCallback?.();
    intervalCallback?.();
    await nextTick();

    expect(api.listJobs).toHaveBeenCalledTimes(2);
    pollRequest.resolve({ items: jobs, counts });
    await flushPromises();
    await flushPromises();

    expect(api.listJobs).toHaveBeenCalledTimes(3);
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

  it("discards a stale policy response that resolves after the latest target", async () => {
    wrapper = await mountPage();
    const staleRequest = deferred<{
      group: { total: number; text: number; image: number; video: number };
      user: { total: number; text: number; image: number; video: number };
    }>();
    const latestRequest = deferred<{
      group: { total: number; text: number; image: number; video: number };
      user: { total: number; text: number; image: number; video: number };
    }>();
    api.getPolicies
      .mockImplementationOnce(() => staleRequest.promise)
      .mockImplementationOnce(() => latestRequest.promise);

    await wrapper.get('[data-testid="concurrency-user"]').setValue("7");
    await wrapper.get('[data-testid="concurrency-group"]').setValue("4");
    latestRequest.resolve({
      group: { total: 20, text: 10, image: 8, video: 6 },
      user: { total: 10, text: 5, image: 4, video: 3 },
    });
    await flushPromises();

    expect(wrapper.findAll('input[type="number"]').map((input) => input.element.value)).toEqual([
      "20", "10", "8", "6", "10", "5", "4", "3",
    ]);
    staleRequest.resolve({
      group: { total: 90, text: 90, image: 90, video: 90 },
      user: { total: 80, text: 80, image: 80, video: 80 },
    });
    await flushPromises();

    expect(wrapper.findAll('input[type="number"]').map((input) => input.element.value)).toEqual([
      "20", "10", "8", "6", "10", "5", "4", "3",
    ]);
  });

  it("rejects a user policy save when the current target was not loaded and reloads it", async () => {
    wrapper = await mountPage();
    wrapper.getComponent('[data-testid="concurrency-user"]').vm.$emit("update:modelValue", 7);
    await nextTick();

    await wrapper.get('[data-testid="save-user-policy"]').trigger("click");
    await flushPromises();

    expect(api.updateUserPolicy).not.toHaveBeenCalled();
    expect(api.getPolicies).toHaveBeenLastCalledWith({ groupId: 3, userId: 7 });
    expect(wrapper.text()).toContain("当前目标已变更");
  });

  it("rejects a group policy save when the current target was not loaded and reloads it", async () => {
    wrapper = await mountPage();
    wrapper.getComponent('[data-testid="concurrency-group"]').vm.$emit("update:modelValue", 4);
    wrapper.getComponent('[data-testid="concurrency-user"]').vm.$emit("update:modelValue", 8);
    await nextTick();

    await wrapper.get('[data-testid="save-group-policy"]').trigger("click");
    await flushPromises();

    expect(api.updateGroupPolicy).not.toHaveBeenCalled();
    expect(api.getPolicies).toHaveBeenLastCalledWith({ groupId: 4, userId: 8 });
    expect(wrapper.text()).toContain("当前目标已变更");
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
