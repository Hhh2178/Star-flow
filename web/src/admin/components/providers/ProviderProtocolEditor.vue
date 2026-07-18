<template>
  <section class="protocol-editor">
    <header><div><h3>协议与执行</h3><p>选择运行协议模板，并维护通用请求路径和异步轮询边界。</p></div><span>{{ templateLabel }}</span></header>
    <div class="protocol-grid">
      <label>协议模板<select v-model="draft.template" data-testid="protocol-template" :disabled="!canUpdate" @change="templateChanged"><option v-for="item in templates" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
      <label>Base URL<input v-model="draft.baseUrl" :disabled="!canUpdate" placeholder="https://api.example.com/v1" @input="changed" /></label>
      <label>提交路径<input v-model="draft.submitPath" :disabled="!canUpdate" placeholder="/tasks" @input="changed" /></label>
      <label v-if="isAsync">状态路径<input v-model="draft.statusPath" :disabled="!canUpdate" placeholder="/tasks/{id}" @input="changed" /></label>
      <label v-if="needsFinalLookup">结果路径<input v-model="draft.resultPath" :disabled="!canUpdate" placeholder="/tasks/{id}/result" @input="changed" /></label>
      <label v-if="isAsync">轮询间隔（毫秒）<input v-model.number="draft.pollIntervalMs" data-testid="poll-interval" type="number" min="250" max="60000" :disabled="!canUpdate" @input="changed" /></label>
      <label v-if="isAsync">轮询超时（毫秒）<input v-model.number="draft.pollTimeoutMs" data-testid="poll-timeout" type="number" min="1000" max="1800000" :disabled="!canUpdate" @input="changed" /></label>
      <label class="check"><input v-model="draft.enabled" type="checkbox" :disabled="!canUpdate" @change="changed" /> 启用协议</label>
    </div>
    <AdvancedJsonEditor v-model="advancedConfig" label="服务商高级配置" :can-update="canUpdate" @dirty="changed" @validity="advancedValid = $event" />
    <p v-if="error" class="error">{{ error }}</p>
    <footer v-if="canUpdate"><button data-testid="protocol-save" class="primary" type="button" :disabled="busy" @click="save">保存协议与执行配置</button></footer>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { RuntimeProtocol, RuntimeProtocolOverride, RuntimeProvider } from "../../api/adminApi";
import AdvancedJsonEditor from "./AdvancedJsonEditor.vue";

