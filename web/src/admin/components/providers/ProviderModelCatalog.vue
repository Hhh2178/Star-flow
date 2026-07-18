<template>
  <section class="catalog-panel">
    <div class="catalog-toolbar">
      <input v-model="query" placeholder="搜索模型" @keyup.enter="$emit('filter', { query, capability })" />
      <select v-model="capability" @change="$emit('filter', { query, capability })"><option value="">全部能力</option><option value="text">文本</option><option value="image">图片</option><option value="video">视频</option><option value="audio">音频</option><option value="json">JSON</option></select>
      <span>{{ models.total }} 个模型</span>
      <button v-if="canUpdate" data-testid="model-fetch" class="secondary" type="button" :disabled="busy" @click="$emit('fetch-models')">拉取模型</button>
      <button v-if="canUpdate" data-testid="model-create" class="primary" type="button" :disabled="busy" @click="$emit('create')">新增模型</button>
    </div>
    <div class="table-scroll"><table><thead><tr><th>模型</th><th>能力</th><th>执行方式</th><th>状态</th><th>版本</th><th>操作</th></tr></thead><tbody>
      <tr v-for="model in models.items" :key="model.modelId"><td><strong>{{ model.displayName }}</strong><small>{{ model.modelId }}</small></td><td>{{ capabilityLabel(model.capability) }}</td><td>{{ executionLabel(model.executionMode) }}</td><td><span :class="['status', model.enabled ? 'on' : 'off']">{{ model.enabled ? '启用' : '停用' }}</span></td><td>rev {{ model.revision }}</td><td><template v-if="canUpdate"><button data-testid="model-edit" class="text-action" @click="$emit('edit', model)">编辑</button><button class="text-action danger-text" @click="$emit('delete', model)">删除</button></template><span v-else>只读</span></td></tr>
      <tr v-if="models.items.length === 0"><td colspan="6" class="empty">暂无模型</td></tr>
    </tbody></table></div>
    <div class="pager"><button :disabled="models.page <= 1" @click="$emit('page', models.page - 1)">上一页</button><span>第 {{ models.page }} / {{ totalPages }} 页</span><button :disabled="models.page >= totalPages" @click="$emit('page', models.page + 1)">下一页</button></div>

    <div v-if="candidates.length" class="candidate-dialog" role="dialog" aria-label="上游模型候选">
      <div class="candidate-header"><div><h3>选择导入模型</h3><p>拉取结果不会自动写入，已有模型不可重复选择。</p></div><strong>{{ selected.size }} 已选择</strong></div>
      <div class="candidate-list">
        <label v-for="candidate in candidates" :key="candidate.modelId" class="candidate-row">
          <input :data-testid="`candidate-${candidate.modelId}`" type="checkbox" :checked="selected.has(candidate.modelId)" :disabled="candidate.exists" @change="toggle(candidate.modelId, ($event.target as HTMLInputElement).checked)" />
          <span><b>{{ candidate.displayName }}</b><small>{{ candidate.modelId }}</small></span>
          <select v-model="capabilityById[candidate.modelId]" :disabled="candidate.exists"><option value="text">文本</option><option value="image">图片</option><option value="video">视频</option><option value="audio">音频</option><option value="json">JSON</option></select>
          <em>{{ candidate.exists ? '已存在' : '可导入' }}</em>
        </label>
      </div>
      <div class="candidate-actions"><button data-testid="model-import" class="primary" type="button" :disabled="busy || selected.size === 0" @click="submitImport">导入所选模型</button></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { DiscoveredRuntimeModel, ImportRuntimeModel, RuntimeModel, RuntimeModelCapability, RuntimeModelList } from "../../api/adminApi";

