<script setup lang="ts">
import { Tag as TTag } from "tdesign-vue-next";

const appMarker = "StarsFlowAdminConsole";
const pageModuleMarker = "StarsFlowAdminPageModule";
</script>

<template>
  <div class="admin-shell" :data-app="appMarker" :data-module="pageModuleMarker">
    <header class="admin-header">
      <div class="admin-brand">
        <span class="admin-brand__mark" aria-hidden="true">SF</span>
        <div>
          <p>Stars Flow</p>
          <h1>管理后台</h1>
        </div>
      </div>
      <TTag theme="primary" variant="light">内部系统</TTag>
    </header>

    <main class="admin-main">
      <section class="admin-intro" aria-labelledby="admin-title">
        <p class="admin-intro__eyebrow">ADMIN CONSOLE</p>
        <h2 id="admin-title">管理控制台</h2>
        <p>请使用管理员账号访问 Stars Flow 管理功能。</p>
      </section>
    </main>
  </div>
</template>
