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
              <td><strong>{{ provider.name }}</strong><small>#{{ providerDisplayId(provider.id) }}</small></td>
              <td><t-tag :theme="provider.configured ? 'success' : 'warning'" variant="light">{{ provider.configured ? "完整" : "待配置" }}</t-tag></td>
              <td><span class="tag-list"><t-tag v-for="item in provider.modelTypes" :key="item.type" variant="light">{{ typeLabel(item.type) }} {{ item.count }}</t-tag></span></td>
              <td><span class="model-list"><span v-for="model in provider.models" :key="`${model.type}:${model.modelName}`"><span class="model-name">{{ model.name }}<small>{{ typeLabel(model.type) }}<template v-if="overview.capabilities.update"> · {{ pricingLabel(pricingFor(provider.id, model.modelName)) }}</template></small></span><t-button v-if="overview.capabilities.update" data-testid="open-pricing" size="small" variant="text" @click="openPricing(provider, model)"><template #icon><i-edit theme="outline" /></template>计价</t-button></span></span></td>
              <td><t-switch v-if="overview.capabilities.update" :value="provider.enabled" :loading="savingId === provider.id" @change="(value) => changeEnabled(provider.id, value)" /><t-tag v-else :theme="provider.enabled ? 'success' : 'default'" variant="light">{{ provider.enabled ? "已启用" : "已停用" }}</t-tag></td>
              <td v-if="overview.capabilities.update"><span class="action-list"><t-button data-testid="open-connection-test" size="small" variant="outline" :disabled="!provider.configured || provider.models.length === 0" @click="openConnectionTest(provider)"><template #icon><i-play-circle theme="outline" /></template>连接测试</t-button><t-button size="small" variant="outline" @click="openCredentials(provider)"><template #icon><i-key theme="outline" /></template>配置凭据</t-button></span></td>
            </tr></tbody>
          </table>
        </div>
      </section>
    </template>
    <t-dialog v-model:visible="credentialVisible" :header="`${credentialProvider?.name || ''} 凭据`" :footer="false" :close-on-overlay-click="false"><div class="credential-form"><label v-for="input in credentialProvider?.inputs || []" :key="input.key"><span>{{ input.label }}<small>{{ input.required ? "必填" : "选填" }} · {{ input.configured ? "已配置" : "未配置" }}</small></span><t-input v-model="credentialValues[input.key]" :type="input.type === 'password' ? 'password' : 'text'" :placeholder="input.configured ? '输入新值以替换' : '输入配置值'" /></label><p v-if="credentialError" class="field-error" role="alert">{{ credentialError }}</p><div class="dialog-actions"><t-button variant="outline" @click="credentialVisible=false">取消</t-button><t-button :loading="savingCredentials" @click="saveCredentials">保存</t-button></div></div></t-dialog>
    <t-dialog v-model:visible="connectionVisible" :header="`${connectionProvider?.name || ''} 连接测试`" :footer="false" :close-on-overlay-click="false"><div class="connection-form"><label><span>测试模型</span><t-select v-model="connectionModel" :options="connectionOptions" /></label><p>仅检查鉴权、API 地址和模型可用性，不会创建图片或视频任务。</p><div class="dialog-actions"><t-button variant="outline" @click="connectionVisible=false">取消</t-button><t-button data-testid="run-connection-test" :disabled="!connectionModel" :loading="Boolean(testingModel)" @click="testModel"><template #icon><i-play-circle theme="outline" /></template>开始测试</t-button></div></div></t-dialog>
    <t-dialog v-model:visible="pricingVisible" :header="`${pricingModel?.name || ''} 计价`" :footer="false" :close-on-overlay-click="false"><div class="pricing-form"><label><span>计价方式</span><t-select data-testid="pricing-mode" v-model="pricingForm.billingMode" :options="billingModeOptions" /></label><label v-if="pricingForm.billingMode==='per_request'"><span>每次价格（元）</span><t-input data-testid="pricing-request-price" v-model="pricingForm.requestPrice" inputmode="decimal" /></label><label v-if="pricingForm.billingMode==='per_second'"><span>每秒价格（元）</span><t-input data-testid="pricing-second-price" v-model="pricingForm.secondPrice" inputmode="decimal" /></label><template v-if="pricingForm.billingMode==='per_token'"><label><span>输入每百万 Token（元）</span><t-input data-testid="pricing-input-token-price" v-model="pricingForm.inputPricePerMillion" inputmode="decimal" /></label><label><span>输出每百万 Token（元）</span><t-input data-testid="pricing-output-token-price" v-model="pricingForm.outputPricePerMillion" inputmode="decimal" /></label><label><span>用量缺失回退价（元/次）</span><t-input data-testid="pricing-fallback-price" v-model="pricingForm.fallbackRequestPrice" inputmode="decimal" /></label></template><p v-if="pricingError" class="field-error" role="alert">{{ pricingError }}</p><div class="dialog-actions"><t-button variant="outline" @click="pricingVisible=false">取消</t-button><t-button data-testid="save-pricing" :loading="savingPricing" @click="savePricing">保存计价</t-button></div></div></t-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import ErrorState from "../components/ErrorState.vue";
