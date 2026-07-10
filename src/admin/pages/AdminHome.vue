<template>
  <section class="admin-page">
    <header class="page-header">
      <div>
        <h1>总览</h1>
        <p>{{ scopeLabel }}</p>
      </div>
      <t-tag theme="success" variant="light">{{ roleLabel }}</t-tag>
    </header>

    <section class="session-strip" aria-label="当前会话">
      <div>
        <span>当前账号</span>
        <strong>{{ session?.name }}</strong>
      </div>
      <div>
        <span>角色</span>
        <strong>{{ roleLabel }}</strong>
      </div>
      <div>
        <span>所属分组</span>
        <strong>{{ session?.groupName || "全平台" }}</strong>
      </div>
      <div>
        <span>账号 ID</span>
        <strong>{{ session?.id }}</strong>
      </div>
    </section>

    <section class="operation-section">
      <h2>运营入口</h2>
      <div class="operation-list">
        <router-link
          v-for="item in operationEntries"
          :key="item.key"
          :to="item.path"
          class="operation-row"
        >
          <component :is="item.icon" theme="outline" size="19" />
          <span>{{ item.label }}</span>
          <i-right theme="outline" size="15" />
        </router-link>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { getAdminNavigation } from "../navigation";
import { useAdminSessionStore } from "../session";
import type { AdminRole } from "../../shared/auth";

const sessionStore = useAdminSessionStore();
const { session } = storeToRefs(sessionStore);
const roleLabel = computed(() => session.value?.role === "super_admin" ? "超级管理员" : "分组管理员");
const scopeLabel = computed(() => session.value?.role === "super_admin"
  ? "全平台运营工作台"
  : `${session.value?.groupName || "当前分组"}运营工作台`);
const operationEntries = computed(() => getAdminNavigation(session.value?.role as AdminRole)
  .filter((item) => item.key !== "overview" && item.key !== "profile"));
</script>

<style scoped lang="scss">
.admin-page {
  width: min(100%, 1120px);
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.page-header h1 {
  margin: 0;
  color: var(--stars-text);
  font-size: 20px;
  letter-spacing: 0;
}

.page-header p {
  margin: 5px 0 0;
  color: var(--stars-text-muted);
  font-size: 13px;
}

.session-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid var(--stars-border);
  border-radius: 6px;
  background: #ffffff;
}

.session-strip div {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 14px 16px;
  border-right: 1px solid var(--stars-border);
}

.session-strip div:last-child {
  border-right: 0;
}

.session-strip span {
  color: var(--stars-text-muted);
  font-size: 12px;
}

.session-strip strong {
  overflow: hidden;
  color: var(--stars-text);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operation-section {
  margin-top: 24px;
}

.operation-section h2 {
  margin: 0 0 10px;
  color: var(--stars-text);
  font-size: 15px;
}

.operation-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid var(--stars-border);
  border-radius: 6px;
  background: #ffffff;
}

.operation-row {
  display: grid;
  min-height: 48px;
  grid-template-columns: 24px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border-right: 1px solid var(--stars-border);
  border-bottom: 1px solid var(--stars-border);
  color: var(--stars-text);
  font-size: 13px;
  text-decoration: none;
}

.operation-row:nth-child(2n) {
  border-right: 0;
}

.operation-row:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.operation-row:hover {
  background: var(--stars-surface-hover);
  color: var(--stars-brand);
}

@media (max-width: 760px) {
  .session-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .session-strip div:nth-child(2) {
    border-right: 0;
  }

  .session-strip div:nth-child(-n + 2) {
    border-bottom: 1px solid var(--stars-border);
  }

  .operation-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .operation-row {
    border-right: 0;
  }

  .operation-row:nth-last-child(2) {
    border-bottom: 1px solid var(--stars-border);
  }
}
</style>
