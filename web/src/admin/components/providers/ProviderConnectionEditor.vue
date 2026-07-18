<template>
  <section class="connection-panel">
    <div class="section-heading"><div><h3>凭据与连接</h3><p>密钥只写入服务端，不会在页面中回显。</p></div><span :class="['credential-state', provider.credential.configured ? 'configured' : 'empty']">{{ provider.credential.configured ? `已配置 ${provider.credential.preview || ''}` : '未配置' }}</span></div>
    <div class="connection-grid">
      <label>协议类型<select v-model="draft.protocolType" :disabled="!canUpdate" @change="$emit('dirty')"><option value="standard">标准请求</option><option value="poll">轮询任务</option><option value="webhook">Webhook</option><option value="runninghub">RunningHub</option><option value="legacy">Legacy Bridge</option></select></label>
      <label class="url-field">Base URL<input v-model="draft.baseUrl" data-testid="connection-base-url" :disabled="!canUpdate" placeholder="https://api.example.com/v1" @input="$emit('dirty')" /></label>
      <label class="check"><input v-model="draft.enabled" type="checkbox" :disabled="!canUpdate" @change="$emit('dirty')" /> 启用协议</label>
      <button v-if="canUpdate" class="secondary" type="button" :disabled="busy" @click="saveProtocol">保存连接配置</button>
    </div>
    <div class="credential-row">
      <label>新凭据<input v-model="credential" data-testid="credential-input" type="password" autocomplete="new-password" :disabled="!canUpdate" placeholder="输入新凭据进行替换" /></label>
      <button v-if="canUpdate" data-testid="credential-replace" class="primary" type="button" :disabled="busy || credential.trim().length < 8" @click="replace">替换凭据</button>
      <button v-if="canUpdate && provider.credential.configured" data-testid="credential-clear" class="danger" type="button" :disabled="busy" @click="clear">清除凭据</button>
    </div>
    <div class="probe-actions">
      <button v-if="canUpdate" data-testid="probe-draft" class="secondary" type="button" :disabled="busy || !draft.baseUrl.trim() || credential.trim().length < 8" @click="probeDraft">测试当前草稿</button>
      <button v-if="canUpdate" data-testid="probe-saved" class="secondary" type="button" :disabled="busy || !provider.credential.configured" @click="$emit('probe-saved')">测试已保存配置</button>
      <span v-if="probeResult">最近测试：{{ probeResult.status === 'available' ? '连接可用' : probeResult.status }}，{{ probeResult.latencyMs }} ms</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { RuntimeProbeResult, RuntimeProtocol, RuntimeProvider } from "../../api/adminApi";

const props = defineProps<{ provider: RuntimeProvider; protocol: RuntimeProtocol | null; canUpdate: boolean; busy: boolean; probeResult?: RuntimeProbeResult | null }>();
const emit = defineEmits<{
  dirty: [];
  "save-protocol": [value: { protocolType: RuntimeProtocol["protocolType"]; baseUrl: string; enabled: boolean }];
  "replace-credential": [credential: string];
  "clear-credential": [];
  "probe-draft": [value: { baseUrl: string; credential: string; protocolType: RuntimeProtocol["protocolType"] }];
  "probe-saved": [];
}>();
const credential = ref("");
const draft = reactive({ protocolType: "standard" as RuntimeProtocol["protocolType"], baseUrl: "", enabled: false });
function hydrate() { draft.protocolType = props.protocol?.protocolType ?? "standard"; draft.baseUrl = String(props.protocol?.config.baseUrl ?? ""); draft.enabled = props.protocol?.enabled ?? false; credential.value = ""; }
function replace() { const value = credential.value.trim(); if (value.length < 8) return; emit("replace-credential", value); credential.value = ""; }
function clear() { if (window.confirm("确定清除当前服务商凭据吗？")) emit("clear-credential"); }
function probeDraft() { emit("probe-draft", { baseUrl: draft.baseUrl.trim(), credential: credential.value.trim(), protocolType: draft.protocolType }); }
function saveProtocol() { emit("save-protocol", { protocolType: draft.protocolType, baseUrl: draft.baseUrl.trim(), enabled: draft.enabled }); }
watch(() => [props.provider.providerId, props.protocol?.revision] as const, hydrate, { immediate: true });
</script>

<style scoped>
.connection-panel{padding:20px 22px}.section-heading{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--stars-border)}h3{margin:0 0 4px;font-size:16px}p{margin:0;color:var(--stars-text-muted);font-size:12px}.credential-state{padding:5px 9px;border-radius:999px;background:#eef1f5;color:#667085;font-size:11px}.credential-state.configured{background:#e8efff;color:#1d4ed8}.connection-grid{display:grid;grid-template-columns:170px minmax(300px,1fr) auto auto;align-items:end;gap:12px;margin-top:16px}.credential-row{display:grid;grid-template-columns:minmax(320px,1fr) auto auto;align-items:end;gap:10px;margin-top:18px;padding-top:16px;border-top:1px solid var(--stars-border)}label{display:grid;gap:6px;font-size:12px}input,select{width:100%;box-sizing:border-box;border:1px solid #ccd5e2;border-radius:6px;background:#fff;padding:8px 9px;color:var(--stars-text);font:inherit}.check{display:flex;align-items:center;gap:7px;padding:8px 0;white-space:nowrap}.check input{width:auto}.primary,.secondary,.danger{height:34px;border-radius:6px;padding:0 13px;white-space:nowrap;cursor:pointer}.primary{border:1px solid #2563eb;background:#2563eb;color:#fff}.secondary{border:1px solid #ccd5e2;background:#fff;color:#344054}.danger{border:1px solid #d4dae3;background:#fff;color:#b42318}.primary:disabled,.secondary:disabled,.danger:disabled{cursor:not-allowed;opacity:.5}.probe-actions{display:flex;align-items:center;gap:8px;margin-top:12px}.probe-actions span{color:var(--stars-text-muted);font-size:11px}
</style>
