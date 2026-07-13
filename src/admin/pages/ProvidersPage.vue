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
          <div><p>{{ selected.providerId }}</p><h2>{{ selected.displayName }}</h2></div>
          <div class="status-strip"><span :class="['status-pill', selected.enabled ? 'ok' : 'off']">{{ selected.enabled ? '运行中' : '已停用' }}</span><span class="status-pill">{{ migrationLabel(selected.migrationState) }}</span><span class="status-pill">rev {{ selected.revision }}</span></div>
        </header>
        <nav class="tabs" aria-label="Provider 工作区">
          <button v-for="tab in tabs" :key="tab.key" :class="{ active: activeTab === tab.key }" @click="changeTab(tab.key)">{{ tab.label }}</button>
        </nav>

        <ProviderOverviewEditor v-if="activeTab === 'overview'" :provider="selected" :can-update="canUpdate" :saving="saving" @dirty="dirty=true" @save="saveProvider" @delete="removeProvider" />

        <section v-else-if="activeTab === 'credentials'" class="panel credentials-panel">
          <h3>凭据引用</h3><p>凭据保存在服务端安全存储中，本控制台只显示配置状态，不回显密钥内容。</p>
          <div v-if="legacyProvider" class="credential-list"><div v-for="input in legacyProvider.inputs" :key="input.key"><span>{{ input.label }}</span><b>{{ input.configured ? '已配置' : '未配置' }}</b><small>{{ input.required ? '必填' : '选填' }}</small></div></div>
          <p v-else class="empty-copy">当前 Provider 没有可展示的凭据定义。</p>
        </section>

        <section v-else-if="activeTab === 'models'" class="panel models-panel">
          <div class="model-toolbar"><input v-model="modelQuery" placeholder="搜索模型" @keyup.enter="loadModels(1)" /><select v-model="capability" @change="loadModels(1)"><option value="">全部能力</option><option value="text">文本</option><option value="image">图片</option><option value="video">视频</option><option value="audio">音频</option><option value="json">JSON</option></select><span>{{ modelPage.total }} 个模型</span><button v-if="canUpdate" data-testid="model-create" class="primary" @click="openCreateModel">新增模型</button></div>
          <div class="table-scroll"><table><thead><tr><th>模型</th><th>能力</th><th>执行方式</th><th>状态</th><th>版本</th><th>操作</th></tr></thead><tbody><tr v-for="model in modelPage.items" :key="model.modelId"><td><strong>{{ model.displayName }}</strong><small>{{ model.modelId }}</small></td><td>{{ capabilityLabel(model.capability) }}</td><td>{{ executionLabel(model.executionMode) }}</td><td><span :class="['status-pill', model.enabled ? 'ok' : 'off']">{{ model.enabled ? '启用' : '停用' }}</span></td><td>rev {{ model.revision }}</td><td><template v-if="canUpdate"><button data-testid="model-edit" class="text-action" @click="openModel(model)">编辑</button><button class="text-action" @click="message='模型计价请在计价策略中维护'">计价</button></template><span v-else>只读</span></td></tr></tbody></table></div>
          <div class="pager"><button :disabled="modelPage.page <= 1" @click="loadModels(modelPage.page-1)">上一页</button><span>第 {{ modelPage.page }} / {{ totalPages }} 页</span><button :disabled="modelPage.page >= totalPages" @click="loadModels(modelPage.page+1)">下一页</button></div>
        </section>

        <section v-else-if="activeTab === 'protocol'" class="panel protocol-panel">
          <div class="form-grid"><label>协议类型<select v-model="protocolDraft.protocolType" :disabled="!canUpdate" @change="dirty=true"><option value="standard">标准请求</option><option value="poll">轮询任务</option><option value="webhook">Webhook</option><option value="runninghub">RunningHub</option><option value="legacy">Legacy Bridge</option></select></label><label>Base URL<input v-model="protocolConfig.baseUrl" :disabled="!canUpdate" placeholder="https://api.example.com" @input="dirty=true" /></label><label v-if="protocolDraft.protocolType === 'poll'">轮询间隔（毫秒）<input v-model.number="protocolConfig.pollIntervalMs" type="number" min="500" :disabled="!canUpdate" @input="dirty=true" /></label><label v-if="protocolDraft.protocolType === 'webhook'">回调路径<input v-model="protocolConfig.callbackPath" :disabled="!canUpdate" placeholder="/callbacks/provider" @input="dirty=true" /></label><label v-if="protocolDraft.protocolType === 'runninghub'">资源类型<input v-model="protocolConfig.resourceType" :disabled="!canUpdate" placeholder="workflow" @input="dirty=true" /></label><label class="check"><input v-model="protocolDraft.enabled" type="checkbox" :disabled="!canUpdate" @change="dirty=true" /> 启用协议</label></div><button v-if="canUpdate" data-testid="protocol-save" class="primary" :disabled="saving" @click="saveProtocol">保存协议与执行配置</button>
        </section>

        <ProviderTestHistory v-else :history="history" />
      </main>
    </div>

    <t-drawer v-model:visible="providerDrawer" header="新增服务商" size="460px" :close-on-overlay-click="false">
      <div class="drawer-form"><label>服务商标识<input v-model="newProvider.providerId" placeholder="例如 provider-name" /></label><label>显示名称<input v-model="newProvider.displayName" /></label><label>备注<textarea v-model="newProvider.note" rows="3" maxlength="2000" /></label><label class="check"><input v-model="newProvider.enabled" type="checkbox" /> 创建后启用</label><p v-if="providerDrawerError" class="field-error">{{ providerDrawerError }}</p><div class="drawer-actions"><button @click="providerDrawer=false">取消</button><button class="primary" :disabled="saving" @click="saveNewProvider">创建服务商</button></div></div>
    </t-drawer>

    <t-drawer v-model:visible="modelDrawer" :header="creatingModel ? '新增模型' : '编辑模型'" size="560px" :close-on-overlay-click="false" @close="closeModel">
      <div v-if="modelDraft" class="drawer-form"><label>模型标识<input v-model="modelDraft.modelId" data-testid="model-id" :disabled="!creatingModel" @input="dirty=true" /></label><label>显示名称<input v-model="modelDraft.displayName" data-testid="model-display-name" @input="dirty=true" /></label><div class="form-grid"><label>能力<select v-model="modelDraft.capability" @change="dirty=true"><option v-for="item in capabilities" :key="item" :value="item">{{ capabilityLabel(item) }}</option></select></label><label>执行方式<select v-model="modelDraft.executionMode" @change="dirty=true"><option v-for="item in executionModes" :key="item" :value="item">{{ executionLabel(item) }}</option></select></label></div><label class="check"><input v-model="modelDraft.enabled" type="checkbox" @change="dirty=true" /> 启用模型</label><label>输入配置（JSON）<textarea v-model="jsonDraft.inputProfile" rows="5" @input="dirty=true" /></label><label>参数结构（JSON）<textarea v-model="jsonDraft.parameterSchema" rows="7" @input="dirty=true" /></label><label>输出映射（JSON）<textarea v-model="jsonDraft.outputMapping" rows="5" @input="dirty=true" /></label><p v-if="drawerError" class="field-error">{{ drawerError }}</p><div class="drawer-actions"><button @click="closeModel">取消</button><button data-testid="model-save" class="primary" :disabled="saving" @click="saveModel">保存模型</button></div></div>
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
import { AdminApiError, adminErrorText, createRuntimeModel, createRuntimeProvider, deleteRuntimeProvider, getProviderOverview, getRuntimeProtocol, listRuntimeModels, listRuntimeProviders, listRuntimeTestHistory, updateRuntimeModel, updateRuntimeProvider, upsertRuntimeProtocol, type ProviderOverview, type RuntimeModel, type RuntimeModelList, type RuntimeProtocol, type RuntimeProvider, type RuntimeTestRun } from "../api/adminApi";

