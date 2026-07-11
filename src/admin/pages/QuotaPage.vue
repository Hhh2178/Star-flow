<template>
  <section class="admin-page quota-page">
    <PageHeader title="额度与充值" description="查看分组余额、累计充值、累计用量与额度流水">
      <template #actions>
        <span class="payment-status">在线支付未开放</span>
        <t-button variant="outline" :loading="refreshing" :disabled="refreshing" @click="loadOverview(true)">
          <template #icon><i-refresh theme="outline" /></template>刷新
        </t-button>
        <t-button v-if="isSuperAdmin" data-testid="open-adjustment" @click="openAdjustment">
          <template #icon><i-add theme="outline" /></template>手工调额
        </t-button>
      </template>
    </PageHeader>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="loadError" :message="loadError" retryable @retry="loadOverview()" />
    <template v-else>
      <section class="summary-strip" aria-label="额度汇总">
        <div><span>当前余额</span><strong>{{ formatMoney(overview.summary.balance) }}</strong></div>
        <div><span>累计充值</span><strong>{{ formatMoney(overview.summary.totalRecharge) }}</strong></div>
        <div><span>累计用量</span><strong>{{ formatMoney(overview.summary.totalUsage) }}</strong></div>
      </section>

      <p v-if="!isSuperAdmin" class="readonly-note">额度仅供查看，手工调额由超级管理员执行。</p>
      <p v-if="operationMessage" class="operation-message" :class="{ error: operationFailed }" role="status">{{ operationMessage }}</p>

      <section class="data-section" aria-labelledby="group-quota-title">
        <div class="section-heading"><h2 id="group-quota-title">分组额度</h2><span>{{ overview.groups.length }} 个分组</span></div>
        <EmptyState v-if="overview.groups.length === 0" text="暂无分组额度" />
        <div v-else class="table-scroll">
          <table>
            <thead><tr><th>分组</th><th>余额</th><th>累计充值</th><th>累计用量</th></tr></thead>
            <tbody><tr v-for="group in overview.groups" :key="group.groupId"><td><strong>{{ group.groupName }}</strong><small>#{{ group.groupId }}</small></td><td>{{ formatMoney(group.balance) }}</td><td>{{ formatMoney(group.totalRecharge) }}</td><td>{{ formatMoney(group.totalUsage) }}</td></tr></tbody>
          </table>
        </div>
      </section>

      <section class="data-section" aria-labelledby="ledger-title">
        <div class="section-heading"><h2 id="ledger-title">额度流水</h2><span>最近 200 条</span></div>
        <EmptyState v-if="overview.logs.length === 0" text="暂无额度流水" />
        <div v-else class="table-scroll">
          <table class="ledger-table">
            <thead><tr><th>时间</th><th>分组</th><th>类型</th><th>变动</th><th>变动前</th><th>变动后</th><th>操作人</th><th>原因</th></tr></thead>
            <tbody>
              <tr v-for="item in overview.logs" :key="item.id">
                <td>{{ formatAdminDate(item.createdAt) }}</td><td>#{{ item.groupId }}</td><td>{{ entryTypeLabels[item.entryType] || item.entryType }}</td>
                <td :class="item.amount < 0 ? 'negative' : 'positive'">{{ item.amount > 0 ? "+" : "" }}{{ formatMoney(item.amount) }}</td>
                <td>{{ formatMoney(item.balanceBefore) }}</td><td>{{ formatMoney(item.balanceAfter) }}</td><td>{{ item.actorUserId === null ? "-" : `#${item.actorUserId}` }}</td><td>{{ item.reason }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <t-dialog v-model:visible="adjustmentVisible" header="手工调整额度" :footer="false" :close-on-overlay-click="false">
      <div class="dialog-form">
        <label><span>分组</span><t-select data-testid="adjustment-group" v-model="adjustment.groupId" :options="groupOptions" /></label>
        <label><span>调整类型</span><t-select data-testid="adjustment-type" v-model="adjustment.entryType" :options="entryTypeOptions" /></label>
        <label><span>金额</span><t-input data-testid="adjustment-amount" v-model="adjustment.amount" inputmode="decimal" placeholder="正数，最多 6 位小数" /></label>
        <label><span>原因</span><t-input data-testid="adjustment-reason" v-model="adjustment.reason" maxlength="500" placeholder="至少 2 个字符" /></label>
        <p v-if="adjustmentError" class="field-error" role="alert">{{ adjustmentError }}</p>
        <div class="dialog-actions">
          <t-button variant="outline" :disabled="adjusting" @click="adjustmentVisible = false">取消</t-button>
          <t-button data-testid="submit-adjustment" :loading="adjusting" :disabled="adjusting" @click="submitAdjustment">确认调整</t-button>
        </div>
      </div>
    </t-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { storeToRefs } from "pinia";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import ErrorState from "../components/ErrorState.vue";
import { formatAdminDate } from "../components/adminDate";
import { useAdminSessionStore } from "../session";
import {
  adjustQuota,
  adminErrorText,
  getQuotaOverview,
  type QuotaAdjustmentInput,
  type QuotaEntryType,
  type QuotaOverview,
} from "../api/adminApi";

const emptyOverview = (): QuotaOverview => ({ summary: { balance: 0, totalRecharge: 0, totalUsage: 0 }, groups: [], logs: [] });
const entryTypeLabels: Record<QuotaEntryType, string> = {
  manual_topup: "手工充值", manual_credit: "手工加额", manual_debit: "手工扣减", usage_debit: "用量扣减",
};
const entryTypeOptions = [
  { label: "手工充值", value: "manual_topup" },
  { label: "手工加额", value: "manual_credit" },
  { label: "手工扣减", value: "manual_debit" },
];

const sessionStore = useAdminSessionStore();
const { session } = storeToRefs(sessionStore);
const isSuperAdmin = computed(() => session.value?.role === "super_admin");
const overview = ref<QuotaOverview>(emptyOverview());
const loading = ref(true);
const refreshing = ref(false);
const loadError = ref("");
const operationMessage = ref("");
const operationFailed = ref(false);
const adjustmentVisible = ref(false);
const adjusting = ref(false);
const adjustmentError = ref("");
const adjustment = reactive<{ groupId: number | ""; entryType: QuotaAdjustmentInput["entryType"]; amount: string; reason: string }>({
  groupId: "", entryType: "manual_topup", amount: "", reason: "",
});

const groupOptions = computed(() => overview.value.groups.map((group) => ({ label: group.groupName, value: group.groupId })));

function formatMoney(value: number) {
  return Number(value || 0).toFixed(6);
}

async function loadOverview(silent = false) {
  if (silent) refreshing.value = true;
  else loading.value = true;
  loadError.value = "";
  try {
    overview.value = await getQuotaOverview();
  } catch (cause) {
    loadError.value = adminErrorText(cause, "额度加载失败");
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

function openAdjustment() {
  adjustment.groupId = overview.value.groups[0]?.groupId ?? "";
  adjustment.entryType = "manual_topup";
  adjustment.amount = "";
  adjustment.reason = "";
  adjustmentError.value = "";
  adjustmentVisible.value = true;
}

function validateAdjustment(normalizedAmount: string) {
  if (!adjustment.groupId) return "请选择分组";
  if (!/^\d+(?:\.\d+)?$/.test(normalizedAmount) || Number(normalizedAmount) <= 0) return "调整金额必须大于零";
  if ((normalizedAmount.split(".")[1]?.length ?? 0) > 6) return "调整金额最多保留 6 位小数";
  if (Number(normalizedAmount) > 1_000_000_000) return "调整金额不能超过 1000000000";
  const reasonLength = adjustment.reason.trim().length;
  if (reasonLength < 2) return "调整原因至少 2 个字符";
  if (reasonLength > 500) return "调整原因不能超过 500 个字符";
  return "";
}

async function submitAdjustment() {
  const normalizedAmount = adjustment.amount.trim();
  const validation = validateAdjustment(normalizedAmount);
  if (validation) {
    adjustmentError.value = validation;
    return;
  }
  adjusting.value = true;
  adjustmentError.value = "";
  try {
    await adjustQuota({
      groupId: Number(adjustment.groupId),
      entryType: adjustment.entryType,
      amount: Number(normalizedAmount),
      reason: adjustment.reason.trim(),
    });
    adjustmentVisible.value = false;
    operationFailed.value = false;
    operationMessage.value = "额度调整成功";
    await loadOverview(true);
  } catch (cause) {
    adjustmentError.value = adminErrorText(cause, "额度调整失败");
  } finally {
    adjusting.value = false;
  }
}

onMounted(() => void loadOverview());
</script>

<style scoped lang="scss">
.admin-page { width: min(100%, 1240px); margin: 0 auto; }
.payment-status { display: inline-flex; min-height: 32px; align-items: center; padding: 0 9px; border: 1px solid var(--stars-border); border-radius: 5px; color: var(--stars-text-muted); font-size: 12px; white-space: nowrap; }
.summary-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 12px; border: 1px solid var(--stars-border); border-radius: 6px; background: #fff; }
.summary-strip div { display: grid; gap: 5px; padding: 12px 14px; border-right: 1px solid var(--stars-border); }
.summary-strip div:last-child { border-right: 0; }
.summary-strip span { color: var(--stars-text-muted); font-size: 12px; }
.summary-strip strong { color: var(--stars-text); font-size: 17px; font-variant-numeric: tabular-nums; }
.readonly-note, .operation-message { margin: 0 0 12px; padding: 8px 10px; border: 1px solid var(--stars-border); border-radius: 5px; background: #fff; color: var(--stars-text-muted); font-size: 12px; }
.operation-message { color: var(--stars-completed); }
.operation-message.error, .field-error { color: #b42318; }
.data-section { margin-bottom: 14px; border: 1px solid var(--stars-border); border-radius: 6px; background: #fff; }
.section-heading { display: flex; min-height: 42px; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--stars-border); }
.section-heading h2 { margin: 0; color: var(--stars-text); font-size: 14px; letter-spacing: 0; }
.section-heading span { color: var(--stars-text-muted); font-size: 11px; }
.table-scroll { overflow-x: auto; }
table { width: 100%; min-width: 620px; border-collapse: collapse; font-size: 12px; }
.ledger-table { min-width: 900px; }
th { padding: 8px 10px; background: var(--stars-surface-muted); color: var(--stars-text-muted); font-weight: 600; text-align: left; white-space: nowrap; }
td { padding: 8px 10px; border-top: 1px solid var(--stars-border); color: var(--stars-text); }
td small { display: block; margin-top: 2px; color: var(--stars-text-muted); }
.positive { color: var(--stars-completed); }.negative { color: #b42318; }
.dialog-form { display: grid; gap: 12px; }
.dialog-form label { display: grid; gap: 5px; color: var(--stars-text-muted); font-size: 12px; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }
.field-error { margin: 0; font-size: 12px; }
@media (max-width: 620px) { .summary-strip { grid-template-columns: 1fr; } .summary-strip div { border-right: 0; border-bottom: 1px solid var(--stars-border); } .summary-strip div:last-child { border-bottom: 0; } }
</style>
