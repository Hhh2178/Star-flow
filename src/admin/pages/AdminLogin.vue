<template>
  <main class="admin-login">
    <section class="login-panel" aria-labelledby="login-title">
      <div class="login-brand">
        <span class="brand-mark">SF</span>
        <div>
          <strong>Stars Flow</strong>
          <span>管理后台</span>
        </div>
      </div>

      <div class="login-heading">
        <h1 id="login-title">管理员登录</h1>
        <p>使用管理员账号继续</p>
      </div>

      <form class="login-form" @submit.prevent="submit">
        <label for="admin-username">账号</label>
        <div
          class="input-control"
          :class="{
            'input-control--error': errors.username,
            'input-control--disabled': loading,
          }"
        >
          <i-user class="input-control__icon" theme="outline" aria-hidden="true" />
          <input
            id="admin-username"
            ref="usernameInput"
            v-model="form.username"
            class="login-input"
            type="text"
            autocomplete="username"
            placeholder="请输入账号"
            :disabled="loading"
            :aria-invalid="Boolean(errors.username)"
            :aria-describedby="errors.username ? 'admin-username-error' : undefined"
            @input="errors.username = ''"
          />
        </div>
        <span
          v-if="errors.username"
          id="admin-username-error"
          class="field-error"
          role="alert"
        >{{ errors.username }}</span>

        <label for="admin-password">密码</label>
        <div
          class="input-control"
          :class="{
            'input-control--error': errors.password,
            'input-control--disabled': loading,
          }"
        >
          <i-lock class="input-control__icon" theme="outline" aria-hidden="true" />
          <input
            id="admin-password"
            ref="passwordInput"
            v-model="form.password"
            class="login-input"
            type="password"
            autocomplete="current-password"
            placeholder="请输入密码"
            :disabled="loading"
            :aria-invalid="Boolean(errors.password)"
            :aria-describedby="errors.password ? 'admin-password-error' : undefined"
            @input="errors.password = ''"
          />
        </div>
        <span
          v-if="errors.password"
          id="admin-password-error"
          class="field-error"
          role="alert"
        >{{ errors.password }}</span>

        <div v-if="errorMessage" class="login-error" role="alert">
          <i-attention theme="outline" size="18" />
          <span>{{ errorMessage }}</span>
        </div>

        <t-button
          type="submit"
          theme="primary"
          size="large"
          block
          :loading="loading"
          :disabled="loading"
        >
          登录
        </t-button>
      </form>

      <button class="creator-link" type="button" @click="goToCreator">
        <i-left theme="outline" size="15" />
        返回创作前台
      </button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { nextTick, reactive, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { useAdminSessionStore } from "../session";

const route = useRoute();
const router = useRouter();
const sessionStore = useAdminSessionStore();
const { loading, errorMessage } = storeToRefs(sessionStore);
const form = reactive({ username: "", password: "" });
const errors = reactive({ username: "", password: "" });
const usernameInput = ref<HTMLInputElement | null>(null);
const passwordInput = ref<HTMLInputElement | null>(null);

function focusFirstError() {
  void nextTick(() => {
    if (errors.username) {
      usernameInput.value?.focus();
      return;
    }
    if (errors.password) passwordInput.value?.focus();
  });
}

function validate() {
  errors.username = form.username.trim() ? "" : "请输入账号";
  errors.password = form.password ? "" : "请输入密码";
  if (errors.username || errors.password) focusFirstError();
  return !errors.username && !errors.password;
}

async function submit() {
  if (loading.value) return;
  if (!validate()) return;
  try {
    await sessionStore.login({
      username: form.username.trim(),
      password: form.password,
    });
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    await router.replace(redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/");
  } catch {
    // The session store exposes the server or permission error in Chinese.
  }
}

function goToCreator() {
  window.location.assign("/");
}
</script>

<style scoped lang="scss">
.admin-login {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  background: #f3f6f5;
}

.login-panel {
  width: min(100%, 390px);
  padding: 28px 30px;
  border: 1px solid var(--stars-border);
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.07);
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--stars-border);
}

.brand-mark {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 6px;
  background: #17211f;
  color: #5eead4;
  font-size: 13px;
  font-weight: 700;
}

.login-brand div {
  display: grid;
  line-height: 1.2;
}

.login-brand strong {
  color: var(--stars-text);
  font-size: 16px;
}

.login-brand span:last-child {
  margin-top: 3px;
  color: var(--stars-text-muted);
  font-size: 12px;
}

.login-heading {
  margin: 24px 0 20px;
}

.login-heading h1 {
  margin: 0;
  color: var(--stars-text);
  font-size: 22px;
  letter-spacing: 0;
}

.login-heading p {
  margin: 7px 0 0;
  color: var(--stars-text-muted);
  font-size: 13px;
}

.login-form {
  display: grid;
  gap: 8px;
}

.login-form label {
  margin-top: 8px;
  color: var(--stars-text);
  font-size: 13px;
  font-weight: 600;
}

.input-control {
  display: grid;
  min-height: 40px;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--stars-border);
  border-radius: 4px;
  background: #ffffff;
  transition: border-color 120ms ease-out, box-shadow 120ms ease-out;
}

.input-control:focus-within {
  border-color: var(--stars-brand);
  box-shadow: 0 0 0 3px rgba(53, 109, 243, 0.14);
}

.input-control--error {
  border-color: var(--stars-danger);
}

.input-control--disabled {
  background: var(--stars-surface-muted);
  opacity: 0.72;
}

.input-control__icon {
  justify-self: center;
  color: var(--stars-text-muted);
  font-size: 17px;
}

.login-input {
  width: 100%;
  min-width: 0;
  height: 38px;
  padding: 0 12px 0 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--stars-text);
  font: inherit;
  font-size: 14px;
}

.login-input::placeholder {
  color: var(--stars-text-muted);
}

.field-error {
  color: var(--stars-danger);
  font-size: 12px;
}

.login-error {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 7px;
  margin: 8px 0 2px;
  padding: 9px 10px;
  border: 1px solid #fecaca;
  border-radius: 5px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 12px;
  line-height: 1.5;
}

.creator-link {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 18px auto 0;
  padding: 4px;
  border: 0;
  background: transparent;
  color: var(--stars-text-muted);
  font-size: 12px;
  cursor: pointer;
}

.creator-link:hover {
  color: var(--stars-brand);
}

@media (max-width: 480px) {
  .admin-login {
    place-items: start center;
    padding: 16px;
  }

  .login-panel {
    margin-top: 8vh;
    padding: 24px 20px;
  }
}
</style>