type TabKey = "overview" | "credentials" | "models" | "protocol" | "history";
const tabs: { key: TabKey; label: string }[] = [{key:"overview",label:"概览"},{key:"credentials",label:"凭据"},{key:"models",label:"模型"},{key:"protocol",label:"协议与执行"},{key:"history",label:"测试历史"}];
const capabilities = ["text","image","video","audio","json"] as const;
const executionModes = ["sync","background_poll","webhook","runninghub","legacy"] as const;
const providers=ref<RuntimeProvider[]>([]), selectedId=ref(""), loading=ref(true), refreshing=ref(false), loadError=ref(""), message=ref(""), failed=ref(false), saving=ref(false), dirty=ref(false);
const activeTab=ref<TabKey>("overview"), modelQuery=ref(""), capability=ref("");
const modelPage=ref<RuntimeModelList>({page:1,pageSize:20,total:0,items:[]}), history=ref<RuntimeTestRun[]>([]), protocol=ref<RuntimeProtocol|null>(null), legacyOverview=ref<ProviderOverview>({providers:[],capabilities:{read:true,update:false}});
const protocolDraft=reactive({protocolType:"standard" as RuntimeProtocol["protocolType"],enabled:false,revision:0});
const protocolConfig=reactive<Record<string, any>>({baseUrl:"",pollIntervalMs:2000,callbackPath:"",resourceType:""});
const modelDrawer=ref(false), creatingModel=ref(false), modelDraft=ref<RuntimeModel|null>(null), drawerError=ref(""); const jsonDraft=reactive({inputProfile:"{}",parameterSchema:"{}",outputMapping:"{}"});
const providerDrawer=ref(false),providerDrawerError=ref("");const newProvider=reactive({providerId:"",displayName:"",note:"",enabled:false});
const selected=computed(()=>providers.value.find(p=>p.providerId===selectedId.value)||null);
const totalPages=computed(()=>Math.max(1,Math.ceil(modelPage.value.total/modelPage.value.pageSize)));
const legacyProvider=computed(()=>legacyOverview.value.providers.find(p=>p.id===selectedId.value)||null);
const canUpdate=computed(()=>legacyOverview.value.capabilities.update);
const migrationLabel=(v:RuntimeProvider["migrationState"])=>({legacy:"Legacy",shadow:"影子验证",native:"原生运行时"}[v]);
const capabilityLabel=(v:string)=>({text:"文本",image:"图片",video:"视频",audio:"音频",json:"JSON"}[v]||v);
const executionLabel=(v:string)=>({sync:"同步",background_poll:"后台轮询",webhook:"Webhook",runninghub:"RunningHub",legacy:"Legacy Bridge"}[v]||v);
function confirmLeave(){return !dirty.value||window.confirm("当前修改尚未保存，确定离开吗？")}
function hydrateProvider(){dirty.value=false}
async function loadProviders(silent=false){silent?refreshing.value=true:loading.value=true;loadError.value="";try{const [items,legacy]=await Promise.all([listRuntimeProviders(),getProviderOverview().catch(()=>legacyOverview.value)]);providers.value=items;legacyOverview.value=legacy;if(!items.some(p=>p.providerId===selectedId.value))selectedId.value=items[0]?.providerId||"";hydrateProvider();if(selectedId.value)await loadSelected()}catch(cause){loadError.value=adminErrorText(cause,"Provider 运行时加载失败")}finally{loading.value=false;refreshing.value=false}}
async function loadSelected(){await Promise.all([loadModels(1),loadProtocol(),loadHistory()])}
async function loadModels(page=1){if(!selectedId.value)return;modelPage.value=await listRuntimeModels({providerId:selectedId.value,page,pageSize:20,query:modelQuery.value||undefined,capability:capability.value||undefined})}
async function loadProtocol(){if(!selectedId.value)return;protocol.value=await getRuntimeProtocol(selectedId.value);const value=protocol.value;protocolDraft.protocolType=value?.protocolType||"standard";protocolDraft.enabled=value?.enabled||false;protocolDraft.revision=value?.revision||0;Object.assign(protocolConfig,{baseUrl:"",pollIntervalMs:2000,callbackPath:"",resourceType:"",...(value?.config||{})})}
async function loadHistory(){if(selectedId.value)history.value=await listRuntimeTestHistory(selectedId.value)}
async function selectProvider(id:string){if(id===selectedId.value||!confirmLeave())return;selectedId.value=id;hydrateProvider();await loadSelected()}
function changeTab(tab:TabKey){if(tab===activeTab.value||!confirmLeave())return;activeTab.value=tab;dirty.value=false}
function conflict(cause:unknown){return cause instanceof AdminApiError&&["PROVIDER_REVISION_CONFLICT","MODEL_REVISION_CONFLICT","PROTOCOL_REVISION_CONFLICT"].includes(String(cause.code))}
async function guardSave(action:()=>Promise<unknown>,fallback:string){saving.value=true;failed.value=false;message.value="";try{await action();dirty.value=false;message.value="保存成功";await loadProviders(true)}catch(cause){failed.value=true;if(conflict(cause)){message.value="配置已被其他管理员更新，已刷新最新数据";dirty.value=false;await loadProviders(true)}else message.value=adminErrorText(cause,fallback)}finally{saving.value=false}}
async function saveProvider(patch:Pick<RuntimeProvider,"displayName"|"migrationState"|"enabled"|"note">){if(!selected.value||!canUpdate.value)return;await guardSave(()=>updateRuntimeProvider(selected.value!.providerId,selected.value!.revision,patch),"服务商保存失败")}
function openCreateProvider(){if(!canUpdate.value)return;Object.assign(newProvider,{providerId:"",displayName:"",note:"",enabled:false});providerDrawerError.value="";providerDrawer.value=true}
async function saveNewProvider(){const providerId=newProvider.providerId.trim(),displayName=newProvider.displayName.trim();if(!providerId||!displayName){providerDrawerError.value="服务商标识和显示名称不能为空";return}await guardSave(()=>createRuntimeProvider({providerId,displayName,note:newProvider.note,enabled:newProvider.enabled,migrationState:"legacy",adapterId:"legacy",advancedConfig:{}}),"服务商创建失败");providerDrawer.value=false}
async function removeProvider(){if(!selected.value||!canUpdate.value||!window.confirm(`确定删除服务商“${selected.value.displayName}”吗？`))return;await guardSave(()=>deleteRuntimeProvider(selected.value!.providerId),"服务商删除失败")}
async function saveProtocol(){if(!selected.value||!canUpdate.value)return;const allowed=protocolDraft.protocolType==="poll"?["baseUrl","pollIntervalMs"]:protocolDraft.protocolType==="webhook"?["baseUrl","callbackPath"]:protocolDraft.protocolType==="runninghub"?["baseUrl","resourceType"]:["baseUrl"];const config=Object.fromEntries(allowed.map(k=>[k,protocolConfig[k]]).filter(([,v])=>v!==""&&v!=null));await guardSave(()=>upsertRuntimeProtocol({providerId:selected.value!.providerId,protocolType:protocolDraft.protocolType,enabled:protocolDraft.enabled,revision:protocolDraft.revision,config}),"协议配置保存失败")}
function openModel(model:RuntimeModel){if(!canUpdate.value)return;modelDraft.value=structuredClone(model);jsonDraft.inputProfile=JSON.stringify(model.inputProfile,null,2);jsonDraft.parameterSchema=JSON.stringify(model.parameterSchema,null,2);jsonDraft.outputMapping=JSON.stringify(model.outputMapping,null,2);drawerError.value="";dirty.value=false;modelDrawer.value=true}
function openCreateModel(){if(!canUpdate.value||!selected.value)return;creatingModel.value=true;modelDraft.value={providerId:selected.value.providerId,modelId:"",displayName:"",capability:"text",executionMode:"sync",inputProfile:{},capabilityTags:[],inputCapabilities:{},parameterSchema:{},advancedConfig:{},protocolOverride:null,outputMapping:{},enabled:true,revision:0};Object.assign(jsonDraft,{inputProfile:"{}",parameterSchema:"{}",outputMapping:"{}"});drawerError.value="";dirty.value=false;modelDrawer.value=true}
function closeModel(){if(!confirmLeave())return;modelDrawer.value=false;modelDraft.value=null;creatingModel.value=false;dirty.value=false}
async function saveModel(){if(!modelDraft.value||!canUpdate.value)return;try{const inputProfile=JSON.parse(jsonDraft.inputProfile),parameterSchema=JSON.parse(jsonDraft.parameterSchema),outputMapping=JSON.parse(jsonDraft.outputMapping);drawerError.value="";const model=modelDraft.value;model.modelId=model.modelId.trim();model.displayName=model.displayName.trim();if(!model.modelId||!model.displayName){drawerError.value="模型标识和显示名称不能为空";return}const action=creatingModel.value?()=>createRuntimeModel({providerId:model.providerId,modelId:model.modelId,displayName:model.displayName,capability:model.capability,executionMode:model.executionMode,inputProfile,parameterSchema,outputMapping,enabled:model.enabled}):()=>updateRuntimeModel(model.providerId,model.modelId,model.revision,{displayName:model.displayName,capability:model.capability,executionMode:model.executionMode,inputProfile,parameterSchema,outputMapping,enabled:model.enabled});await guardSave(action,"模型保存失败");modelDrawer.value=false;modelDraft.value=null;creatingModel.value=false}catch(cause){if(cause instanceof SyntaxError)drawerError.value="JSON 格式不正确，请检查后重试";else throw cause}}
function beforeUnload(event:BeforeUnloadEvent){if(dirty.value){event.preventDefault();event.returnValue=""}}
onBeforeRouteLeave(()=>confirmLeave());onMounted(()=>{window.addEventListener("beforeunload",beforeUnload);loadProviders()});onBeforeUnmount(()=>window.removeEventListener("beforeunload",beforeUnload));
</script>

