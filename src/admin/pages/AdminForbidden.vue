<template>
  <main class="forbidden-page">
    <section class="forbidden-panel">
      <span class="status-code">403</span>
      <h1>无权访问管理后台</h1>
      <p>当前账号没有访问此页面的权限。</p>
      <div class="forbidden-actions">
        <t-button theme="primary" @click="returnToLogin">
          <template #icon><i-login theme="outline" /></template>
          返回登录
        </t-button>
        <t-button variant="outline" @click="returnToCreator">
          <template #icon><i-left theme="outline" /></template>
          返回创作端
        </t-button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAdminSessionStore } from "../session";

const router = useRouter();
const sessionStore = useAdminSessionStore();

async function returnToLogin() {
  sessionStore.logout();
  await router.replace("/login");
}

function returnToCreator() {
  window.location.assign("/");
}
</script>

<style scoped lang="scss">
.forbidden-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  background: var(--stars-page-gradient);
}

.forbidden-panel {
  width: min(100%, 440px);
  padding: 28px;
  border-left: 3px solid var(--stars-danger);
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.07);
}

.status-code {
  color: var(--stars-danger);
  font-size: 13px;
  font-weight: 700;
}

.forbidden-panel h1 {
  margin: 8px 0 0;
  color: var(--stars-text);
  font-size: 22px;
  letter-spacing: 0;
}

.forbidden-panel p {
  margin: 10px 0 24px;
  color: var(--stars-text-muted);
  font-size: 13px;
}

.forbidden-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
