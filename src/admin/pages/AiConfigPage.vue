<template>
  <section class="admin-page settings-page">
    <PageHeader title="AI 全局配置" description="Agent 运行模式与模型部署">
      <template #actions><t-button variant="outline" :loading="refreshing" @click="load(true)"><template #icon><i-refresh theme="outline" /></template>刷新</t-button></template>
    </PageHeader>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="loadError" :message="loadError" retryable @retry="load()" />
    <template v-else>
      <section class="mode-strip"><div><span>运行模式</span><strong>{{ overview.useMode === "1" ? "高级配置" : "普通配置" }}</strong></div><t-segmented-control v-if="overview.capabilities.update" :value="overview.useMode" :options="modeOptions" :disabled="savingMode" @change="changeMode" /></section>
      <p v-if="!overview.capabilities.update" class="readonly-note">当前账号仅可查看 AI 全局配置。</p>
      <p v-if="operationMessage" class="operation-message" :class="{ error: operationFailed }" role="status">{{ operationMessage }}</p>
      <section class="data-section"><div class="section-heading"><h2>Agent 部署</h2><span>{{ overview.deployments.length }} 项</span></div>
        <EmptyState v-if="overview.deployments.length === 0" text="暂无 Agent 部署" />
        <div v-else class="deployment-list"><article v-for="item in overview.deployments" :key="item.id" class="deployment-row">
          <div><strong>{{ item.name }}</strong><small>{{ item.description || `#${item.id}` }}</small></div><div><span>Provider</span><strong>{{ item.vendorId || "-" }}</strong></div><div><span>模型</span><strong>{{ item.model || item.modelName || "未配置" }}</strong></div><div><span>温度 / Tokens</span><strong>{{ item.temperature ?? "-" }} / {{ item.maxOutputTokens === 0 ? "自动" : item.maxOutputTokens ?? "-" }}</strong></div><t-tag :theme="item.disabled ? 'default' : item.configured ? 'success' : 'warning'" variant="light">{{ item.disabled ? "已停用" : item.configured ? "可用" : "待配置" }}</t-tag><t-button v-if="overview.capabilities.update" size="small" variant="outline" @click="openEdit(item)"><template #icon><i-edit theme="outline" /></template>编辑</t-button>
        </article></div>
      </section>
    </template>
    <t-dialog v-model:visible="editVisible" header="编辑 Agent 部署" :footer="false" :close-on-overlay-click="false"><div v-if="editForm" class="dialog-form"><label><span>Provider ID</span><t-input v-model="editForm.vendorId" /></label><label><span>模型名称</span><t-input v-model="editForm.model" /></label><label><span>模型标识</span><t-input v-model="editForm.modelName" /></label><label><span>温度</span><t-input-number v-model="editForm.temperature" :min="0" :max="2" :step="0.1" /></label><label><span>最大输出 Tokens</span><t-input-number v-model="editForm.maxOutputTokens" :min="0" /></label><label class="switch-label"><span>停用</span><t-switch v-model="editForm.disabled" /></label><div class="dialog-actions"><t-button variant="outline" @click="editVisible=false">取消</t-button><t-button :loading="savingDeployment" @click="saveDeployment">保存</t-button></div></div></t-dialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import PageHeader from "../components/PageHeader.vue"; import LoadingState from "../components/LoadingState.vue"; import EmptyState from "../components/EmptyState.vue"; import ErrorState from "../components/ErrorState.vue";
import { adminErrorText, getAiConfigOverview, updateAiDeployment, updateAiUseMode, type AiConfigOverview } from "../api/adminApi";
type Deployment = AiConfigOverview["deployments"][number];
type DeploymentForm = Omit<Deployment,"vendorId"|"model"|"modelName"|"temperature"|"maxOutputTokens"> & {vendorId:string;model:string;modelName:string;temperature:number;maxOutputTokens:number};
const overview=ref<AiConfigOverview>({useMode:"0",deployments:[],capabilities:{read:true,update:false}}); const loading=ref(true); const refreshing=ref(false); const loadError=ref(""); const savingMode=ref(false); const operationMessage=ref(""); const operationFailed=ref(false); const editVisible=ref(false); const savingDeployment=ref(false); const editForm=ref<DeploymentForm|null>(null);
const modeOptions=[{label:"普通配置",value:"0"},{label:"高级配置",value:"1"}];
async function load(silent=false){if(silent)refreshing.value=true;else loading.value=true;loadError.value="";try{overview.value=await getAiConfigOverview()}catch(cause){loadError.value=adminErrorText(cause,"AI 配置加载失败")}finally{loading.value=false;refreshing.value=false}}
async function changeMode(value:string|number){const mode=String(value) as "0"|"1";savingMode.value=true;try{await updateAiUseMode(mode);await load(true);operationFailed.value=false;operationMessage.value="运行模式已更新"}catch(cause){operationFailed.value=true;operationMessage.value=adminErrorText(cause,"运行模式更新失败")}finally{savingMode.value=false}}
function openEdit(item:Deployment){editForm.value={...item,vendorId:item.vendorId??"",model:item.model??"",modelName:item.modelName??"",temperature:item.temperature??1,maxOutputTokens:item.maxOutputTokens??0};editVisible.value=true}
async function saveDeployment(){if(!editForm.value)return;savingDeployment.value=true;try{await updateAiDeployment(editForm.value);editVisible.value=false;await load(true);operationFailed.value=false;operationMessage.value="Agent 部署已更新"}catch(cause){operationFailed.value=true;operationMessage.value=adminErrorText(cause,"Agent 部署更新失败")}finally{savingDeployment.value=false}}
onMounted(()=>load());
</script>

<style scoped lang="scss">
.admin-page{width:min(100%,1200px);margin:0 auto}.mode-strip{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px;padding:12px 14px;border:1px solid var(--stars-border);border-radius:6px;background:#fff}.mode-strip div{display:grid;gap:3px}.mode-strip span,.deployment-row span{color:var(--stars-text-muted);font-size:11px}.readonly-note,.operation-message{margin:0 0 12px;padding:9px 12px;border-left:3px solid var(--stars-brand);background:#fff;color:var(--stars-text-muted);font-size:12px}.operation-message.error{border-color:#dc2626;color:#b91c1c}.data-section{border:1px solid var(--stars-border);border-radius:6px;background:#fff}.section-heading{display:flex;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--stars-border)}.section-heading h2{margin:0;font-size:14px}.section-heading span{color:var(--stars-text-muted);font-size:12px}.deployment-list{display:grid}.deployment-row{display:grid;grid-template-columns:minmax(170px,1.4fr) repeat(3,minmax(110px,1fr)) auto auto;align-items:center;gap:14px;padding:12px 14px;border-bottom:1px solid var(--stars-border)}.deployment-row:last-child{border-bottom:0}.deployment-row>div{display:grid;gap:3px;min-width:0}.deployment-row strong,.deployment-row small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.deployment-row small{color:var(--stars-text-muted)}.dialog-form{display:grid;gap:12px}.dialog-form label{display:grid;gap:5px}.dialog-form label>span{font-size:12px;color:var(--stars-text-muted)}.switch-label{grid-template-columns:1fr auto;align-items:center}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}@media(max-width:900px){.deployment-row{grid-template-columns:minmax(150px,1fr) minmax(120px,1fr) auto}.deployment-row>div:nth-child(3),.deployment-row>div:nth-child(4){display:none}}@media(max-width:560px){.mode-strip{align-items:flex-start;flex-direction:column}.deployment-row{grid-template-columns:minmax(0,1fr) auto}.deployment-row>div:nth-child(2){display:none}}
</style>
