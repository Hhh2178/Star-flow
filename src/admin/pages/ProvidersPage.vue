<template>
  <section class="runtime-page">
    <PageHeader title="服务商运行时控制台" description="集中管理服务商、模型、协议、执行配置与测试记录">
      <template #actions><t-button variant="outline" :loading="refreshing" @click="loadProviders(true)">刷新</t-button></template>
    </PageHeader>
    <p v-if="message" class="notice" :class="{ error: failed }" role="status">{{ message }}</p>
    <p v-if="!loading && !loadError && !canUpdate" class="readonly-note">当前账号仅可查看 Provider Runtime 配置。</p>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="loadError" :message="loadError" retryable @retry="loadProviders()" />
    <div v-else class="provider-console">
      <ProviderRail :providers="providers" :selected-id="selectedId" :can-update="canUpdate" @select="selectProvider" @create="openCreateProvider" />

      <main v-if="selected" data-testid="provider-workspace" class="workspace" :data-selected-provider="selected.providerId">
        <header class="workspace-header">
          <div><p>{{ visibleProviderId(selected.providerId) }}</p><h2>{{ visibleProviderName(selected) }}</h2></div>
          <div class="status-strip"><span :class="['status-pill', selected.enabled ? 'ok' : 'off']">{{ selected.enabled ? '运行中' : '已停用' }}</span><span class="status-pill">{{ migrationLabel(selected.migrationState) }}</span><span class="status-pill">rev {{ selected.revision }}</span></div>
        </header>
        <nav class="tabs" aria-label="Provider 工作区">
          <button v-for="tab in tabs" :key="tab.key" :class="{ active: activeTab === tab.key }" @click="changeTab(tab.key)">{{ tab.label }}</button>
        </nav>

        <ProviderOverviewEditor v-if="activeTab === 'overview'" :provider="selected" :can-update="canUpdate" :saving="saving" @dirty="dirty=true" @save="saveProvider" @delete="removeProvider" />

        <ProviderConnectionEditor v-else-if="activeTab === 'credentials'" :provider="selected" :protocol="protocol" :can-update="canUpdate" :busy="saving" :probe-result="probeResult" @dirty="dirty=true" @save-protocol="saveConnection" @replace-credential="replaceCredential" @clear-credential="clearCredential" @probe-draft="runDraftProbe" @probe-saved="runSavedProbe" />

        <ProviderModelCatalog v-else-if="activeTab === 'models'" :models="modelPage" :candidates="candidates" :can-update="canUpdate" :busy="saving" @filter="applyModelFilter" @page="loadModels" @create="openCreateModel" @edit="openModel" @delete="removeModel" @fetch-models="discoverModels" @import-models="importModels" />

        <ProviderProtocolEditor v-else-if="activeTab === 'protocol'" :provider="selected" :protocol="protocol" :can-update="canUpdate" :busy="saving" @dirty="dirty=true" @save="saveProtocolWorkspace" />

        <ProviderTestHistory v-else :history="history" />
      </main>
    </div>

    <t-drawer v-model:visible="providerDrawer" header="新增服务商" size="460px" :close-on-overlay-click="false">
      <div class="drawer-form"><label>服务商标识<input v-model="newProvider.providerId" placeholder="例如 provider-name" /></label><label>显示名称<input v-model="newProvider.displayName" /></label><label>备注<textarea v-model="newProvider.note" rows="3" maxlength="2000" /></label><label class="check"><input v-model="newProvider.enabled" type="checkbox" /> 创建后启用</label><p v-if="providerDrawerError" class="field-error">{{ providerDrawerError }}</p><div class="drawer-actions"><button @click="providerDrawer=false">取消</button><button class="primary" :disabled="saving" @click="saveNewProvider">创建服务商</button></div></div>
    </t-drawer>

    <t-drawer v-model:visible="modelDrawer" :header="creatingModel ? '新增模型' : '编辑模型'" size="1180px" :close-on-overlay-click="false" @close="closeModel">
      <ProviderModelEditor v-if="modelDraft" :model="modelDraft" :provider-advanced-config="selected?.advancedConfig ?? {}" :creating="creatingModel" :can-update="canUpdate" :busy="saving" @dirty="dirty=true" @cancel="closeModel" @save="saveModel" />
    </t-drawer>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import ErrorState from "../components/ErrorState.vue";
