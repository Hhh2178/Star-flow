<template>
  <section class="overview-panel">
    <div class="facts">
      <div><label>服务商标识</label><strong>{{ provider.providerId }}</strong><small>稳定标识，不可修改</small></div>
      <div><label>适配器</label><strong>{{ provider.adapterId }}</strong><small>当前运行时入口</small></div>
      <div><label>默认协议</label><strong>{{ provider.protocolType || "未配置" }}</strong><small>{{ provider.protocolEnabled ? "已启用" : "未启用" }}</small></div>
      <div><label>模型数量</label><strong>{{ provider.modelCount }}</strong><small>仅统计当前服务商</small></div>
    </div>
    <div class="editor-grid">
      <label>显示名称<input v-model="draft.displayName" :disabled="!canUpdate" @input="changed" /></label>
      <label>迁移状态
        <select v-model="draft.migrationState" :disabled="!canUpdate" @change="changed">
          <option value="legacy">Legacy</option><option value="shadow">影子验证</option><option value="native">原生运行时</option>
        </select>
      </label>
      <label class="note-field">备注<textarea v-model="draft.note" rows="3" maxlength="2000" :disabled="!canUpdate" @input="changed" /></label>
      <label class="check"><input v-model="draft.enabled" type="checkbox" :disabled="!canUpdate" @change="changed" /> 启用服务商</label>
      <div v-if="canUpdate" class="actions">
        <button data-testid="provider-delete" class="danger" type="button" @click="$emit('delete')">删除</button>
        <button data-testid="provider-save" class="primary" type="button" :disabled="saving" @click="save">保存概览</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";
import type { RuntimeProvider } from "../../api/adminApi";

const props = defineProps<{ provider: RuntimeProvider; canUpdate: boolean; saving: boolean }>();
const emit = defineEmits<{
  dirty: [];
  save: [patch: Pick<RuntimeProvider, "displayName" | "migrationState" | "enabled" | "note">];
  delete: [];
}>();
const draft = reactive({ displayName: "", migrationState: "legacy" as RuntimeProvider["migrationState"], enabled: false, note: "" });
function hydrate() { Object.assign(draft, { displayName: props.provider.displayName, migrationState: props.provider.migrationState, enabled: props.provider.enabled, note: props.provider.note }); }
function changed() { emit("dirty"); }
function save() { emit("save", { ...draft }); }
watch(() => props.provider, hydrate, { immediate: true });
</script>

<style scoped>
.overview-panel{padding:20px 22px}.facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--stars-border);border-radius:7px;overflow:hidden}.facts>div{display:grid;gap:5px;padding:14px;border-right:1px solid var(--stars-border)}.facts>div:last-child{border-right:0}.facts label{color:var(--stars-text-muted);font-size:11px}.facts strong{font-size:15px}.facts small{color:var(--stars-text-muted)}.editor-grid{display:grid;grid-template-columns:2fr 1fr auto;align-items:end;gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid var(--stars-border)}label{display:grid;gap:6px;font-size:12px}input,select,textarea{width:100%;box-sizing:border-box;border:1px solid #ccd5e2;border-radius:6px;background:#fff;padding:8px 9px;color:var(--stars-text);font:inherit}.note-field{grid-column:1/3}.check{display:flex;align-items:center;gap:7px;padding:8px 0}.check input{width:auto}.actions{display:flex;justify-content:flex-end;gap:8px}.primary,.danger{border-radius:6px;padding:8px 14px;cursor:pointer}.primary{border:1px solid #2563eb;background:#2563eb;color:#fff}.danger{border:1px solid #d4dae3;background:#fff;color:#b42318}.primary:disabled{opacity:.5}
</style>
