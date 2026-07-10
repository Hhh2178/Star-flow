<template>
  <section class="admin-page settings-page">
    <PageHeader title="Provider 与模型" description="供应商可用状态、配置完整性与模型清单">
      <template #actions><t-button variant="outline" :loading="refreshing" @click="load(true)"><template #icon><i-refresh theme="outline" /></template>刷新</t-button></template>
    </PageHeader>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="loadError" :message="loadError" retryable @retry="load()" />
    <template v-else>
      <p v-if="!overview.capabilities.update" class="readonly-note">当前账号仅可查看 Provider 与模型状态。</p>
      <p v-if="operationMessage" class="operation-message" :class="{ error: operationFailed }" role="status">{{ operationMessage }}</p>
      <section class="data-section" aria-labelledby="provider-title">
        <div class="section-heading"><h2 id="provider-title">供应商</h2><span>{{ overview.providers.length }} 个</span></div>
        <EmptyState v-if="overview.providers.length === 0" text="暂无 Provider" />
        <div v-else class="table-scroll">
          <table><thead><tr><th>Provider</th><th>配置</th><th>模型类型</th><th>模型</th><th>状态</th><th v-if="overview.capabilities.update">操作</th></tr></thead>
            <tbody><tr v-for="provider in overview.providers" :key="provider.id">
              <td><strong>{{ provider.name }}</strong><small>#{{ provider.id }}</small></td>
              <td><t-tag :theme="provider.configured ? 'success' : 'warning'" variant="light">{{ provider.configured ? "完整" : "待配置" }}</t-tag></td>
              <td><span class="tag-list"><t-tag v-for="item in provider.modelTypes" :key="item.type" variant="light">{{ typeLabel(item.type) }} {{ item.count }}</t-tag></span></td>
              <td><span class="model-list"><span v-for="model in provider.models" :key="`${model.type}:${model.name}`">{{ model.name }}<small>{{ typeLabel(model.type) }}</small></span></span></td>
              <td><t-switch v-if="overview.capabilities.update" :value="provider.enabled" :loading="savingId === provider.id" @change="(value: boolean) => changeEnabled(provider.id, value)" /><t-tag v-else :theme="provider.enabled ? 'success' : 'default'" variant="light">{{ provider.enabled ? "已启用" : "已停用" }}</t-tag></td>
              <td v-if="overview.capabilities.update"><t-button size="small" variant="outline" @click="openCredentials(provider)"><template #icon><i-key theme="outline" /></template>配置凭据</t-button></td>
            </tr></tbody>
          </table>
        </div>
      </section>
    </template>
    <t-dialog v-model:visible="credentialVisible" :header="`${credentialProvider?.name || ''} 凭据`" :footer="false" :close-on-overlay-click="false"><div class="credential-form"><label v-for="input in credentialProvider?.inputs || []" :key="input.key"><span>{{ input.label }}<small>{{ input.required ? "必填" : "选填" }} · {{ input.configured ? "已配置" : "未配置" }}</small></span><t-input v-model="credentialValues[input.key]" :type="input.type === 'password' ? 'password' : 'text'" :placeholder="input.configured ? '输入新值以替换' : '输入配置值'" /></label><p v-if="credentialError" class="field-error" role="alert">{{ credentialError }}</p><div class="dialog-actions"><t-button variant="outline" @click="credentialVisible=false">取消</t-button><t-button :loading="savingCredentials" @click="saveCredentials">保存</t-button></div></div></t-dialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import ErrorState from "../components/ErrorState.vue";
import { adminErrorText, getProviderOverview, updateProvider, type ProviderOverview } from "../api/adminApi";

const emptyOverview = (): ProviderOverview => ({ providers: [], capabilities: { read: true, update: false } });
const overview = ref(emptyOverview());
const loading = ref(true); const refreshing = ref(false); const loadError = ref("");
const savingId = ref(""); const operationMessage = ref(""); const operationFailed = ref(false);
type Provider = ProviderOverview["providers"][number];
const credentialVisible=ref(false);const credentialProvider=ref<Provider|null>(null);const credentialValues=reactive<Record<string,string>>({});const credentialError=ref("");const savingCredentials=ref(false);
const labels: Record<string, string> = { text: "文本", image: "图片", video: "视频" };
const typeLabel = (type: string) => labels[type] || type;

async function load(silent = false) {
  if (silent) refreshing.value = true; else loading.value = true;
  loadError.value = "";
  try { overview.value = await getProviderOverview(); }
  catch (cause) { loadError.value = adminErrorText(cause, "Provider 状态加载失败"); }
  finally { loading.value = false; refreshing.value = false; }
}
async function changeEnabled(id: string, enabled: boolean) {
  savingId.value = id; operationMessage.value = ""; operationFailed.value = false;
  try { await updateProvider({ id, enabled }); await load(true); operationMessage.value = enabled ? "Provider 已启用" : "Provider 已停用"; }
  catch (cause) { operationFailed.value = true; operationMessage.value = adminErrorText(cause, "Provider 状态更新失败"); }
  finally { savingId.value = ""; }
}
function openCredentials(provider:Provider){credentialProvider.value=provider;credentialError.value="";for(const key of Object.keys(credentialValues))delete credentialValues[key];for(const input of provider.inputs)credentialValues[input.key]="";credentialVisible.value=true}
async function saveCredentials(){if(!credentialProvider.value)return;const inputValues=Object.fromEntries(Object.entries(credentialValues).map(([key,value])=>[key,value.trim()]).filter(([,value])=>value));if(Object.keys(inputValues).length===0){credentialError.value="请至少填写一个需要更新的字段";return}savingCredentials.value=true;credentialError.value="";try{await updateProvider({id:credentialProvider.value.id,inputValues});credentialVisible.value=false;await load(true);operationFailed.value=false;operationMessage.value="Provider 凭据已更新"}catch(cause){credentialError.value=adminErrorText(cause,"Provider 凭据更新失败")}finally{savingCredentials.value=false}}
onMounted(() => load());
</script>

<style scoped lang="scss">
.admin-page{width:min(100%,1200px);margin:0 auto}.readonly-note,.operation-message{margin:0 0 12px;padding:9px 12px;border-left:3px solid var(--stars-brand);background:#fff;color:var(--stars-text-muted);font-size:12px}.operation-message.error{border-color:#dc2626;color:#b91c1c}.data-section{border:1px solid var(--stars-border);border-radius:6px;background:#fff}.section-heading{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--stars-border)}.section-heading h2{margin:0;font-size:14px}.section-heading span{color:var(--stars-text-muted);font-size:12px}.table-scroll{overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:11px 14px;border-bottom:1px solid var(--stars-border);text-align:left;vertical-align:top}th{color:var(--stars-text-muted);font-weight:500}td strong,td>small{display:block}td>small,.model-list small{margin-top:3px;color:var(--stars-text-muted)}.tag-list{display:flex;gap:5px;flex-wrap:wrap}.model-list{display:grid;gap:5px;min-width:180px}.model-list span{display:flex;justify-content:space-between;gap:12px}.model-list small{margin:0}.credential-form{display:grid;gap:12px}.credential-form label{display:grid;gap:6px}.credential-form label>span{display:flex;justify-content:space-between;font-size:12px}.credential-form small{color:var(--stars-text-muted)}.field-error{margin:0;color:#b91c1c;font-size:12px}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:6px}@media(max-width:640px){th,td{padding:9px 10px}}
</style>