import { adminErrorText, getModelPricing, getProviderOverview, testProviderConnection, updateModelPricing, updateProvider, type ModelPricing, type ProviderOverview, type UpdatePricingInput } from "../api/adminApi";

const emptyOverview = (): ProviderOverview => ({ providers: [], capabilities: { read: true, update: false } });
const overview = ref(emptyOverview());
const loading = ref(true); const refreshing = ref(false); const loadError = ref("");
const savingId = ref(""); const operationMessage = ref(""); const operationFailed = ref(false);
const testingModel = ref("");
type Provider = ProviderOverview["providers"][number];
const credentialVisible=ref(false);const credentialProvider=ref<Provider|null>(null);const credentialValues=reactive<Record<string,string>>({});const credentialError=ref("");const savingCredentials=ref(false);
const connectionVisible=ref(false);const connectionProvider=ref<Provider|null>(null);const connectionModel=ref("");
const prices=ref<ModelPricing[]>([]);const pricingVisible=ref(false);const pricingProvider=ref<Provider|null>(null);const pricingModel=ref<Provider["models"][number]|null>(null);const pricingError=ref("");const savingPricing=ref(false);
const pricingForm=reactive({billingMode:"per_request" as ModelPricing["billingMode"],requestPrice:"",secondPrice:"",inputPricePerMillion:"",outputPricePerMillion:"",fallbackRequestPrice:""});
const billingModeOptions=[{label:"按次计费",value:"per_request"},{label:"按秒计费",value:"per_second"},{label:"Token 计费",value:"per_token"}];
const connectionOptions=computed(()=>(connectionProvider.value?.models||[]).map((model)=>({label:`${model.name} · ${typeLabel(model.type)}`,value:model.modelName})));
const labels: Record<string, string> = { text: "文本", image: "图片", video: "视频" };
const typeLabel = (type: string) => labels[type] || type;
const providerDisplayId = (id: string) => id === "toonflow" ? "stars-flow-service" : id;
const pricingFor=(providerId:string,modelId:string)=>prices.value.find((item)=>item.providerId===providerId&&item.modelId===modelId)||null;
function pricingLabel(item:ModelPricing|null){if(!item)return"未配置";if(item.billingMode==="per_request")return`¥${Number(item.requestPrice||0).toFixed(6)}/次`;if(item.billingMode==="per_second")return`¥${Number(item.secondPrice||0).toFixed(6)}/秒`;return"按 Token"}