const props = defineProps<{ models: RuntimeModelList; candidates: DiscoveredRuntimeModel[]; canUpdate: boolean; busy: boolean }>();
const emit = defineEmits<{ filter: [value: { query: string; capability: string }]; page: [page: number]; create: []; edit: [model: RuntimeModel]; delete: [model: RuntimeModel]; "fetch-models": []; "import-models": [models: ImportRuntimeModel[]] }>();
const query = ref(""), capability = ref("");
const selected = reactive(new Set<string>());
const capabilityById = reactive<Record<string, RuntimeModelCapability>>({});
const totalPages = computed(() => Math.max(1, Math.ceil(props.models.total / props.models.pageSize)));
const capabilityLabel = (value: string) => ({ text: "文本", image: "图片", video: "视频", audio: "音频", json: "JSON" }[value] ?? value);
const executionLabel = (value: string) => ({ sync: "同步", background_poll: "后台轮询", webhook: "Webhook", runninghub: "RunningHub", legacy: "Legacy Bridge" }[value] ?? value);
function hydrateCandidates() { selected.clear(); for (const candidate of props.candidates) capabilityById[candidate.modelId] = candidate.suggestedCapability; }
function toggle(modelId: string, checked: boolean) { checked ? selected.add(modelId) : selected.delete(modelId); }
function submitImport() { emit("import-models", props.candidates.filter((item) => selected.has(item.modelId) && !item.exists).map((item) => ({ modelId: item.modelId, displayName: item.displayName, capability: capabilityById[item.modelId] }))); }
watch(() => props.candidates, hydrateCandidates, { immediate: true });
</script>

<style scoped>
.catalog-panel{padding:20px 22px}.catalog-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) 150px auto auto auto;align-items:center;gap:8px;margin-bottom:12px}.catalog-toolbar>span{color:var(--stars-text-muted);font-size:12px;text-align:right}input,select{box-sizing:border-box;border:1px solid #ccd5e2;border-radius:6px;background:#fff;padding:8px 9px;color:var(--stars-text);font:inherit}.primary,.secondary{height:34px;border-radius:6px;padding:0 13px;white-space:nowrap;cursor:pointer}.primary{border:1px solid #2563eb;background:#2563eb;color:#fff}.secondary{border:1px solid #ccd5e2;background:#fff;color:#344054}.table-scroll{overflow:auto;border:1px solid var(--stars-border);border-radius:7px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:10px 12px;border-bottom:1px solid var(--stars-border);text-align:left}th{background:#f4f7fb;color:var(--stars-text-muted);font-weight:500}td strong,td small{display:block}td small{margin-top:3px;color:var(--stars-text-muted)}.status{display:inline-flex;padding:3px 7px;border-radius:999px;background:#f1f2f4;color:#818793;font-size:10px}.status.on{background:#e8efff;color:#1d4ed8}.text-action{border:0;background:transparent;color:#2563eb;cursor:pointer}.danger-text{color:#b42318}.empty{padding:28px;color:var(--stars-text-muted);text-align:center}.pager{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:12px}.pager button{padding:7px 11px;border:1px solid var(--stars-border);border-radius:6px;background:#fff}.candidate-dialog{margin-top:16px;border:1px solid #bdcbe0;border-radius:7px;background:#fff;box-shadow:0 12px 28px rgb(26 48 82 / .12)}.candidate-header{display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--stars-border)}.candidate-header h3{margin:0 0 3px;font-size:15px}.candidate-header p{margin:0;color:var(--stars-text-muted);font-size:11px}.candidate-header strong{color:#1d4ed8;font-size:12px}.candidate-list{max-height:320px;overflow:auto}.candidate-row{display:grid;grid-template-columns:auto minmax(0,1fr) 130px 58px;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid #edf0f4}.candidate-row>input{width:auto}.candidate-row span b,.candidate-row span small{display:block}.candidate-row span small{color:var(--stars-text-muted)}.candidate-row em{color:var(--stars-text-muted);font-size:11px;font-style:normal}.candidate-actions{display:flex;justify-content:flex-end;padding:12px 16px}
</style>
