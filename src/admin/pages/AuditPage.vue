<template>
  <section class="admin-page audit-page">
    <PageHeader title="审计日志" description="查看权限范围内的关键运营操作与执行结果">
      <template #actions>
        <label v-if="isSuperAdmin" class="group-filter">
          <span>分组</span>
          <t-select
            v-model="selectedGroupId"
            data-testid="audit-group-filter"
            :options="groupOptions"
            @change="handleGroupChange"
          />
        </label>
        <t-button
          data-testid="refresh-audit"
          variant="outline"
          :loading="refreshing"
          :disabled="refreshing"
          @click="loadAudit(true)"
        >
          <template #icon><i-refresh theme="outline" /></template>刷新
        </t-button>
      </template>
    </PageHeader>

    <section class="data-section" aria-labelledby="audit-table-title">
      <div class="section-heading">
        <h2 id="audit-table-title">操作记录</h2>
        <span>共 {{ result.total }} 条</span>
      </div>
      <LoadingState v-if="loading" text="加载审计日志..." />
      <ErrorState v-else-if="loadError" :message="loadError" retryable @retry="loadAudit()" />
      <EmptyState v-else-if="result.items.length === 0" text="暂无审计日志" />
      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr><th>时间</th><th>操作人</th><th>分组</th><th>操作</th><th>目标</th><th>摘要</th><th>结果</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in result.items" :key="item.id">
              <td>{{ formatDate(item.createdAt) }}</td>
              <td><strong>#{{ item.actorUserId }}</strong><small>{{ item.actorRoleLabel }}</small></td>
              <td>{{ item.groupId === null ? "-" : `#${item.groupId}` }}</td>
              <td>{{ item.actionLabel }}</td>
              <td>{{ formatTarget(item) }}</td>
              <td>
                <div class="summary-list">
                  <span v-for="entry in safeSummary(item.summary)" :key="entry.key">
                    {{ entry.label }}：{{ entry.value }}
                  </span>
                  <span v-if="safeSummary(item.summary).length === 0">-</span>
                </div>
              </td>
              <td><span class="result-text" :class="{ failed: item.result !== 'success' }">{{ item.resultLabel }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer v-if="!loading && !loadError" class="pagination" aria-label="审计日志分页">
        <t-button
          data-testid="previous-page"
          variant="outline"
          size="small"
          :disabled="page <= 1"
          @click="changePage(page - 1)"
        >
          <template #icon><i-left theme="outline" /></template>上一页
        </t-button>
        <span data-testid="audit-page-indicator">第 {{ page }} / {{ totalPages }} 页</span>
        <t-button
          data-testid="next-page"
          variant="outline"
          size="small"
          :disabled="page >= totalPages"
          @click="changePage(page + 1)"
        >
          下一页<template #icon><i-right theme="outline" /></template>
        </t-button>
      </footer>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import ErrorState from "../components/ErrorState.vue";
import { useAdminSessionStore } from "../session";
import {
  adminErrorText,
  listAudit,
  listGroups,
  type AuditItem,
  type AuditListResult,
  type AuditScalar,
  type GroupDto,
} from "../api/adminApi";

const PAGE_SIZE = 20;
const emptyResult = (): AuditListResult => ({ page: 1, pageSize: PAGE_SIZE, total: 0, items: [] });
const summaryFields = [
  { key: "name", label: "名称" },
  { key: "role", label: "角色" },
  { key: "status", label: "状态" },
  { key: "groupId", label: "分组" },
  { key: "creatorLimit", label: "创作者上限" },
  { key: "projectId", label: "项目" },
  { key: "ownerUserId", label: "用户" },
  { key: "changedFields", label: "变更字段" },
  { key: "reasonCode", label: "原因代码" },
  { key: "resourceKind", label: "资源类型" },
  { key: "route", label: "路由" },
  { key: "entryType", label: "调整类型" },
  { key: "amount", label: "金额" },
  { key: "balanceBefore", label: "变动前余额" },
  { key: "balanceAfter", label: "变动后余额" },
  { key: "reason", label: "原因" },
  { key: "priority", label: "优先级" },
] as const;
const valueLabels: Record<string, string> = {
  super_admin: "超级管理员",
  admin: "管理员",
  creator: "创作者",
  enabled: "启用",
  disabled: "停用",
  manual_topup: "手工充值",
  manual_credit: "手工加额",
  manual_debit: "手工扣减",
  usage_debit: "用量扣减",
};

const sessionStore = useAdminSessionStore();
const { session } = storeToRefs(sessionStore);
const isSuperAdmin = computed(() => session.value?.role === "super_admin");
const result = ref<AuditListResult>(emptyResult());
const groups = ref<GroupDto[]>([]);
const selectedGroupId = ref<number | "">("");
const page = ref(1);
const loading = ref(true);
const refreshing = ref(false);
const loadError = ref("");
let loadSequence = 0;

const groupOptions = computed(() => [
  { label: "全部分组", value: "" },
  ...groups.value.map((group) => ({ label: group.name, value: group.id })),
]);
const totalPages = computed(() => Math.max(1, Math.ceil(result.value.total / PAGE_SIZE)));

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(timestamp);
}