import ProviderRail from "../components/providers/ProviderRail.vue";
import ProviderOverviewEditor from "../components/providers/ProviderOverviewEditor.vue";
import ProviderTestHistory from "../components/providers/ProviderTestHistory.vue";
import ProviderConnectionEditor from "../components/providers/ProviderConnectionEditor.vue";
import ProviderModelCatalog from "../components/providers/ProviderModelCatalog.vue";
import ProviderModelEditor from "../components/providers/ProviderModelEditor.vue";
import ProviderProtocolEditor from "../components/providers/ProviderProtocolEditor.vue";
import { visibleProviderName, visibleProviderId } from "../utils/providerPresentation";
import { AdminApiError, adminErrorText, clearProviderCredential, createRuntimeModel, createRuntimeProvider, deleteRuntimeModel, deleteRuntimeProvider, fetchProviderModels, getProviderOverview, getRuntimeProtocol, importProviderModels, listRuntimeModels, listRuntimeProviders, listRuntimeTestHistory, probeProviderDraft, probeSavedProvider, replaceProviderCredential, updateRuntimeModel, updateRuntimeProvider, upsertRuntimeProtocol, type DiscoveredRuntimeModel, type ImportRuntimeModel, type ProviderOverview, type RuntimeModel, type RuntimeModelList, type RuntimeProbeResult, type RuntimeProtocol, type RuntimeProvider, type RuntimeTestRun } from "../api/adminApi";

