<template>
  <t-dialog :header="$t('settings.title')" :footer="false" placement="center" width="1200px" v-model:visible="showSetting">
    <div class="settingPanel">
      <t-menu class="settingMenu" v-model:value="activeMenu" :style="{ height: '70vh' }">
        <t-menu-item v-for="item in visibleMenuItems" :key="item.key" :value="item.key">
          <template #icon>
            <t-badge :count="needUpdate && item.key === 'about' ? 1 : 0" dot>
              <component :is="item.icon" class="icon" />
            </t-badge>
          </template>
          {{ $t(item.label) }}
        </t-menu-item>
      </t-menu>
      <div class="settingRight">
        <div class="sectionTitle">{{ currentMenuItem ? $t(currentMenuItem.label) : "" }}</div>
        <div class="settingContent">
          <uiConfig v-if="activeMenu === 'ui'" />
          <languageConfig v-if="activeMenu === 'language'" />
          <vendorConfig v-if="activeMenu === 'vendorConfig'" />
          <requestConfig v-if="activeMenu === 'requestConfig'" />
          <loginConfig v-if="activeMenu === 'loginConfig'" />
          <userManagement v-if="activeMenu === 'userManagement'" />
          <agentConfog v-if="activeMenu === 'agentConfog'" />
          <promptManage v-if="activeMenu === 'promptManage'" />
          <otherConfig v-if="activeMenu === 'otherConfig'" />
          <dbConfig v-if="activeMenu === 'dbConfig'" />
          <about v-if="activeMenu === 'about'" />
          <logoutConfig v-if="activeMenu === 'logoutConfig'" />
          <memoryConfig v-if="activeMenu === 'memoryConfig'" />
          <fileManagement v-if="activeMenu === 'fileManagement'" />
          <skillManagement v-if="activeMenu === 'skillManagement'" />
          <devConfig v-if="activeMenu === 'devConfig'" />
          <modelMap v-if="activeMenu === 'modelMap'" />
        </div>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import settingStore from "@/stores/setting";
const { showSetting, activeMenu, needUpdate } = storeToRefs(settingStore());
import userStore from "@/stores/user";
import { getVisibleSettingMenuItems } from "./permissions";

const currentUserStore = userStore();
const { currentUser } = storeToRefs(currentUserStore);

import uiConfig from "./components/uiConfig.vue";
import languageConfig from "./components/languageConfig.vue";
import requestConfig from "./components/requestConfig.vue";
import loginConfig from "./components/loginConfig.vue";
import agentConfog from "./components/agentConfog.vue";
import dbConfig from "./components/dbConfig.vue";
import otherConfig from "./components/otherConfig.vue";
import about from "./components/about.vue";
import logoutConfig from "./components/logoutConfig.vue";
import vendorConfig from "./components/vendorConfig.vue";
import memoryConfig from "./components/memoryConfig.vue";
import fileManagement from "./components/fileManagement.vue";
import skillManagement from "./components/skillManagement.vue";
import devConfig from "./components/devConfig.vue";
import promptManage from "./components/promptManage.vue";
import modelMap from "./components/modelMap.vue";
import userManagement from "./components/userManagement.vue";

const visibleMenuItems = computed(() => getVisibleSettingMenuItems(currentUser.value?.role));

function ensureActiveMenu() {
  if (!visibleMenuItems.value.some((item) => item.key === activeMenu.value)) {
    activeMenu.value = visibleMenuItems.value[0]?.key || "ui";
  }
}

const currentMenuItem = computed(() => visibleMenuItems.value.find((item) => item.key === activeMenu.value));

watch(
  showSetting,
  async (visible) => {
    if (!visible) return;
    try {
      await currentUserStore.fetchCurrentUser();
    } catch {
      window.$message.error($t("settings.login.msg.fetchFailed"));
    }
    ensureActiveMenu();
  },
  { immediate: true },
);

watch(currentUser, ensureActiveMenu);
</script>

<style lang="scss" scoped>
.settingPanel {
  display: flex;
  height: 70vh;
  overflow: hidden;

  .settingMenu {
    width: 200px;
    min-width: 200px;
    border-right: 1px solid var(--td-component-border);
    flex-shrink: 0;
    .icon {
      font-size: 20px;
      margin-right: 8px;
    }
  }

  .settingRight {
    flex: 1;
    padding-left: 16px;
    padding-right: 16px;
    height: 70vh;
    overflow-y: auto;

    .sectionTitle {
      font-size: 16px;
      font-weight: 600;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--td-component-border);
      margin-bottom: 1vh;
      height: 4vh;
    }

    .settingContent {
      width: 100%;
      height: calc(70vh - 5vh - 4px);
    }
  }
}
:deep(.t-menu) {
  padding: 0;
  padding-right: 8px;
}
:deep(.t-is-active) {
  .t-badge {
    color: var(--td-brand-color) !important;
  }
}
</style>
