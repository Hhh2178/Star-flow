// @vitest-environment jsdom

import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent, nextTick } from "vue";
import AdminLogin from "../pages/AdminLogin.vue";
import { useAdminSessionStore } from "../session";

const TButtonStub = defineComponent({
  inheritAttrs: false,
  props: {
    disabled: Boolean,
    loading: Boolean,
    type: { type: String, default: "button" },
  },
  template: `
    <button :type="type" :disabled="disabled" :data-loading="String(loading)">
      <slot />
    </button>
  `,
});

let wrapper: VueWrapper | undefined;

async function mountLogin() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/login", component: { template: "<div />" } }],
  });
  await router.push("/login");
  await router.isReady();

  wrapper = mount(AdminLogin, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      stubs: {
        TButton: TButtonStub,
        IUser: true,
        ILock: true,
        IAttention: true,
        ILeft: true,
      },
    },
  });
  return { wrapper, store: useAdminSessionStore() };
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
  localStorage.clear();
});

describe("AdminLogin", () => {
  it("links empty-field errors to native inputs and focuses the first invalid field", async () => {
    const mounted = await mountLogin();

    await mounted.wrapper.get("form").trigger("submit");
    await nextTick();

    const username = mounted.wrapper.get<HTMLInputElement>("input#admin-username");
    const password = mounted.wrapper.get<HTMLInputElement>("input#admin-password");
    expect(username.attributes()).toMatchObject({
      "aria-invalid": "true",
      "aria-describedby": "admin-username-error",
    });
    expect(password.attributes()).toMatchObject({
      "aria-invalid": "true",
      "aria-describedby": "admin-password-error",
    });
    expect(mounted.wrapper.get("#admin-username-error").attributes("role")).toBe("alert");
    expect(mounted.wrapper.get("#admin-password-error").attributes("role")).toBe("alert");
    expect(document.activeElement).toBe(username.element);
  });

  it("focuses password when it is the first invalid field", async () => {
    const mounted = await mountLogin();
    await mounted.wrapper.get<HTMLInputElement>("input#admin-username").setValue("admin");

    await mounted.wrapper.get("form").trigger("submit");
    await nextTick();

    expect(document.activeElement).toBe(
      mounted.wrapper.get<HTMLInputElement>("input#admin-password").element,
    );
  });

  it("disables controls and blocks submit while loading", async () => {
    const mounted = await mountLogin();
    const login = vi.spyOn(mounted.store, "login");
    mounted.store.loading = true;
    await nextTick();

    expect(mounted.wrapper.get("input#admin-username").attributes()).toHaveProperty("disabled");
    expect(mounted.wrapper.get("input#admin-password").attributes()).toHaveProperty("disabled");
    expect(mounted.wrapper.get('button[type="submit"]').attributes()).toHaveProperty("disabled");
    await mounted.wrapper.get("form").trigger("submit");
    expect(login).not.toHaveBeenCalled();
  });
});
