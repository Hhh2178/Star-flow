<template>
  <section class="history-panel">
    <div class="table-scroll"><table><thead><tr><th>时间</th><th>类型</th><th>模型</th><th>状态</th><th>耗时</th><th>错误码</th></tr></thead><tbody>
      <tr v-for="item in history" :key="item.id"><td>{{ formatTime(item.createdAt) }}</td><td>{{ item.testType === "connection" ? "连接测试" : "生成测试" }}</td><td>{{ item.modelId || "无" }}</td><td>{{ item.status }}</td><td>{{ item.durationMs == null ? "无" : `${item.durationMs} ms` }}</td><td>{{ item.errorCode || "无" }}</td></tr>
      <tr v-if="history.length === 0"><td colspan="6" class="empty">暂无测试记录</td></tr>
    </tbody></table></div>
  </section>
</template>

<script setup lang="ts">
import type { RuntimeTestRun } from "../../api/adminApi";
defineProps<{ history: RuntimeTestRun[] }>();
const formatTime = (value: number) => new Date(value < 1e12 ? value * 1000 : value).toLocaleString("zh-CN", { hour12: false });
</script>

<style scoped>
.history-panel{padding:20px 22px}.table-scroll{overflow:auto;border:1px solid var(--stars-border);border-radius:7px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:10px 12px;border-bottom:1px solid var(--stars-border);text-align:left}th{background:#f4f7fb;color:var(--stars-text-muted);font-weight:500}.empty{padding:28px;color:var(--stars-text-muted);text-align:center}
</style>
