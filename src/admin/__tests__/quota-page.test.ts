// @vitest-environment jsdom

import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getQuotaOverview: vi.fn(),
  adjustQuota: vi.fn(),
  adminErrorText: vi.fn((error: unknown) => error instanceof Error ? error.message : "请求失败"),
}));

vi.mock("../api/adminApi", () => api);

import QuotaPage from "../pages/QuotaPage.vue";
import { useAdminSessionStore } from "../session";

const TButtonStub = defineComponent({
  props: { disabled: Boolean, loading: Boolean, type: { type: String, default: "button" } },
  template: '<button :type="type" :disabled="disabled" :data-loading="String(loading)"><slot name="icon" /><slot /></button>',
});
const TDialogStub = defineComponent({
  props: { visible: Boolean },
  emits: ["update:visible"],
  template: '<div v-if="visible" role="dialog"><slot /><slot name="footer" /></div>',
});
const TSelectStub = defineComponent({
  props: { modelValue: [String, Number], options: Array, disabled: Boolean },
  emits: ["update:modelValue"],
  methods: {
    update(event: Event) {
      const raw = (event.target as HTMLSelectElement).value;
      this.$emit("update:modelValue", /^\\d+$/.test(raw) ? Number(raw) : raw);
    },
  },
  template: '<select :value="modelValue" :disabled="disabled" @change="update"><option v-for="item in options" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
});
const TInputStub = defineComponent({
  props: { modelValue: [String, Number], disabled: Boolean },
  emits: ["update:modelValue"],
  methods: { update(event: Event) { this.$emit("update:modelValue", (event.target as HTMLInputElement).value); } },
  template: '<input :value="modelValue" :disabled="disabled" @input="update" />',
});

const overview = {
  summary: { balance: 120.5, totalRecharge: 200, totalUsage: 79.5 },
  groups: [
    { groupId: 3, groupName: "内容一组", balance: 70.5, totalRecharge: 120, totalUsage: 49.5 },
    { groupId: 4, groupName: "内容二组", balance: 50, totalRecharge: 80, totalUsage: 30 },
  ],
  logs: [
    { id: 9, groupId: 3, entryType: "manual_topup", amount: 100, balanceBefore: 0, balanceAfter: 100, actorUserId: 1, usageLedgerId: null, reason: "月度充值", createdAt: 1000 },
  ],
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
  const mounted = mount(QuotaPage, {
    global: {
      plugins: [pinia],
      stubs: {
        TButton: TButtonStub,
        TDialog: TDialogStub,
        TSelect: TSelectStub,
        TInput: TInputStub,
        IRefresh: true,
        IAdd: true,
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
  api.getQuotaOverview.mockResolvedValue(overview);
  api.adjustQuota.mockResolvedValue({ account: { groupId: 3, balance: 71.5, updatedAt: 2 }, ledger: overview.logs[0] });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe("QuotaPage", () => {
  it("shows summary, group balances, cumulative values and ledger rows", async () => {
    wrapper = await mountPage();

    expect(wrapper.text()).toContain("120.500000");
    expect(wrapper.text()).toContain("累计充值");
    expect(wrapper.text()).toContain("累计用量");
    expect(wrapper.text()).toContain("内容一组");
    expect(wrapper.text()).toContain("月度充值");
    expect(wrapper.text()).toContain("在线支付未开放");
  });

  it("keeps quota read-only for Admin", async () => {
    wrapper = await mountPage("admin");

    expect(wrapper.find('[data-testid="open-adjustment"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("额度仅供查看");
    expect(api.adjustQuota).not.toHaveBeenCalled();
  });

  it("renders empty and failed states", async () => {
    api.getQuotaOverview.mockResolvedValueOnce({ summary: { balance: 0, totalRecharge: 0, totalUsage: 0 }, groups: [], logs: [] });
    wrapper = await mountPage();
    expect(wrapper.text()).toContain("暂无额度流水");
    wrapper.unmount();

    api.getQuotaOverview.mockRejectedValueOnce(new Error("额度加载失败"));
    wrapper = await mountPage();
    expect(wrapper.get('[role="alert"]').text()).toContain("额度加载失败");
  });

  it.each([
    ["0", "运营补偿", "调整金额必须大于零"],
    ["1.1234567", "运营补偿", "调整金额最多保留 6 位小数"],
    ["1", "短", "调整原因至少 2 个字符"],
  ])("validates amount %s and reason before submit", async (amount, reason, message) => {
    wrapper = await mountPage();
    await wrapper.get('[data-testid="open-adjustment"]').trigger("click");
    await wrapper.get<HTMLInputElement>('[data-testid="adjustment-amount"]').setValue(amount);
    await wrapper.get<HTMLInputElement>('[data-testid="adjustment-reason"]').setValue(reason);
    await wrapper.get('[data-testid="submit-adjustment"]').trigger("click");

    expect(wrapper.text()).toContain(message);
    expect(api.adjustQuota).not.toHaveBeenCalled();
  });

  it("submits a valid manual adjustment and refreshes the overview", async () => {
    wrapper = await mountPage();
    await wrapper.get('[data-testid="open-adjustment"]').trigger("click");
    await wrapper.get('[data-testid="adjustment-group"]').setValue("3");
    await wrapper.get('[data-testid="adjustment-type"]').setValue("manual_credit");
    await wrapper.get<HTMLInputElement>('[data-testid="adjustment-amount"]').setValue("1.123456");
    await wrapper.get<HTMLInputElement>('[data-testid="adjustment-reason"]').setValue("运营补偿");
    await wrapper.get('[data-testid="submit-adjustment"]').trigger("click");
    await flushPromises();

    expect(api.adjustQuota).toHaveBeenCalledWith({ groupId: 3, entryType: "manual_credit", amount: 1.123456, reason: "运营补偿" });
    expect(api.getQuotaOverview).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("额度调整成功");
  });

  it("shows a failed adjustment without refreshing", async () => {
    api.adjustQuota.mockRejectedValueOnce(new Error("额度账户不存在"));
    wrapper = await mountPage();
    await wrapper.get('[data-testid="open-adjustment"]').trigger("click");
    await wrapper.get<HTMLInputElement>('[data-testid="adjustment-amount"]').setValue("1");
    await wrapper.get<HTMLInputElement>('[data-testid="adjustment-reason"]').setValue("运营补偿");
    await wrapper.get('[data-testid="submit-adjustment"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("额度账户不存在");
    expect(api.getQuotaOverview).toHaveBeenCalledTimes(1);
  });
});