type TabKey = "overview" | "credentials" | "models" | "protocol" | "history";
const tabs: { key: TabKey; label: string }[] = [{key:"overview",label:"概览"},{key:"credentials",label:"凭据"},{key:"models",label:"模型"},{key:"protocol",label:"协议与执行"},{key:"history",label:"测试历史"}];
const providers=ref<RuntimeProvider[]>([]), selectedId=ref(""), loading=ref(true), refreshing=ref(false), loadError=ref(""), message=ref(""), failed=ref(false), saving=ref(false), dirty=ref(false);
const activeTab=ref<TabKey>("overview"), modelQuery=ref(""), capability=ref("");
const modelPage=ref<RuntimeModelList>({page:1,pageSize:20,total:0,items:[]}), history=ref<RuntimeTestRun[]>([]), protocol=ref<RuntimeProtocol|null>(null), legacyOverview=ref<ProviderOverview>({providers:[],capabilities:{read:true,update:false}});
const candidates=ref<DiscoveredRuntimeModel[]>([]),probeResult=ref<RuntimeProbeResult|null>(null);
const modelDrawer=ref(false), creatingModel=ref(false), modelDraft=ref<RuntimeModel|null>(null);
const providerDrawer=ref(false),providerDrawerError=ref("");const newProvider=reactive({providerId:"",displayName:"",note:"",enabled:false});
const selected=computed(()=>providers.value.find(p=>p.providerId===selectedId.value)||null);
const canUpdate=computed(()=>legacyOverview.value.capabilities.update);
const migrationLabel=(v:RuntimeProvider["migrationState"])=>({legacy:"Legacy",shadow:"影子验证",native:"原生运行时"}[v]);
function confirmLeave(){return !dirty.value||window.confirm("当前修改尚未保存，确定离开吗？")}
function hydrateProvider(){dirty.value=false}
async function loadProviders(silent=false){silent?refreshing.value=true:loading.value=true;loadError.value="";try{const [items,legacy]=await Promise.all([listRuntimeProviders(),getProviderOverview().catch(()=>legacyOverview.value)]);providers.value=items;legacyOverview.value=legacy;if(!items.some(p=>p.providerId===selectedId.value))selectedId.value=items[0]?.providerId||"";hydrateProvider();if(selectedId.value)await loadSelected()}catch(cause){loadError.value=adminErrorText(cause,"Provider 运行时加载失败")}finally{loading.value=false;refreshing.value=false}}
async function loadSelected(){await Promise.all([loadModels(1),loadProtocol(),loadHistory()])}
async function loadModels(page=1){if(!selectedId.value)return;modelPage.value=await listRuntimeModels({providerId:selectedId.value,page,pageSize:20,query:modelQuery.value||undefined,capability:capability.value||undefined})}
async function loadProtocol(){if(!selectedId.value)return;protocol.value=await getRuntimeProtocol(selectedId.value)}
async function loadHistory(){if(selectedId.value)history.value=await listRuntimeTestHistory(selectedId.value)}
async function selectProvider(id:string){if(id===selectedId.value||!confirmLeave())return;selectedId.value=id;hydrateProvider();await loadSelected()}
function changeTab(tab:TabKey){if(tab===activeTab.value||!confirmLeave())return;activeTab.value=tab;dirty.value=false}
function conflict(cause:unknown){return cause instanceof AdminApiError&&["PROVIDER_REVISION_CONFLICT","MODEL_REVISION_CONFLICT","PROTOCOL_REVISION_CONFLICT"].includes(String(cause.code))}
async function guardSave(action:()=>Promise<unknown>,fallback:string){saving.value=true;failed.value=false;message.value="";try{await action();dirty.value=false;message.value="保存成功";await loadProviders(true)}catch(cause){failed.value=true;if(conflict(cause)){message.value="配置已被其他管理员更新，已刷新最新数据";dirty.value=false;await loadProviders(true)}else message.value=adminErrorText(cause,fallback)}finally{saving.value=false}}
async function saveProvider(patch:Pick<RuntimeProvider,"displayName"|"migrationState"|"enabled"|"note">){if(!selected.value||!canUpdate.value)return;await guardSave(()=>updateRuntimeProvider(selected.value!.providerId,selected.value!.revision,patch),"服务商保存失败")}
function openCreateProvider(){if(!canUpdate.value)return;Object.assign(newProvider,{providerId:"",displayName:"",note:"",enabled:false});providerDrawerError.value="";providerDrawer.value=true}
async function saveNewProvider(){const providerId=newProvider.providerId.trim(),displayName=newProvider.displayName.trim();if(!providerId||!displayName){providerDrawerError.value="服务商标识和显示名称不能为空";return}await guardSave(()=>createRuntimeProvider({providerId,displayName,note:newProvider.note,enabled:newProvider.enabled,migrationState:"legacy",adapterId:"legacy",advancedConfig:{}}),"服务商创建失败");providerDrawer.value=false}
async function removeProvider(){if(!selected.value||!canUpdate.value||!window.confirm(`确定删除服务商“${visibleProviderName(selected.value)}”吗？`))return;await guardSave(()=>deleteRuntimeProvider(selected.value!.providerId),"服务商删除失败")}
async function saveConnection(value:{protocolType:RuntimeProtocol["protocolType"];baseUrl:string;enabled:boolean}){if(!selected.value||!canUpdate.value)return;const config={...(protocol.value?.config??{}),baseUrl:value.baseUrl};await guardSave(()=>upsertRuntimeProtocol({providerId:selected.value!.providerId,protocolType:value.protocolType,enabled:value.enabled,revision:protocol.value?.revision??0,config}),"连接配置保存失败")}
async function saveProtocolWorkspace(value:{protocol:RuntimeProtocol;advancedConfig:Record<string,unknown>}){if(!selected.value||!canUpdate.value)return;await guardSave(()=>Promise.all([updateRuntimeProvider(selected.value!.providerId,selected.value!.revision,{advancedConfig:value.advancedConfig}),upsertRuntimeProtocol(value.protocol)]),"协议配置保存失败")}
async function replaceCredential(value:string){if(!selected.value)return;await guardSave(()=>replaceProviderCredential(selected.value!.providerId,value),"凭据替换失败")}
async function clearCredential(){if(!selected.value)return;await guardSave(()=>clearProviderCredential(selected.value!.providerId),"凭据清除失败")}
async function runDraftProbe(value:{baseUrl:string;credential:string;protocolType:RuntimeProtocol["protocolType"]}){saving.value=true;failed.value=false;try{probeResult.value=await probeProviderDraft(value);message.value="草稿连接测试通过"}catch(cause){failed.value=true;message.value=adminErrorText(cause,"草稿连接测试失败")}finally{saving.value=false}}
async function runSavedProbe(){if(!selected.value)return;saving.value=true;failed.value=false;try{probeResult.value=await probeSavedProvider(selected.value.providerId);message.value="已保存连接测试通过"}catch(cause){failed.value=true;message.value=adminErrorText(cause,"已保存连接测试失败")}finally{saving.value=false}}
function applyModelFilter(value:{query:string;capability:string}){modelQuery.value=value.query;capability.value=value.capability;loadModels(1)}
async function discoverModels(){if(!selected.value)return;saving.value=true;failed.value=false;try{candidates.value=await fetchProviderModels(selected.value.providerId);message.value=`已拉取 ${candidates.value.length} 个候选模型，尚未导入`}catch(cause){failed.value=true;message.value=adminErrorText(cause,"模型目录拉取失败")}finally{saving.value=false}}
async function importModels(models:ImportRuntimeModel[]){if(!selected.value||models.length===0)return;await guardSave(()=>importProviderModels(selected.value!.providerId,models),"模型导入失败");candidates.value=[]}
async function removeModel(model:RuntimeModel){if(!window.confirm(`确定删除模型“${model.displayName}”吗？`))return;await guardSave(()=>deleteRuntimeModel(model.providerId,model.modelId),"模型删除失败")}
function openModel(model:RuntimeModel){if(!canUpdate.value)return;modelDraft.value=structuredClone(model);creatingModel.value=false;dirty.value=false;modelDrawer.value=true}
function openCreateModel(){if(!canUpdate.value||!selected.value)return;creatingModel.value=true;modelDraft.value={providerId:selected.value.providerId,modelId:"",displayName:"",capability:"text",executionMode:"sync",inputProfile:{},capabilityTags:["text_chat"],inputCapabilities:{prompt:true,systemPrompt:false,imageReference:{enabled:false,min:0,max:0},frameModes:[],mask:false,videoReference:false,audioReference:false},parameterSchema:{temperature:{type:"number",min:0,max:2,step:0.1,default:0.7},topP:{type:"number",min:0,max:1,step:0.05,default:1},maxTokens:{type:"integer",min:1,max:32768,default:4096}},advancedConfig:{},protocolOverride:null,outputMapping:{},enabled:true,revision:0};dirty.value=false;modelDrawer.value=true}
function closeModel(){if(!confirmLeave())return;modelDrawer.value=false;modelDraft.value=null;creatingModel.value=false;dirty.value=false}
async function saveModel(model:RuntimeModel){if(!canUpdate.value)return;model.modelId=model.modelId.trim();model.displayName=model.displayName.trim();const fields={displayName:model.displayName,capability:model.capability,executionMode:model.executionMode,inputProfile:model.inputProfile,capabilityTags:model.capabilityTags,inputCapabilities:model.inputCapabilities,parameterSchema:model.parameterSchema,advancedConfig:model.advancedConfig,protocolOverride:model.protocolOverride,outputMapping:model.outputMapping,enabled:model.enabled};const action=creatingModel.value?()=>createRuntimeModel({providerId:model.providerId,modelId:model.modelId,...fields}):()=>updateRuntimeModel(model.providerId,model.modelId,model.revision,fields);await guardSave(action,"模型保存失败");modelDrawer.value=false;modelDraft.value=null;creatingModel.value=false}
function beforeUnload(event:BeforeUnloadEvent){if(dirty.value){event.preventDefault();event.returnValue=""}}
onBeforeRouteLeave(()=>confirmLeave());onMounted(()=>{window.addEventListener("beforeunload",beforeUnload);loadProviders()});onBeforeUnmount(()=>window.removeEventListener("beforeunload",beforeUnload));
</script>

