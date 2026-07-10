<template>
  <div class="admin-shell" :class="{ 'sidebar-open': sidebarOpen }">
    <aside class="admin-sidebar">
      <div class="admin-brand">
        <span class="admin-brand-mark">SF</span>
        <span class="admin-brand-copy">
          <strong>Stars Flow</strong>
          <small>管理后台</small>
        </span>
      </div>

      <nav class="admin-nav" aria-label="管理后台导航">
        <router-link
          v-for="item in navigation"
          :key="item.key"
          :to="item.path"
          class="admin-nav-item"
          @click="sidebarOpen = false"
        >
          <component :is="item.icon" theme="outline" size="18" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>

    <button
      v-if="sidebarOpen"
      class="sidebar-backdrop"
      type="button"
      aria-label="关闭导航"
      @click="sidebarOpen = false"
    />

    <div class="admin-workspace">
      <header class="admin-topbar">
        <div class="topbar-leading">
          <t-tooltip content="打开导航">
            <t-button
              class="sidebar-toggle"
              variant="text"
              shape="square"
              aria-label="打开导航"
              @click="sidebarOpen = true"
            >
              <template #icon><i-hamburger-button theme="outline" size="20" /></template>
            </t-button>
          </t-tooltip>
          <span class="topbar-title">{{ route.meta.title }}</span>
        </div>

        <t-dropdown :options="userOptions" trigger="click" @click="handleUserCommand">
          <button class="user-trigger" type="button">
            <span class="user-avatar">{{ userInitial }}</span>
            <span class="user-summary">
              <strong>{{ session?.name }}</strong>
              <small>{{ roleLabel }}</small>
            </span>
            <i-down theme="outline" size="14" />
          </button>
        </t-dropdown>
      </header>

      <main class="admin-main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import type { DropdownOption } from "tdesign-vue-next";
import { getAdminNavigation } from "../navigation";
import { useAdminSessionStore } from "../session";
import type { AdminRole } from "../../shared/auth";

const route = useRoute();
const router = useRouter();
const sessionStore = useAdminSessionStore();
const { session } = storeToRefs(sessionStore);
const sidebarOpen = ref(false);

const registeredRouteNames = computed(() => new Set(
  router.getRoutes()
    .map((registeredRoute) => registeredRoute.name)
    .filter((routeName): routeName is string => typeof routeName === "string"),
));
const navigation = computed(() => getAdminNavigation(
  session.value?.role as AdminRole,
  registeredRouteNames.value,
));
const userInitial = computed(() => session.value?.name.trim().slice(0, 1).toUpperCase() || "管");
const roleLabel = computed(() => session.value?.role === "super_admin" ? "超级管理员" : "分组管理员");
const userOptions = [
  { content: "返回创作前台", value: "creator" },
  { content: "退出登录", value: "logout" },
];

async function handleUserCommand(option: DropdownOption) {
  const command = String(option.value ?? "");
  if (command === "creator") {
    window.location.assign("/");
    return;
  }
  if (command === "logout") {
    sessionStore.logout();
    await router.replace("/login");
  }
}
</script>

<style scoped lang="scss">
.admin-shell {
  display: grid;
  min-height: 100vh;
  grid-template-columns: 224px minmax(0, 1fr);
  background: var(--stars-page-bg);
}

.admin-sidebar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  height: 100vh;
  flex-direction: column;
  border-right: 1px solid var(--stars-border);
  background: #17211f;
  color: #f8fafc;
}

.admin-brand {
  display: flex;
  height: 56px;
  flex: 0 0 56px;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.admin-brand-mark {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid #5eead4;
  border-radius: 6px;
  color: #5eead4;
  font-size: 12px;
  font-weight: 700;
}

.admin-brand-copy {
  display: grid;
  line-height: 1.15;
}

.admin-brand-copy strong {
  font-size: 14px;
}

.admin-brand-copy small {
  margin-top: 3px;
  color: #9fb1ad;
  font-size: 11px;
}

.admin-nav {
  display: grid;
  align-content: start;
  gap: 2px;
  overflow-y: auto;
  padding: 10px 8px 18px;
}

.admin-nav-item {
  display: grid;
  min-height: 38px;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border-radius: 5px;
  color: #c6d1ce;
  font-size: 13px;
  text-decoration: none;
}

.admin-nav-item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #ffffff;
}

.admin-nav-item.router-link-exact-active {
  background: #0f766e;
  color: #ffffff;
}

.admin-workspace {
  min-width: 0;
}

.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  height: 56px;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--stars-border);
  background: rgba(255, 255, 255, 0.96);
}

.topbar-leading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.topbar-title {
  overflow: hidden;
  color: var(--stars-text);
  font-size: 15px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-toggle {
  display: none;
}

.user-trigger {
  display: flex;
  min-width: 0;
  height: 40px;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--stars-text);
  cursor: pointer;
}

.user-trigger:hover {
  background: var(--stars-surface-muted);
}

.user-avatar {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  border-radius: 50%;
  background: var(--stars-brand);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}

.user-summary {
  display: grid;
  max-width: 150px;
  text-align: left;
}

.user-summary strong,
.user-summary small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-summary strong {
  font-size: 12px;
}

.user-summary small {
  color: var(--stars-text-muted);
  font-size: 11px;
}

.admin-main {
  min-height: calc(100vh - 56px);
  padding: 20px;
}

.sidebar-backdrop {
  display: none;
}

@media (max-width: 900px) {
  .admin-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .admin-sidebar {
    position: fixed;
    left: 0;
    transform: translateX(-100%);
    transition: transform 160ms ease-out;
  }

  .sidebar-open .admin-sidebar {
    transform: translateX(0);
  }

  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 25;
    display: block;
    border: 0;
    background: rgba(17, 24, 39, 0.38);
  }

  .sidebar-toggle {
    display: inline-flex;
  }

  .admin-topbar {
    padding: 0 12px;
  }

  .admin-main {
    padding: 14px;
  }
}

@media (max-width: 560px) {
  .user-summary {
    display: none;
  }
}
</style>