const props = defineProps<{ provider: RuntimeProvider; protocol: RuntimeProtocol | null; canUpdate: boolean; busy: boolean }>();
const emit = defineEmits<{ dirty: []; save: [value: { protocol: RuntimeProtocol; advancedConfig: Record<string, unknown> }] }>();
const templates: {value:RuntimeProtocolOverride;label:string;protocol:RuntimeProtocol["protocolType"]}[] = [
  {value:"sync_inline_result",label:"同步内联结果",protocol:"standard"},
  {value:"async_task_poll_result",label:"异步任务轮询",protocol:"poll"},
  {value:"async_task_poll_then_final_lookup",label:"异步轮询后查询结果",protocol:"poll"},
  {value:"webhook_callback",label:"Webhook 回调",protocol:"webhook"},
  {value:"runninghub_app",label:"RunningHub 应用",protocol:"runninghub"},
  {value:"runninghub_workflow",label:"RunningHub 工作流",protocol:"runninghub"},
  {value:"legacy_adapter",label:"Legacy TypeScript 适配器",protocol:"legacy"},
];
const draft = reactive({ template:"sync_inline_result" as RuntimeProtocolOverride, baseUrl:"", submitPath:"", statusPath:"", resultPath:"", pollIntervalMs:2000, pollTimeoutMs:120000, enabled:false });
const advancedConfig = ref<Record<string,unknown>>({}); const advancedValid=ref(true); const error=ref("");
function clone<T>(value:T):T{return JSON.parse(JSON.stringify(value)) as T}
const selectedTemplate=computed(()=>templates.find(item=>item.value===draft.template)!);
const templateLabel=computed(()=>selectedTemplate.value.label);
const isAsync=computed(()=>["async_task_poll_result","async_task_poll_then_final_lookup"].includes(draft.template));
const needsFinalLookup=computed(()=>draft.template==="async_task_poll_then_final_lookup");
function hydrate(){const config=props.protocol?.config??{};const configured=String(config.modelProtocolTemplate??"") as RuntimeProtocolOverride;draft.template=templates.some(item=>item.value===configured)?configured:templateForProtocol(props.protocol?.protocolType);draft.baseUrl=String(config.baseUrl??"");draft.submitPath=String(config.submitPath??"");draft.statusPath=String(config.statusPath??"");draft.resultPath=String(config.resultPath??"");draft.pollIntervalMs=Number(config.pollIntervalMs??2000);draft.pollTimeoutMs=Number(config.pollTimeoutMs??120000);draft.enabled=props.protocol?.enabled??false;advancedConfig.value=clone(props.provider.advancedConfig??{});error.value="";advancedValid.value=true}
function templateForProtocol(protocol?:RuntimeProtocol["protocolType"]):RuntimeProtocolOverride{return {standard:"sync_inline_result",poll:"async_task_poll_result",webhook:"webhook_callback",runninghub:"runninghub_app",legacy:"legacy_adapter"}[protocol??"standard"] as RuntimeProtocolOverride}
function changed(){emit("dirty")}
function templateChanged(){changed()}
function save(){error.value="";if(!advancedValid.value){error.value="请先修正服务商高级配置";return}if(!draft.baseUrl.trim()&&draft.template!=="legacy_adapter"){error.value="Base URL 不能为空";return}if(isAsync.value&&(!Number.isInteger(draft.pollIntervalMs)||draft.pollIntervalMs<250||draft.pollIntervalMs>60000||!Number.isInteger(draft.pollTimeoutMs)||draft.pollTimeoutMs<1000||draft.pollTimeoutMs>1800000||draft.pollTimeoutMs<draft.pollIntervalMs)){error.value="轮询间隔或超时范围无效";return}const config:Record<string,unknown>={modelProtocolTemplate:draft.template};for(const [key,value] of Object.entries({baseUrl:draft.baseUrl.trim(),submitPath:draft.submitPath.trim(),statusPath:draft.statusPath.trim(),resultPath:draft.resultPath.trim()}))if(value)config[key]=value;if(isAsync.value){config.pollIntervalMs=draft.pollIntervalMs;config.pollTimeoutMs=draft.pollTimeoutMs}emit("save",{protocol:{providerId:props.provider.providerId,protocolType:selectedTemplate.value.protocol,config,enabled:draft.enabled,revision:props.protocol?.revision??0},advancedConfig:clone(advancedConfig.value)})}
watch(()=>[props.provider.providerId,props.provider.revision,props.protocol?.revision] as const,hydrate,{immediate:true});
</script>

<style scoped>
.protocol-editor{display:grid;gap:16px;padding:20px 22px}.protocol-editor>header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--stars-border)}h3{margin:0 0 4px;font-size:16px}p{margin:0;color:var(--stars-text-muted);font-size:11px}header>span{border-radius:12px;background:#e8efff;padding:4px 8px;color:#1d4ed8;font-size:10px}.protocol-grid{display:grid;grid-template-columns:1.1fr 1.5fr 1fr 1fr;align-items:end;gap:10px}.protocol-editor label{display:grid;gap:5px;font-size:11px}.protocol-editor input,.protocol-editor select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:5px;background:#fff;padding:8px;color:#172033;font:inherit}.check{display:flex!important;align-items:center;gap:6px;padding:8px 0}.check input{width:auto}.error{margin:0;color:#b42318;font-size:11px}footer{display:flex;justify-content:flex-end}.primary{border:1px solid #2563eb;border-radius:5px;background:#2563eb;padding:8px 14px;color:#fff;cursor:pointer}.primary:disabled{opacity:.5}
</style>
