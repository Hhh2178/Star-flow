// @vitest-environment jsdom
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, type Component } from "vue";

const api = vi.hoisted(() => ({
  getAiConfigOverview: vi.fn(), updateAiDeployment: vi.fn(), updateAiUseMode: vi.fn(),
  getSystemOverview: vi.fn(), updateDevelopmentSettings: vi.fn(), getSupportContact: vi.fn(), updateSupportContact: vi.fn(),
  adminErrorText: vi.fn((error: unknown, fallback: string) => (error as Error)?.message || fallback),
}));
vi.mock("../api/adminApi", () => api);
import AiConfigPage from "../pages/AiConfigPage.vue";
import SystemPage from "../pages/SystemPage.vue";

const ButtonStub=defineComponent({emits:["click"],template:'<button @click="$emit(\'click\')"><slot name="icon"/><slot/></button>'});
const SwitchStub=defineComponent({props:{value:Boolean},emits:["change"],template:'<button data-testid="switch" @click="$emit(\'change\', !value)">{{ value }}</button>'});
const InputStub=defineComponent({props:["modelValue"],emits:["update:modelValue"],template:'<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'});
const common={"t-button":ButtonStub,"t-switch":SwitchStub,"t-tag":{template:"<span><slot/></span>"},"t-segmented-control":{props:["value"],emits:["change"],template:'<button data-testid="mode" @click="$emit(\'change\', value === \'0\' ? \'1\' : \'0\')">mode</button>'},"t-dialog":{template:"<div><slot/></div>"},"t-input":InputStub,"t-input-number":{template:"<input type='number'/>"},"t-select":{template:"<select/>"},"i-refresh":{template:"<i/>"},"i-edit":{template:"<i/>"},"i-loading-three":{template:"<i/>"}};
const deployment={id:1,name:"剧本 Agent",description:"剧本规划",vendorId:"provider-a",model:"Text A",modelName:"text-a",temperature:.7,maxOutputTokens:2048,disabled:false,configured:true};
let wrapper:VueWrapper|undefined;
async function mountPage(component:Component){wrapper=mount(component,{global:{stubs:common}});await flushPromises();return wrapper}

describe("admin settings pages",()=>{
  beforeEach(()=>{vi.clearAllMocks();api.updateAiUseMode.mockResolvedValue({agentUseMode:"1"});api.updateDevelopmentSettings.mockResolvedValue({aiDevToolsEnabled:true});api.getSystemOverview.mockResolvedValue({database:{tables:[{name:"o_user",rowCount:3}]},development:{aiDevToolsEnabled:false},runtime:{nodeVersion:"v22",platform:"win32",environment:"dev"},capabilities:{updateDevelopment:true,clearDatabase:false,importDatabase:false,exportDatabase:false}});api.getSupportContact.mockResolvedValue({enabled:false,type:"wechat",title:"联系支持",wechatId:"",qrCodeUrl:null,description:""});api.updateSupportContact.mockResolvedValue({enabled:true,type:"wechat",title:"联系支持",wechatId:"support-id",qrCodeUrl:"/oss/support/qr.png",description:"工作日"})});
  afterEach(()=>wrapper?.unmount());
  it("普通 Admin 只读查看 AI 配置",async()=>{api.getAiConfigOverview.mockResolvedValue({useMode:"0",deployments:[deployment],capabilities:{read:true,update:false}});const page=await mountPage(AiConfigPage);expect(page.text()).toContain("当前账号仅可查看");expect(page.find('[data-testid="mode"]').exists()).toBe(false);expect(page.text()).not.toContain("编辑")});
  it("Super Admin 可以切换 AI 模式",async()=>{api.getAiConfigOverview.mockResolvedValue({useMode:"0",deployments:[deployment],capabilities:{read:true,update:true}});const page=await mountPage(AiConfigPage);await page.get('[data-testid="mode"]').trigger("click");await flushPromises();expect(api.updateAiUseMode).toHaveBeenCalledWith("1")});
  it("系统页显示运行状态并更新开发开关",async()=>{const page=await mountPage(SystemPage);expect(page.text()).toContain("o_user");expect(page.text()).toContain("v22");await page.get('[data-testid="switch"]').trigger("click");await flushPromises();expect(api.updateDevelopmentSettings).toHaveBeenCalledWith(true)});
  it("Super Admin 在系统页保存公开支持联系方式",async()=>{const page=await mountPage(SystemPage);await page.get('[data-testid="support-enabled"]').trigger("click");await page.get<HTMLInputElement>('[data-testid="support-wechat-id"]').setValue("support-id");await page.get<HTMLInputElement>('[data-testid="support-qr-asset-id"]').setValue("support/qr.png");await page.get('[data-testid="save-support-contact"]').trigger("click");await flushPromises();expect(api.updateSupportContact).toHaveBeenCalledWith({enabled:true,type:"wechat",title:"联系支持",wechatId:"support-id",qrAssetId:"support/qr.png",description:""});expect(page.text()).toContain("联系支持配置已保存")});
});