async function load(silent = false) {
  if (silent) refreshing.value = true; else loading.value = true;
  loadError.value = "";
  try { overview.value = await getProviderOverview(); prices.value=overview.value.capabilities.update?(await getModelPricing()).items:[]; }
  catch (cause) { loadError.value = adminErrorText(cause, "Provider 状态加载失败"); }
  finally { loading.value = false; refreshing.value = false; }
}
async function changeEnabled(id: string, value: unknown) {
  const enabled = value === true;
  savingId.value = id; operationMessage.value = ""; operationFailed.value = false;
  try { await updateProvider({ id, enabled }); await load(true); operationMessage.value = enabled ? "Provider 已启用" : "Provider 已停用"; }
  catch (cause) { operationFailed.value = true; operationMessage.value = adminErrorText(cause, "Provider 状态更新失败"); }
  finally { savingId.value = ""; }
}
function openConnectionTest(provider: Provider) {
  connectionProvider.value = provider;
  connectionModel.value = provider.models[0]?.modelName || "";
  connectionVisible.value = true;
}
async function testModel() {
  const provider = connectionProvider.value;
  const model = provider?.models.find((item) => item.modelName === connectionModel.value);
  if (!provider || !model) return;
  testingModel.value = `${provider.id}:${model.modelName}`;
  operationMessage.value = "";
  operationFailed.value = false;
  try {
    const result = await testProviderConnection({ id: provider.id, modelName: model.modelName });
    operationMessage.value = `${model.name} 连接正常 · ${result.latencyMs} ms`;
    connectionVisible.value = false;
  } catch (cause) {
    operationFailed.value = true;
    operationMessage.value = adminErrorText(cause, `${model.name} 连接测试失败`);
  } finally {
    testingModel.value = "";
  }
}
function openCredentials(provider:Provider){credentialProvider.value=provider;credentialError.value="";for(const key of Object.keys(credentialValues))delete credentialValues[key];for(const input of provider.inputs)credentialValues[input.key]="";credentialVisible.value=true}
async function saveCredentials(){if(!credentialProvider.value)return;const inputValues=Object.fromEntries(Object.entries(credentialValues).map(([key,value])=>[key,value.trim()]).filter(([,value])=>value));if(Object.keys(inputValues).length===0){credentialError.value="请至少填写一个需要更新的字段";return}savingCredentials.value=true;credentialError.value="";try{await updateProvider({id:credentialProvider.value.id,inputValues});credentialVisible.value=false;await load(true);operationFailed.value=false;operationMessage.value="Provider 凭据已更新"}catch(cause){credentialError.value=adminErrorText(cause,"Provider 凭据更新失败")}finally{savingCredentials.value=false}}
function openPricing(provider:Provider,model:Provider["models"][number]){pricingProvider.value=provider;pricingModel.value=model;pricingError.value="";const current=pricingFor(provider.id,model.modelName);pricingForm.billingMode=current?.billingMode||"per_request";pricingForm.requestPrice=current?.requestPrice?.toString()||"";pricingForm.secondPrice=current?.secondPrice?.toString()||"";pricingForm.inputPricePerMillion=current?.inputPricePerMillion?.toString()||"";pricingForm.outputPricePerMillion=current?.outputPricePerMillion?.toString()||"";pricingForm.fallbackRequestPrice=current?.fallbackRequestPrice?.toString()||"";pricingVisible.value=true}
function priceValue(raw:string){const value=Number(raw.trim());return Number.isFinite(value)&&value>=0&&/^\d+(?:\.\d{1,6})?$/.test(raw.trim())?value:null}
async function savePricing(){if(!pricingProvider.value||!pricingModel.value)return;const base={providerId:pricingProvider.value.id,modelId:pricingModel.value.modelName,taskType:pricingModel.value.type as "text"|"image"|"video",billingMode:pricingForm.billingMode,currency:"CNY" as const};let payload:UpdatePricingInput;if(pricingForm.billingMode==="per_request"){if(!pricingForm.requestPrice.trim()){pricingError.value="请填写每次价格";return}const value=priceValue(pricingForm.requestPrice);if(value===null){pricingError.value="价格必须为非负数且最多保留 6 位小数";return}payload={...base,billingMode:"per_request",requestPrice:value}}else if(pricingForm.billingMode==="per_second"){if(!pricingForm.secondPrice.trim()){pricingError.value="请填写每秒价格";return}const value=priceValue(pricingForm.secondPrice);if(value===null){pricingError.value="价格必须为非负数且最多保留 6 位小数";return}payload={...base,billingMode:"per_second",secondPrice:value}}else{if(!pricingForm.inputPricePerMillion.trim()||!pricingForm.outputPricePerMillion.trim()||!pricingForm.fallbackRequestPrice.trim()){pricingError.value="请完整填写 Token 价格和回退价";return}const input=priceValue(pricingForm.inputPricePerMillion),output=priceValue(pricingForm.outputPricePerMillion),fallback=priceValue(pricingForm.fallbackRequestPrice);if(input===null||output===null||fallback===null){pricingError.value="价格必须为非负数且最多保留 6 位小数";return}payload={...base,billingMode:"per_token",inputPricePerMillion:input,outputPricePerMillion:output,fallbackRequestPrice:fallback}}savingPricing.value=true;pricingError.value="";try{await updateModelPricing(payload);pricingVisible.value=false;await load(true);operationMessage.value="模型计价已更新";operationFailed.value=false}catch(cause){pricingError.value=adminErrorText(cause,"模型计价更新失败")}finally{savingPricing.value=false}}
onMounted(() => load());
</script>

<style scoped lang="scss">
.admin-page{width:min(100%,1200px);margin:0 auto}.readonly-note,.operation-message{margin:0 0 12px;padding:9px 12px;border-left:3px solid var(--stars-brand);background:#fff;color:var(--stars-text-muted);font-size:12px}.operation-message.error{border-color:#dc2626;color:#b91c1c}.data-section{border:1px solid var(--stars-border);border-radius:6px;background:#fff}.section-heading{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--stars-border)}.section-heading h2{margin:0;font-size:14px}.section-heading span{color:var(--stars-text-muted);font-size:12px}.table-scroll{overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:11px 14px;border-bottom:1px solid var(--stars-border);text-align:left;vertical-align:top}th{color:var(--stars-text-muted);font-weight:500}td strong,td>small{display:block}td>small,.model-list small{margin-top:3px;color:var(--stars-text-muted)}.tag-list,.action-list{display:flex;gap:5px;flex-wrap:wrap}.model-list{display:grid;gap:5px;min-width:280px}.model-list>span{display:flex;align-items:center;justify-content:space-between;gap:12px}.model-name{display:grid;min-width:0;gap:2px}.model-name small{flex:none}.credential-form,.connection-form,.pricing-form{display:grid;gap:12px}.credential-form label,.connection-form label,.pricing-form label{display:grid;gap:6px}.credential-form label>span,.connection-form label>span,.pricing-form label>span{display:flex;justify-content:space-between;font-size:12px}.credential-form small,.connection-form p{color:var(--stars-text-muted)}.connection-form p{margin:0;font-size:12px}.field-error{margin:0;color:#b91c1c;font-size:12px}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:6px}@media(max-width:640px){th,td{padding:9px 10px}}
</style>
