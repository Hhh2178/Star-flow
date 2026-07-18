<template>
  <div class="model-editor">
    <section class="identity-grid">
      <label>模型标识<input v-model="draft.modelId" data-testid="model-id" :disabled="!creating || !canUpdate" @input="changed" /></label>
      <label>显示名称<input v-model="draft.displayName" data-testid="model-display-name" :disabled="!canUpdate" @input="changed" /></label>
      <label>主要类型<select v-model="draft.capability" data-testid="model-capability" :disabled="!canUpdate" @change="capabilityChanged"><option v-for="item in capabilities" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
      <label>执行方式<select v-model="draft.executionMode" :disabled="!canUpdate" @change="changed"><option v-for="item in executionModes" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
      <label>协议模板<select v-model="draft.protocolOverride" :disabled="!canUpdate" @change="changed"><option :value="null">跟随服务商</option><option v-for="item in protocolTemplates" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
      <label class="check"><input v-model="draft.enabled" type="checkbox" :disabled="!canUpdate" @change="changed" /> 启用模型</label>
    </section>

    <div v-if="templateAvailable" class="template-notice"><span>可应用{{ capabilityName }}模型建议模板，当前配置不会被自动覆盖。</span><button data-testid="apply-capability-template" type="button" :disabled="!canUpdate" @click="applyTemplate">应用建议模板</button></div>

    <section class="editor-section">
      <header><div><h3>能力标签</h3><p>用于创作端筛选模型，并约束模型可接收的任务形态。</p></div><span>{{ draft.capabilityTags.length }} 项</span></header>
      <div class="tag-groups">
        <fieldset v-for="group in tagGroups" :key="group.label"><legend>{{ group.label }}</legend><label v-for="tag in group.tags" :key="tag.value" class="tag"><input v-model="draft.capabilityTags" :data-testid="`tag-${tag.value}`" type="checkbox" :value="tag.value" :disabled="!canUpdate" @change="changed" /><span>{{ tag.label }}</span></label></fieldset>
      </div>
    </section>

    <section class="editor-section">
      <header><div><h3>输入能力</h3><p>引用图数量和视频帧组合会在服务端再次校验。</p></div></header>
      <div class="input-grid">
        <label class="check"><input v-model="inputs.prompt" type="checkbox" :disabled="!canUpdate" @change="changed" /> 提示词</label>
        <label class="check"><input v-model="inputs.systemPrompt" type="checkbox" :disabled="!canUpdate" @change="changed" /> 系统提示词</label>
        <label class="check"><input v-model="inputs.mask" type="checkbox" :disabled="!canUpdate" @change="changed" /> 蒙版</label>
        <label class="check"><input v-model="inputs.videoReference" type="checkbox" :disabled="!canUpdate" @change="changed" /> 视频参考</label>
        <label class="check"><input v-model="inputs.audioReference" type="checkbox" :disabled="!canUpdate" @change="changed" /> 音频参考</label>
      </div>
      <div class="reference-row">
        <label class="check"><input v-model="inputs.imageReference.enabled" data-testid="reference-enabled" type="checkbox" :disabled="!canUpdate" @change="referenceChanged" /> 支持参考图</label>
        <label>最少数量<input v-model.number="inputs.imageReference.min" data-testid="reference-min" type="number" min="0" max="16" :disabled="!canUpdate || !inputs.imageReference.enabled" @input="changed" /></label>
        <label>最多数量<input v-model.number="inputs.imageReference.max" data-testid="reference-max" type="number" min="0" max="16" :disabled="!canUpdate || !inputs.imageReference.enabled" @input="changed" /></label>
      </div>
      <fieldset v-if="draft.capability === 'video'" class="frame-modes"><legend>视频帧组合</legend><label v-for="mode in frameModes" :key="mode.value" class="tag"><input v-model="inputs.frameModes" :data-testid="`frame-${mode.value}`" type="checkbox" :value="mode.value" :disabled="!canUpdate" @change="changed" /><span>{{ mode.label }}</span></label></fieldset>
    </section>

    <details class="advanced-section" open>
      <summary>参数 Schema 与兼容配置</summary>
      <div class="json-grid">
        <label>参数 Schema<textarea v-model="json.parameterSchema" data-testid="parameter-schema" :disabled="!canUpdate" spellcheck="false" @input="jsonChanged" /></label>
        <label>输入配置<textarea v-model="json.inputProfile" :disabled="!canUpdate" spellcheck="false" @input="jsonChanged" /></label>
        <label>输出映射<textarea v-model="json.outputMapping" :disabled="!canUpdate" spellcheck="false" @input="jsonChanged" /></label>
      </div>
      <p v-if="jsonError" class="error">{{ jsonError }}</p>
    </details>

    <AdvancedJsonEditor v-model="draft.advancedConfig" :base-value="providerAdvancedConfig" label="模型高级配置" :can-update="canUpdate" @dirty="changed" @validity="advancedValid = $event" />
    <p v-if="formError" class="error">{{ formError }}</p>
    <footer><button type="button" @click="$emit('cancel')">取消</button><button data-testid="model-save" class="primary" type="button" :disabled="busy || !canUpdate" @click="save">保存模型</button></footer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { RuntimeModel, RuntimeModelCapability, RuntimeProtocolOverride } from "../../api/adminApi";