function formatTarget(item: AuditItem) {
  return item.targetId === null ? item.targetTypeLabel : `${item.targetTypeLabel} #${item.targetId}`;
}

function formatSummaryValue(value: AuditScalar) {
  if (value === null) return "-";
  if (typeof value === "boolean") return value ? "是" : "否";
  return valueLabels[String(value)] ?? String(value);
}

function safeSummary(summary: Record<string, AuditScalar>) {
  return summaryFields.flatMap(({ key, label }) => {
    const value = summary[key];
    if (value === undefined || (value !== null && !["string", "number", "boolean"].includes(typeof value))) return [];
    return [{ key, label, value: formatSummaryValue(value) }];
  });
}

async function loadAudit(silent = false) {
  const sequence = ++loadSequence;
  if (silent) refreshing.value = true;
  else loading.value = true;
  loadError.value = "";
  try {
    const nextResult = await listAudit({
      page: page.value,
      pageSize: PAGE_SIZE,
      ...(isSuperAdmin.value && selectedGroupId.value ? { groupId: Number(selectedGroupId.value) } : {}),
    });
    if (sequence !== loadSequence) return;
    const lastPage = Math.max(1, Math.ceil(nextResult.total / PAGE_SIZE));
    if (nextResult.page > lastPage) {
      page.value = lastPage;
      await loadAudit();
      return;
    }
    result.value = nextResult;
    page.value = nextResult.page;
  } catch (cause) {
    if (sequence === loadSequence) loadError.value = adminErrorText(cause, "审计日志加载失败");
  } finally {
    if (sequence === loadSequence) {
      loading.value = false;
      refreshing.value = false;
    }
  }
}

async function loadGroupOptions() {
  if (!isSuperAdmin.value) return;
  try {
    groups.value = await listGroups();
  } catch {
    groups.value = [];
  }
}

function changePage(nextPage: number) {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) return;
  page.value = nextPage;
  void loadAudit();
}

function handleGroupChange() {
  page.value = 1;
  void loadAudit();
}

onMounted(() => {
  void loadAudit();
  void loadGroupOptions();
});
</script>

<style scoped lang="scss">
.admin-page { width: min(100%, 1240px); margin: 0 auto; }
.group-filter { display: grid; min-width: 180px; grid-template-columns: auto minmax(130px, 1fr); align-items: center; gap: 7px; color: var(--stars-text-muted); font-size: 12px; }
.data-section { border: 1px solid var(--stars-border); border-radius: 6px; background: #fff; }
.section-heading { display: flex; min-height: 42px; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--stars-border); }
.section-heading h2 { margin: 0; color: var(--stars-text); font-size: 14px; letter-spacing: 0; }
.section-heading span { color: var(--stars-text-muted); font-size: 11px; }
.table-scroll { overflow-x: auto; }
table { width: 100%; min-width: 980px; border-collapse: collapse; font-size: 12px; }
th { padding: 8px 10px; background: var(--stars-surface-muted); color: var(--stars-text-muted); font-weight: 600; text-align: left; white-space: nowrap; }
td { max-width: 280px; padding: 9px 10px; border-top: 1px solid var(--stars-border); color: var(--stars-text); vertical-align: top; }
td small { display: block; margin-top: 3px; color: var(--stars-text-muted); }
.summary-list { display: flex; flex-wrap: wrap; gap: 4px 10px; line-height: 1.5; }
.summary-list span { overflow-wrap: anywhere; }
.result-text { color: #237804; font-weight: 600; }
.result-text.failed { color: #b42318; }
.pagination { display: flex; min-height: 48px; align-items: center; justify-content: flex-end; gap: 10px; padding: 8px 12px; border-top: 1px solid var(--stars-border); color: var(--stars-text-muted); font-size: 12px; }
@media (max-width: 640px) { .group-filter { width: 100%; } .pagination { justify-content: space-between; } }
</style>
