// @vitest-environment jsdom

import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ listGroups: vi.fn(), listUsers: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), resetUserPassword: vi.fn(), adminErrorText: vi.fn((error: unknown) => error instanceof Error ? error.message : "请求失败") }));
vi.mock("../api/adminApi", () => api);
import UsersPage from "../pages/UsersPage.vue";
import { useAdminSessionStore } from "../session";

const TButtonStub = defineComponent({ props: { disabled: Boolean, loading: Boolean }, template: '<button :disabled="disabled"><slot name="icon"/><slot/></button>' });
const TDialogStub = defineComponent({ props: { visible: Boolean }, emits: ["update:visible"], template: '<div v-if="visible" role="dialog"><slot/></div>' });
const TInputStub = defineComponent({ props: { modelValue: [String, Number] }, emits: ["update:modelValue"], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' });
const TInputNumberStub = defineComponent({ props: { modelValue: Number }, emits: ["update:modelValue"], template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />' });
const TSelectStub = defineComponent({ props: { modelValue: [String, Number], options: Array }, emits: ["update:modelValue"], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', /^\\d+$/.test($event.target.value) ? Number($event.target.value) : $event.target.value)"><option v-for="item in options" :value="item.value">{{ item.label }}</option></select>' });
const groups = [{ id: 3, name: "内容一组", adminUserId: 2, creatorLimit: 5, status: "enabled", createdAt: 1, updatedAt: 1 }];
const users = [{ id: 7, name: "创作者甲", role: "creator", status: "enabled", groupId: 3, mustChangePassword: false, createdAt: 1, updatedAt: 1, lastLoginAt: null }];
async function flush() { await new Promise((resolve) => setTimeout(resolve, 0)); await nextTick(); }
async function mountPage(role: "admin" | "super_admin" = "admin") {
  const pinia = createPinia(); setActivePinia(pinia); const store = useAdminSessionStore();
  store.session = role === "admin" ? { id: 2, name: "组管理员", role, groupId: 3, groupName: "内容一组" } : { id: 1, name: "平台管理员", role, groupId: null, groupName: null }; store.token = "Bearer token";
  const wrapper = mount(UsersPage, { global: { plugins: [pinia], stubs: { TButton: TButtonStub, TDialog: TDialogStub, TInput: TInputStub, TInputNumber: TInputNumberStub, TSelect: TSelectStub, IRefresh: true, IAdd: true, ILock: true, IUnlock: true, IKey: true, ILoadingThree: true, IInbox: true, IAttention: true } } });
  await flush(); return wrapper;
}
let wrapper: VueWrapper | undefined;
beforeEach(() => { vi.clearAllMocks(); api.listGroups.mockResolvedValue(groups); api.listUsers.mockResolvedValue(users); api.createUser.mockResolvedValue(users[0]); api.updateUser.mockResolvedValue(users[0]); api.resetUserPassword.mockResolvedValue(null); });
afterEach(() => { wrapper?.unmount(); wrapper = undefined; });

describe("UsersPage", () => {
  it("keeps Admin scoped to Creator creation without loading all groups", async () => {
    wrapper = await mountPage("admin"); expect(wrapper.text()).toContain("创作者甲"); expect(wrapper.text()).not.toContain("超级管理员"); expect(api.listGroups).not.toHaveBeenCalled();
    await wrapper.get('[data-testid="open-create-user"]').trigger("click");
    expect(wrapper.text()).not.toContain("创建分组管理员");
  });

  it("creates a Creator in the selected group as Super Admin", async () => {
    wrapper = await mountPage("super_admin"); await wrapper.get('[data-testid="open-create-user"]').trigger("click");
    await wrapper.get('[data-testid="create-user-name"]').setValue("creator-b"); await wrapper.get('[data-testid="create-user-password"]').setValue("Temporary123");
    await wrapper.get('[data-testid="create-user-group"]').setValue("3"); await wrapper.get('[data-testid="submit-create-user"]').trigger("click"); await flush();
    expect(api.createUser).toHaveBeenCalledWith({ name: "creator-b", password: "Temporary123", role: "creator", status: "enabled", groupId: 3 });
  });

  it("disables and resets a scoped user", async () => {
    wrapper = await mountPage(); await wrapper.get('[data-testid="toggle-user-7"]').trigger("click"); await flush();
    expect(api.updateUser).toHaveBeenCalledWith({ id: 7, status: "disabled" });
    await wrapper.get('[data-testid="reset-user-7"]').trigger("click"); await wrapper.get('[data-testid="reset-password"]').setValue("ResetPass123");
    await wrapper.get('[data-testid="submit-reset-password"]').trigger("click"); await flush();
    expect(api.resetUserPassword).toHaveBeenCalledWith({ id: 7, password: "ResetPass123" });
  });
});
