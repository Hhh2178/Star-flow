<template><span class="status-text" :class="`status-${status}`" :data-status="status">{{ label }}</span></template>

<script setup lang="ts">
import { computed } from "vue";
import type { GenerationJobStatus } from "../api/adminApi";

const props = defineProps<{ status: GenerationJobStatus }>();
const labels: Record<GenerationJobStatus, string> = {
  queued: "排队中",
  running: "执行中",
  recovering: "恢复中",
  needs_attention: "需要处理",
  succeeded: "已完成",
  failed: "失败",
  cancelled: "已取消",
};
const label = computed(() => labels[props.status]);
</script>

<style scoped>
.status-text { font-size: 12px; font-weight: 600; white-space: nowrap; }
.status-queued, .status-recovering { color: #8a5a00; }
.status-running { color: #0f766e; }
.status-needs_attention, .status-failed { color: #b42318; }
.status-succeeded { color: #237804; }
.status-cancelled { color: #667085; }
</style>