<style scoped lang="scss">
.runtime-page{width:100%;max-width:1680px;margin:0 auto}.notice{margin:0 0 10px;padding:9px 12px;border-left:3px solid var(--stars-brand);background:#fff;font-size:12px}.notice.error{border-color:#dc2626;color:#b91c1c}.readonly-note{margin:0 0 10px;padding:9px 12px;border-left:3px solid #6b7280;background:#f7f8fa;color:#4b5563;font-size:12px}.provider-console{display:grid;grid-template-columns:260px minmax(0,1fr);height:calc(100dvh - 178px);min-height:540px;overflow:hidden;border:1px solid var(--stars-border);border-radius:8px;background:#fff}input,select,textarea{width:100%;box-sizing:border-box;border:1px solid #d8dce3;border-radius:5px;background:#fff;padding:8px 9px;color:var(--stars-text);font:inherit}.empty-copy{padding:24px;color:var(--stars-text-muted);text-align:center}.workspace{min-width:0;overflow:auto}.workspace-header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px 14px;border-bottom:1px solid var(--stars-border)}.workspace-header p{margin:0 0 3px;color:var(--stars-text-muted);font-size:11px}.workspace-header h2{margin:0;font-size:20px}.status-strip{display:flex;gap:6px}.status-pill{display:inline-flex;padding:3px 7px;border-radius:10px;background:#eef0f3;color:#5b6472;font-size:10px}.status-pill.ok{background:#e8efff;color:#1d4ed8}.status-pill.off{background:#f1f2f4;color:#818793}.tabs{position:sticky;top:0;z-index:3;display:flex;padding:0 22px;border-bottom:1px solid var(--stars-border);background:#fff}.tabs button{padding:12px 14px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--stars-text-muted);cursor:pointer}.tabs button.active{border-color:var(--stars-brand);color:var(--stars-text);font-weight:600}.panel{padding:20px 22px}label{display:grid;gap:6px;font-size:12px}.check{display:flex;align-items:center;gap:7px;padding:8px 0}.check input{width:auto}.primary{border:1px solid var(--stars-brand);border-radius:5px;background:var(--stars-brand);padding:8px 14px;color:#fff;cursor:pointer}.primary:disabled{opacity:.5}.credentials-panel h3{margin-top:0}.credentials-panel>p{color:var(--stars-text-muted)}.credential-list{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.credential-list>div{display:grid;gap:4px;padding:12px;border:1px solid var(--stars-border)}.credential-list small{color:var(--stars-text-muted)}.model-toolbar{display:grid;grid-template-columns:minmax(180px,320px) 150px 1fr;align-items:center;gap:8px;margin-bottom:12px}.model-toolbar span{text-align:right;color:var(--stars-text-muted)}.table-scroll{overflow:auto;border:1px solid var(--stars-border);border-radius:6px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:10px 12px;border-bottom:1px solid var(--stars-border);text-align:left}th{background:#f7f8fa;color:var(--stars-text-muted);font-weight:500}td strong,td small{display:block}td small{margin-top:3px;color:var(--stars-text-muted)}.text-action{border:0;background:transparent;color:var(--stars-brand);cursor:pointer}.pager{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:12px}.pager button,.drawer-actions button{padding:7px 11px;border:1px solid var(--stars-border);border-radius:5px;background:#fff}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.protocol-panel>.primary{margin-top:18px}.drawer-form{display:grid;gap:14px;padding:4px}.drawer-form textarea{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px}.drawer-actions{display:flex;justify-content:flex-end;gap:8px}.drawer-actions .primary{background:var(--stars-brand)}.field-error{margin:0;color:#b91c1c;font-size:12px}@media(max-width:1100px){.provider-console{grid-template-columns:240px minmax(0,1fr)}.credential-list{grid-template-columns:1fr 1fr}}
.model-toolbar{grid-template-columns:minmax(180px,320px) 150px 1fr auto}
</style>