import AdvancedJsonEditor from "./AdvancedJsonEditor.vue";

type FrameMode = "text_only" | "reference_images" | "first_frame" | "last_frame" | "first_or_last_frame" | "first_last_frame";
type InputCapabilities = { prompt: boolean; systemPrompt: boolean; imageReference: { enabled: boolean; min: number; max: number }; frameModes: FrameMode[]; mask: boolean; videoReference: boolean; audioReference: boolean };
const props = withDefaults(defineProps<{ model: RuntimeModel; providerAdvancedConfig?: Record<string, unknown>; creating: boolean; canUpdate: boolean; busy: boolean }>(), { providerAdvancedConfig: () => ({}) });
const emit = defineEmits<{ dirty: []; save: [model: RuntimeModel]; cancel: [] }>();
const capabilities = [{value:"text",label:"文本"},{value:"image",label:"图像"},{value:"video",label:"视频"},{value:"audio",label:"音频"},{value:"json",label:"结构化 JSON"}] as const;
const executionModes = [{value:"sync",label:"同步"},{value:"background_poll",label:"异步轮询"},{value:"webhook",label:"Webhook"},{value:"runninghub",label:"RunningHub"},{value:"legacy",label:"Legacy 适配器"}] as const;
const protocolTemplates: {value:RuntimeProtocolOverride;label:string}[] = [{value:"sync_inline_result",label:"同步内联结果"},{value:"async_task_poll_result",label:"异步任务轮询"},{value:"async_task_poll_then_final_lookup",label:"异步轮询后查询结果"},{value:"webhook_callback",label:"Webhook 回调"},{value:"runninghub_app",label:"RunningHub 应用"},{value:"runninghub_workflow",label:"RunningHub 工作流"},{value:"legacy_adapter",label:"Legacy TypeScript 适配器"}];
const frameModes: {value:FrameMode;label:string}[] = [{value:"text_only",label:"纯文本"},{value:"reference_images",label:"多参考图"},{value:"first_frame",label:"首帧"},{value:"last_frame",label:"尾帧"},{value:"first_or_last_frame",label:"首帧或尾帧"},{value:"first_last_frame",label:"首尾帧"}];
const tagGroups = [
  {label:"理解与推理",tags:[{value:"text_chat",label:"文本对话"},{value:"image_understanding",label:"图像理解"},{value:"video_understanding",label:"视频理解"},{value:"audio_understanding",label:"音频理解"},{value:"reasoning",label:"推理"},{value:"reasoning_control",label:"推理强度控制"},{value:"long_context",label:"长上下文"},{value:"web_search",label:"联网搜索"},{value:"tool_calling",label:"工具调用"},{value:"structured_output",label:"结构化输出"}]},
  {label:"图像生成",tags:[{value:"image_generation",label:"文生图"},{value:"image_to_image",label:"图生图"},{value:"image_edit",label:"图像编辑"},{value:"inpainting",label:"局部重绘"},{value:"outpainting",label:"扩图"},{value:"multi_reference_image",label:"多参考图"},{value:"character_consistency",label:"角色一致性"},{value:"transparent_background",label:"透明背景"}]},
  {label:"视频生成",tags:[{value:"video_generation",label:"文生视频"},{value:"image_to_video",label:"图生视频"},{value:"multi_reference_video",label:"多参考视频"},{value:"first_frame_video",label:"首帧视频"},{value:"last_frame_video",label:"尾帧视频"},{value:"first_last_frame_video",label:"首尾帧视频"},{value:"video_edit",label:"视频编辑"},{value:"video_extend",label:"视频延长"},{value:"native_audio",label:"原生音频"},{value:"lip_sync",label:"口型同步"}]},
  {label:"音频生成",tags:[{value:"tts",label:"语音合成"},{value:"voice_design",label:"音色设计"},{value:"voice_clone",label:"声音克隆"},{value:"music_generation",label:"音乐生成"},{value:"audio_cover",label:"音频翻唱"},{value:"audio_extend",label:"音频续写"}]},
];
function clone<T>(value:T):T{return JSON.parse(JSON.stringify(value)) as T}
const draft = reactive<RuntimeModel>(clone(props.model));
const inputs = reactive<InputCapabilities>(normalizeInputs(props.model.inputCapabilities));
const json = reactive({ inputProfile: "{}", parameterSchema: "{}", outputMapping: "{}" });
const jsonError = ref(""); const formError = ref(""); const templateAvailable = ref(false); const advancedValid = ref(true);
const capabilityName = computed(() => capabilities.find(item => item.value === draft.capability)?.label ?? "当前");
function normalizeInputs(value: Record<string, unknown>): InputCapabilities { const reference = (value.imageReference && typeof value.imageReference === "object" ? value.imageReference : {}) as Record<string, unknown>; return { prompt:value.prompt !== false, systemPrompt:value.systemPrompt === true, imageReference:{enabled:reference.enabled === true,min:Number(reference.min ?? 0),max:Number(reference.max ?? 0)}, frameModes:Array.isArray(value.frameModes) ? value.frameModes.filter(item => frameModes.some(mode => mode.value === item)) as FrameMode[] : [], mask:value.mask === true,videoReference:value.videoReference === true,audioReference:value.audioReference === true }; }
function hydrate() { Object.assign(draft, clone(props.model)); Object.assign(inputs, normalizeInputs(props.model.inputCapabilities)); Object.assign(json,{inputProfile:JSON.stringify(props.model.inputProfile,null,2),parameterSchema:JSON.stringify(props.model.parameterSchema,null,2),outputMapping:JSON.stringify(props.model.outputMapping,null,2)}); templateAvailable.value=false; jsonError.value=""; formError.value=""; advancedValid.value=true; }
function changed(){ emit("dirty"); }
function capabilityChanged(){ templateAvailable.value=true; changed(); }
function referenceChanged(){ if(!inputs.imageReference.enabled) Object.assign(inputs.imageReference,{min:0,max:0}); else if(inputs.imageReference.max===0) inputs.imageReference.max=1; changed(); }
function templateFor(capability:RuntimeModelCapability){ const base={capabilityTags:[] as string[],inputCapabilities:normalizeInputs({}),parameterSchema:{} as Record<string,unknown>}; if(capability==="text") return {...base,capabilityTags:["text_chat"],parameterSchema:{temperature:{type:"number",min:0,max:2,step:0.1,default:0.7},topP:{type:"number",min:0,max:1,step:0.05,default:1},maxTokens:{type:"integer",min:1,max:32768,default:4096}}}; if(capability==="image") return {...base,capabilityTags:["image_generation"],parameterSchema:{aspectRatio:{type:"select",options:["1:1","16:9","9:16","4:3","3:4"],default:"1:1"},size:{type:"select",options:["1024x1024","1536x1024","1024x1536"],default:"1024x1024"}}}; if(capability==="video") return {...base,capabilityTags:["video_generation"],parameterSchema:{aspectRatio:{type:"select",options:["16:9","9:16","1:1"],default:"16:9"},duration:{type:"integer",min:1,max:60,step:1,default:6},resolution:{type:"select",options:["480p","720p","1080p"],default:"720p"}}}; if(capability==="audio") return {...base,capabilityTags:["tts"],parameterSchema:{audioFormat:{type:"select",options:["wav","mp3","pcm16"],default:"wav"}}}; return base; }
function applyTemplate(){ const template=templateFor(draft.capability); draft.capabilityTags=[...template.capabilityTags]; Object.assign(inputs,template.inputCapabilities); json.parameterSchema=JSON.stringify(template.parameterSchema,null,2); templateAvailable.value=false; changed(); }
function parseObject(source:string,label:string){ let value:unknown; try{value=JSON.parse(source)}catch{throw new Error(`${label} JSON 格式不正确`)} if(!value||typeof value!=="object"||Array.isArray(value))throw new Error(`${label}必须是 JSON 对象`); return value as Record<string,unknown>; }
function jsonChanged(){ jsonError.value=""; changed(); }
function save(){ formError.value=""; if(!draft.modelId.trim()||!draft.displayName.trim()){formError.value="模型标识和显示名称不能为空";return} if(!advancedValid.value){formError.value="请先修正模型高级配置";return} if(!Number.isInteger(inputs.imageReference.min)||!Number.isInteger(inputs.imageReference.max)||inputs.imageReference.min<0||inputs.imageReference.max>16||inputs.imageReference.min>inputs.imageReference.max){formError.value="参考图数量范围必须是 0 到 16 的有效整数区间";return} try{draft.inputProfile=parseObject(json.inputProfile,"输入配置");draft.parameterSchema=parseObject(json.parameterSchema,"参数 Schema");draft.outputMapping=parseObject(json.outputMapping,"输出映射")}catch(cause){jsonError.value=cause instanceof Error?cause.message:"JSON 格式不正确";return} draft.inputCapabilities=clone(inputs) as unknown as Record<string,unknown>; emit("save",clone(draft)); }
watch(() => props.model, hydrate, { immediate:true, deep:true });
</script>

