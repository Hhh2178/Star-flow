<template>
  <section class="json-editor">
    <header><div><strong>{{ label }}</strong><small>仅支持声明式 JSON，敏感凭据与可执行表达式会被拒绝。</small></div><span :class="['state', error ? 'invalid' : 'valid']">{{ error ? '需要修正' : '格式有效' }}</span></header>
    <textarea v-model="source" data-testid="advanced-json-input" :disabled="!canUpdate" spellcheck="false" @input="onInput" />
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="actions">
      <button data-testid="advanced-json-format" type="button" :disabled="!canUpdate" @click="format">格式化</button>
      <button data-testid="advanced-json-validate" type="button" @click="validateSource">验证</button>
      <button data-testid="advanced-json-preview" type="button" @click="showPreview = !showPreview">{{ showPreview ? '收起预览' : '合并预览' }}</button>
      <button v-if="canUpdate" data-testid="advanced-json-reset" class="danger" type="button" @click="reset">重置</button>
    </div>
    <pre v-if="showPreview" data-testid="advanced-json-merged-preview">{{ mergedPreview }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = withDefaults(defineProps<{ modelValue: Record<string, unknown>; baseValue?: Record<string, unknown>; label: string; canUpdate: boolean }>(), { baseValue: () => ({}) });
const emit = defineEmits<{ "update:modelValue": [value: Record<string, unknown>]; dirty: []; validity: [valid: boolean] }>();
const source = ref("{}");
const error = ref("");
const showPreview = ref(false);
const allowedSections = new Set(["request", "response", "polling", "finalLookup"]);
const sensitiveKey = /(^|[_-])(api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret|credential)([_-]|$)/i;
const executableText = /\$\{|\{\{|=>|\bfunction\s*\(|`/;

function isObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function inspect(value: unknown, path: string, depth = 0, state = { keys: 0 }): void {
  if (depth > 8) throw new Error("高级配置层级不能超过 8 层");
  if (typeof value === "string") { if (executableText.test(value)) throw new Error(`${path} 不能包含可执行表达式`); return; }
  if (value === null || typeof value === "number" || typeof value === "boolean") return;
  if (Array.isArray(value)) { value.forEach((item, index) => inspect(item, `${path}.${index}`, depth + 1, state)); return; }
  if (!isObject(value)) throw new Error(`${path} 必须是 JSON 对象`);
  for (const [key, item] of Object.entries(value)) {
    state.keys += 1;
    if (state.keys > 200) throw new Error("高级配置字段数量超出限制");
    if (sensitiveKey.test(key)) throw new Error(`${path}.${key} 不能保存敏感凭据`);
    inspect(item, `${path}.${key}`, depth + 1, state);
  }
}
function parseAndValidate(): Record<string, unknown> {
  let value: unknown;
  try { value = JSON.parse(source.value); } catch { throw new Error("JSON 格式不正确，请检查括号、引号和逗号"); }
  if (!isObject(value)) throw new Error("高级配置必须是 JSON 对象");
  for (const key of Object.keys(value)) if (!allowedSections.has(key)) throw new Error(`不支持的高级配置区域：${key}`);
  inspect(value, "advancedConfig");
  const polling = isObject(value.polling) ? value.polling : null;
  if (polling) {
    const interval = polling.intervalMs === undefined ? undefined : Number(polling.intervalMs);
    const timeout = polling.timeoutMs === undefined ? undefined : Number(polling.timeoutMs);
    if (interval !== undefined && (!Number.isInteger(interval) || interval < 250 || interval > 60000)) throw new Error("轮询间隔必须在 250 到 60000 毫秒之间");
    if (timeout !== undefined && (!Number.isInteger(timeout) || timeout < 1000 || timeout > 1800000)) throw new Error("轮询超时必须在 1000 到 1800000 毫秒之间");
  }
  return value;
}
function validateSource() { try { const value = parseAndValidate(); error.value = ""; emit("update:modelValue", value); emit("validity", true); return true; } catch (cause) { error.value = cause instanceof Error ? cause.message : "高级配置无效"; emit("validity", false); return false; } }
function onInput() { emit("dirty"); validateSource(); }
function format() { if (!validateSource()) return; source.value = JSON.stringify(JSON.parse(source.value), null, 2); }
function reset() { if (!window.confirm(`确定重置${props.label}吗？`)) return; source.value = "{}"; error.value = ""; emit("update:modelValue", {}); emit("validity", true); emit("dirty"); }
function merge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> { const result = clone(base); for (const [key, value] of Object.entries(override)) result[key] = isObject(value) && isObject(result[key]) ? merge(result[key] as Record<string, unknown>, value) : clone(value); return result; }
function redact(value: unknown): unknown { if (Array.isArray(value)) return value.map(redact); if (!isObject(value)) return value; return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitiveKey.test(key) ? "[已隐藏]" : redact(item)])); }
const mergedPreview = computed(() => { let current: Record<string, unknown> = {}; try { const parsed = JSON.parse(source.value); if (isObject(parsed)) current = parsed; } catch { /* invalid drafts preview as empty */ } return JSON.stringify(redact(merge(props.baseValue, current)), null, 2); });
watch(() => props.modelValue, (value) => { source.value = JSON.stringify(value ?? {}, null, 2); error.value = ""; }, { immediate: true, deep: true });
</script>

<style scoped>
.json-editor{display:grid;gap:9px;padding:12px;border:1px solid #d8dee8;border-radius:6px;background:#fafbfc}.json-editor header{display:flex;justify-content:space-between;gap:12px}.json-editor header div{display:grid;gap:3px}.json-editor strong{font-size:12px}.json-editor small{color:var(--stars-text-muted);font-size:10px}.state{height:20px;padding:2px 7px;border-radius:10px;background:#e8efff;color:#1d4ed8;font-size:10px}.state.invalid{background:#fff0f0;color:#b42318}textarea{width:100%;height:190px;resize:none;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:5px;background:#fff;padding:10px;color:#172033;font:11px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.actions{display:flex;gap:7px}.actions button{border:1px solid #cbd5e1;border-radius:5px;background:#fff;padding:6px 10px;color:#344054;cursor:pointer}.actions .danger{margin-left:auto;color:#b42318}.error{margin:0;color:#b42318;font-size:11px}pre{max-height:220px;margin:0;overflow:auto;border:1px solid #d8dee8;border-radius:5px;background:#111827;padding:10px;color:#dbeafe;font:11px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap}
</style>
