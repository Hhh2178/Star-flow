<template>
  <aside data-testid="provider-rail" class="provider-rail">
    <div class="rail-tools">
      <input v-model="query" aria-label="搜索服务商" placeholder="搜索名称或标识" />
      <select v-model="filter" aria-label="筛选服务商">
        <option value="all">全部状态</option>
        <option value="enabled">已启用</option>
        <option value="disabled">已停用</option>
      </select>
      <button v-if="canUpdate" data-testid="provider-create" class="create-button" type="button" @click="$emit('create')">新增服务商</button>
    </div>
    <div class="rail-summary"><span>服务商</span><strong>{{ filtered.length }}/{{ providers.length }}</strong></div>
    <button
      v-for="provider in filtered"
      :key="provider.providerId"
      data-testid="provider-rail-item"
      class="rail-item"
      :class="{ active: provider.providerId === selectedId }"
      type="button"
      @click="$emit('select', provider.providerId)"
    >
      <span class="rail-name">{{ visibleProviderName(provider) }}</span>
      <span class="state-mark" :class="{ on: provider.enabled }" :aria-label="provider.enabled ? '已启用' : '已停用'" />
      <small>{{ visibleProviderId(provider.providerId) }}</small>
      <span class="rail-meta"><b>{{ migrationLabel(provider.migrationState) }}</b>{{ provider.modelCount }} 个模型</span>
    </button>
    <div v-if="filtered.length === 0" class="rail-empty">没有匹配的服务商</div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { RuntimeMigrationState, RuntimeProvider } from "../../api/adminApi";
import { visibleProviderId, visibleProviderName } from "../../utils/providerPresentation";

const props = defineProps<{ providers: RuntimeProvider[]; selectedId: string; canUpdate: boolean }>();
defineEmits<{ select: [providerId: string]; create: [] }>();

const query = ref("");
const filter = ref<"all" | "enabled" | "disabled">("all");
const filtered = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return props.providers.filter((provider) => {
    const stateMatches = filter.value === "all" || (filter.value === "enabled" ? provider.enabled : !provider.enabled);
    const searchable = `${visibleProviderName(provider)} ${visibleProviderId(provider.providerId)}`.toLowerCase();
    return stateMatches && (!keyword || searchable.includes(keyword));
  });
});
const migrationLabel = (value: RuntimeMigrationState) => ({ legacy: "Legacy", shadow: "影子验证", native: "原生运行时" }[value]);
</script>

<style scoped>
.provider-rail{overflow-y:auto;border-right:1px solid var(--stars-border);background:#f4f7fb}.rail-tools{position:sticky;top:0;z-index:2;display:grid;gap:8px;padding:12px;background:#f4f7fb;border-bottom:1px solid var(--stars-border)}input,select{width:100%;box-sizing:border-box;border:1px solid #ccd5e2;border-radius:6px;background:#fff;padding:8px 9px;color:var(--stars-text);font:inherit}.create-button{border:1px solid #2563eb;border-radius:6px;background:#2563eb;padding:8px 12px;color:#fff;font-weight:600;cursor:pointer}.rail-summary{display:flex;justify-content:space-between;padding:10px 12px 6px;color:var(--stars-text-muted);font-size:11px}.rail-item{display:grid;grid-template-columns:minmax(0,1fr) auto;width:100%;padding:10px 12px;border:0;border-left:3px solid transparent;border-bottom:1px solid #e1e7ef;background:transparent;text-align:left;cursor:pointer;transition:background-color .16s ease,border-color .16s ease}.rail-item:hover{background:#fff}.rail-item.active{border-left-color:#2563eb;background:#fff}.rail-name{overflow:hidden;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.rail-item small{margin-top:3px;color:var(--stars-text-muted);overflow:hidden;text-overflow:ellipsis}.state-mark{width:8px;height:8px;margin-top:5px;border-radius:50%;background:#aeb7c4}.state-mark.on{background:#2563eb}.rail-meta{display:flex;justify-content:space-between;margin-top:6px;color:var(--stars-text-muted);font-size:10px}.rail-meta b{font-weight:500;color:#536174}.rail-empty{padding:24px;color:var(--stars-text-muted);text-align:center}@media(prefers-reduced-motion:reduce){.rail-item{transition:none}}
</style>