<style scoped>
.model-editor{display:grid;gap:14px;padding:2px 4px 16px}.identity-grid{display:grid;grid-template-columns:1.25fr 1.25fr .8fr .9fr 1.1fr auto;align-items:end;gap:10px}.model-editor label{display:grid;gap:5px;font-size:11px}.model-editor input,.model-editor select,.model-editor textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:5px;background:#fff;padding:8px;color:#172033;font:inherit}.check{display:flex!important;align-items:center;gap:6px;padding:8px 0;white-space:nowrap}.check input,.tag input{width:auto}.template-notice{display:flex;align-items:center;justify-content:space-between;border-left:3px solid #2563eb;background:#eff4ff;padding:9px 11px;color:#1e3a8a;font-size:11px}.template-notice button{border:1px solid #93b4ef;border-radius:5px;background:#fff;padding:5px 9px;color:#1d4ed8}.editor-section{border:1px solid #d8dee8;border-radius:6px;padding:12px}.editor-section>header{display:flex;justify-content:space-between;margin-bottom:10px}.editor-section h3{margin:0 0 3px;font-size:13px}.editor-section p{margin:0;color:var(--stars-text-muted);font-size:10px}.editor-section header>span{color:var(--stars-text-muted);font-size:10px}.tag-groups{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tag-groups fieldset,.frame-modes{display:flex;flex-wrap:wrap;gap:6px;border:1px solid #e2e7ee;padding:9px}.tag-groups legend,.frame-modes legend{padding:0 5px;color:#667085;font-size:10px}.tag{display:flex!important;align-items:center;gap:4px;border:1px solid #dde3ec;border-radius:12px;padding:4px 7px;background:#fff}.tag:has(input:checked){border-color:#8eb1ed;background:#edf3ff;color:#1d4ed8}.input-grid{display:flex;gap:18px}.reference-row{display:grid;grid-template-columns:160px 130px 130px;align-items:end;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid #e7eaf0}.frame-modes{margin-top:10px}.advanced-section{border:1px solid #d8dee8;border-radius:6px;padding:10px 12px}.advanced-section summary{cursor:pointer;font-size:12px;font-weight:600}.json-grid{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:9px;margin-top:10px}.json-grid textarea{height:150px;resize:none;font:10px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace}.error{margin:0;color:#b42318;font-size:11px}footer{display:flex;justify-content:flex-end;gap:8px}footer button{border:1px solid #cbd5e1;border-radius:5px;background:#fff;padding:8px 13px}.primary{border-color:#2563eb!important;background:#2563eb!important;color:#fff}
</style>
