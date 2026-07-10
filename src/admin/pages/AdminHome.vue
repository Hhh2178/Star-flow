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
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useAdminSessionStore } from "../session";

const sessionStore = useAdminSessionStore();
const { session } = storeToRefs(sessionStore);
const roleLabel = computed(() => session.value?.role === "super_admin" ? "超级管理员" : "分组管理员");
const scopeLabel = computed(() => session.value?.role === "super_admin"
  ? "全平台运营工作台"
  : `${session.value?.groupName || "当前分组"}运营工作台`);
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
}
</style>
