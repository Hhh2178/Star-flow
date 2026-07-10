// @vitest-environment jsdom

import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listGroups: vi.fn(),
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateGroup: vi.fn(),
  adminErrorText: vi.fn((error: unknown) => error instanceof Error ? error.message : "请求失败"),
}));
vi.mock("../api/adminApi", () => api);

import GroupsPage from "../pages/GroupsPage.vue";
import { useAdminSessionStore } from "../session";

const TButtonStub = defineComponent({ props: { disabled: Boolean, loading: Boolean }, template: '<button :disabled="disabled"><slot name="icon"/><slot/></button>' });
const TDialogStub = defineComponent({ props: { visible: Boolean }, emits: ["update:visible"], template: '<div v-if="visible" role="dialog"><slot/></div>' });
const TInputStub = defineComponent({ props: { modelValue: [String, Number] }, emits: ["update:modelValue"], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' });
const TInputNumberStub = defineComponent({ props: { modelValue: Number }, emits: ["update:modelValue"], template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />' });
const TSelectStub = defineComponent({
  props: { modelValue: [String, Number], options: Array }, emits: ["update:modelValue"],
  template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in options" :value="item.value">{{ item.label }}</option></select>',
});
const groups = [{ id: 3, name: "内容一组", adminUserId: 2, creatorLimit: 5, status: "enabled", createdAt: 1, updatedAt: 1 }];
const users = [{ id: 2, name: "组管理员", role: "admin", status: "enabled", groupId: 3, mustChangePassword: false, createdAt: 1, updatedAt: 1, lastLoginAt: null }];

async function flush() { await new Promise((resolve) => setTimeout(resolve, 0)); await nextTick(); }
async function mountPage() {
  const pinia = createPinia(); setActivePinia(pinia);
  const store = useAdminSessionStore();
  store.session = { id: 1, name: "平台管理员", role: "super_admin", groupId: null, groupName: null }; store.token = "Bearer token";
  const wrapper = mount(GroupsPage, { global: { plugins: [pinia], stubs: { TButton: TButtonStub, TDialog: TDialogStub, TInput: TInputStub, TInputNumber: TInputNumberStub, TSelect: TSelectStub, IRefresh: true, IAdd: true, IEdit: true, ILoadingThree: true, IInbox: true, IAttention: true } } });
  await flush(); return wrapper;
}

let wrapper: VueWrapper | undefined;
beforeEach(() => { vi.clearAllMocks(); api.listGroups.mockResolvedValue(groups); api.listUsers.mockResolvedValue(users); api.createUser.mockResolvedValue(users[0]); api.updateGroup.mockResolvedValue(groups[0]); });
afterEach(() => { wrapper?.unmount(); wrapper = undefined; });

describe("GroupsPage", () => {
  it("renders group ownership and creator capacity", async () => {
    wrapper = await mountPage();
    expect(wrapper.text()).toContain("内容一组"); expect(wrapper.text()).toContain("组管理员"); expect(wrapper.text()).toContain("5 人");
  });

  it("creates an Admin together with a group", async () => {
    wrapper = await mountPage(); await wrapper.get('[data-testid="open-create-group"]').trigger("click");
    await wrapper.get('[data-testid="create-group-name"]').setValue("内容二组");
    await wrapper.get('[data-testid="create-admin-name"]').setValue("admin-b");
    await wrapper.get('[data-testid="create-admin-password"]').setValue("Temporary123");
    await wrapper.get('[data-testid="submit-create-group"]').trigger("click"); await flush();
    expect(api.createUser).toHaveBeenCalledWith(expect.objectContaining({ name: "admin-b", password: "Temporary123", role: "admin", groupName: "内容二组", creatorLimit: 5 }));
  });

  it("updates creator limit and status", async () => {
    wrapper = await mountPage(); await wrapper.get('[data-testid="edit-group-3"]').trigger("click");
    await wrapper.get('[data-testid="edit-group-limit"]').setValue("8");
    await wrapper.get('[data-testid="edit-group-status"]').setValue("disabled");
    await wrapper.get('[data-testid="submit-edit-group"]').trigger("click"); await flush();
    expect(api.updateGroup).toHaveBeenCalledWith({ id: 3, name: "内容一组", creatorLimit: 8, status: "disabled" });
  });
});