<style scoped lang="scss">
.runtime-page{width:100%;max-width:1680px;margin:0 auto}.notice{margin:0 0 10px;padding:9px 12px;border-left:3px solid var(--stars-brand);background:#fff;font-size:12px}.notice.error{border-color:#dc2626;color:#b91c1c}.readonly-note{margin:0 0 10px;padding:9px 12px;border-left:3px solid #6b7280;background:#f7f8fa;color:#4b5563;font-size:12px}.provider-console{display:grid;grid-template-columns:260px minmax(0,1fr);height:calc(100dvh - 178px);min-height:540px;overflow:hidden;border:1px solid var(--stars-border);border-radius:8px;background:#fff}input,select,textarea{width:100%;box-sizing:border-box;border:1px solid #d8dce3;border-radius:5px;background:#fff;padding:8px 9px;color:var(--stars-text);font:inherit}.empty-copy{padding:24px;color:var(--stars-text-muted);text-align:center}.workspace{min-width:0;overflow:auto}.workspace-header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px 14px;border-bottom:1px solid var(--stars-border)}.workspace-header p{margin:0 0 3px;color:var(--stars-text-muted);font-size:11px}.workspace-header h2{margin:0;font-size:20px}.status-strip{display:flex;gap:6px}.status-pill{display:inline-flex;padding:3px 7px;border-radius:10px;background:#eef0f3;color:#5b6472;font-size:10px}.status-pill.ok{background:#e8efff;color:#1d4ed8}.status-pill.off{background:#f1f2f4;color:#818793}.tabs{position:sticky;top:0;z-index:3;display:flex;padding:0 22px;border-bottom:1px solid var(--stars-border);background:#fff}.tabs button{padding:12px 14px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--stars-text-muted);cursor:pointer}.tabs button.active{border-color:var(--stars-brand);color:var(--stars-text);font-weight:600}.panel{padding:20px 22px}label{display:grid;gap:6px;font-size:12px}.check{display:flex;align-items:center;gap:7px;padding:8px 0}.check input{width:auto}.primary{border:1px solid var(--stars-brand);border-radius:5px;background:var(--stars-brand);padding:8px 14px;color:#fff;cursor:pointer}.primary:disabled{opacity:.5}.credentials-panel h3{margin-top:0}.credentials-panel>p{color:var(--stars-text-muted)}.credential-list{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.credential-list>div{display:grid;gap:4px;padding:12px;border:1px solid var(--stars-border)}.credential-list small{color:var(--stars-text-muted)}.model-toolbar{display:grid;grid-template-columns:minmax(180px,320px) 150px 1fr;align-items:center;gap:8px;margin-bottom:12px}.model-toolbar span{text-align:right;color:var(--stars-text-muted)}.table-scroll{overflow:auto;border:1px solid var(--stars-border);border-radius:6px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:10px 12px;border-bottom:1px solid var(--stars-border);text-align:left}th{background:#f7f8fa;color:var(--stars-text-muted);font-weight:500}td strong,td small{display:block}td small{margin-top:3px;color:var(--stars-text-muted)}.text-action{border:0;background:transparent;color:var(--stars-brand);cursor:pointer}.pager{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:12px}.pager button,.drawer-actions button{padding:7px 11px;border:1px solid var(--stars-border);border-radius:5px;background:#fff}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.protocol-panel>.primary{margin-top:18px}.drawer-form{display:grid;gap:14px;padding:4px}.drawer-form textarea{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px}.drawer-actions{display:flex;justify-content:flex-end;gap:8px}.drawer-actions .primary{background:var(--stars-brand)}.field-error{margin:0;color:#b91c1c;font-size:12px}@media(max-width:1100px){.provider-console{grid-template-columns:240px minmax(0,1fr)}.credential-list{grid-template-columns:1fr 1fr}}
.model-toolbar{grid-template-columns:minmax(180px,320px) 150px 1fr auto}
</style>
