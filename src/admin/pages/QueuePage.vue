<template>
  <section class="admin-page queue-page">
    <PageHeader title="队列与并发" description="查看生成队列，并按角色范围维护并发策略">
      <template #actions>
        <t-button data-testid="refresh-queue" variant="outline" :loading="refreshing" :disabled="refreshing" @click="loadQueue(true)">
          <template #icon><i-refresh theme="outline" /></template>刷新
        </t-button>
      </template>
    </PageHeader>

    <section class="toolbar" aria-label="队列筛选">
      <label><span>状态</span><t-select data-testid="filter-status" v-model="filterStatus" :options="statusOptions" @change="loadQueue()" /></label>
      <label><span>类型</span><t-select data-testid="filter-type" v-model="filterType" :options="taskTypeOptions" @change="loadQueue()" /></label>
      <label><span>用户</span><t-select data-testid="filter-user" v-model="filterUserId" :options="filterUserOptions" @change="loadQueue()" /></label>
    </section>

    <section class="count-strip" aria-label="任务状态计数">
      <div v-for="status in statuses" :key="status">
        <StatusText :status="status" />
        <strong>{{ counts[status] }}</strong>
      </div>
    </section>

    <section class="data-section" aria-labelledby="queue-table-title">
      <div class="section-heading"><h2 id="queue-table-title">生成任务</h2><span>最多显示 200 条</span></div>
      <LoadingState v-if="loading" />
      <ErrorState v-else-if="queueError" :message="queueError" retryable @retry="loadQueue()" />
      <EmptyState v-else-if="jobs.length === 0" text="暂无队列任务" />
      <div v-else class="table-scroll">
        <table>
          <thead><tr><th>任务</th><th>用户/分组</th><th>类型</th><th>状态</th><th>预计位置</th><th>优先级</th><th>排队时间</th><th>错误</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="job in jobs" :key="job.id">
              <td><strong>#{{ job.id }}</strong><small>项目 {{ job.projectId ?? "-" }}</small></td>
              <td>用户 {{ job.ownerUserId }}<small>分组 {{ job.groupId }}</small></td>
              <td>{{ taskTypeLabels[job.taskType] }}</td>
              <td><StatusText :status="job.status" /></td>
              <td>{{ job.queuePosition === null ? "-" : `预计第 ${job.queuePosition} 位` }}</td>
              <td>{{ job.priority }}</td>
              <td>{{ formatAdminDate(job.queuedAt) }}</td>
              <td class="error-cell">{{ job.errorMessage || "-" }}</td>
              <td>
                <div class="row-actions">
                  <t-button
                    v-if="canCancel(job.status)"
                    :data-testid="`cancel-${job.id}`"
                    size="small"
                    variant="text"
                    theme="danger"
                    :loading="busyJobId === job.id"
                    :disabled="busyJobId !== null"
                    @click="cancel(job.id)"
                  ><template #icon><i-close theme="outline" /></template>取消</t-button>
                  <t-button
                    v-if="isSuperAdmin && job.status === 'queued'"
                    :data-testid="`reprioritize-${job.id}`"
                    size="small"
                    variant="text"
                    :disabled="busyJobId !== null"
                    @click="openPriorityDialog(job)"
                  ><template #icon><i-edit theme="outline" /></template>调优先级</t-button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="queueActionMessage" class="operation-message" :class="{ error: queueActionFailed }" role="status">{{ queueActionMessage }}</p>
    </section>

    <section class="data-section concurrency-section" aria-labelledby="concurrency-title">
      <div class="section-heading"><h2 id="concurrency-title">并发策略</h2><span>总量与文本、图片、视频限制同时生效</span></div>
      <LoadingState v-if="targetLoading" data-testid="target-loading" text="加载并发目标..." />
      <ErrorState v-else-if="targetError" data-testid="target-error" :message="targetError" retryable @retry="loadTargets" />
      <div v-else-if="groups.length > 0" class="target-content">
        <div class="target-grid">
          <label><span>目标分组</span><t-select data-testid="concurrency-group" v-model="selectedGroupId" :options="groupOptions" :disabled="!isSuperAdmin" @change="handleGroupChange" /></label>
          <label><span>目标用户</span><t-select data-testid="concurrency-user" v-model="selectedUserId" :options="concurrencyUserOptions" :disabled="concurrencyUserOptions.length === 0" @change="loadPolicies" /></label>
        </div>

        <EmptyState v-if="!hasConcurrencyTarget" data-testid="target-user-empty" text="请选择有可管理账号的分组" />
        <LoadingState v-else-if="policiesLoading" text="加载并发策略..." />
        <div v-else class="policy-grid">
          <section class="policy-block">
            <div class="policy-title"><h3>分组限制</h3><span v-if="!isSuperAdmin">只读</span></div>
            <div class="limit-grid">
              <label v-for="field in limitFields" :key="`group-${field.key}`"><span>{{ field.label }}</span><t-input-number v-model="groupPolicy[field.key]" :min="1" :max="1000" :disabled="!isSuperAdmin || savingGroup" /></label>
            </div>
            <t-button v-if="isSuperAdmin" data-testid="save-group-policy" size="small" :loading="savingGroup" :disabled="savingGroup" @click="saveGroupPolicy">
              <template #icon><i-save theme="outline" /></template>保存分组策略
            </t-button>
          </section>
          <section class="policy-block">
            <div class="policy-title"><h3>个人限制</h3><span>{{ selectedUserName }}</span></div>
            <div class="limit-grid">
              <label v-for="field in limitFields" :key="`user-${field.key}`"><span>{{ field.label }}</span><t-input-number v-model="userPolicy[field.key]" :min="1" :max="1000" :disabled="savingUser" /></label>
            </div>
            <t-button data-testid="save-user-policy" size="small" :loading="savingUser" :disabled="savingUser" @click="saveUserPolicy">
              <template #icon><i-save theme="outline" /></template>保存个人策略
            </t-button>
          </section>
        </div>
        <p v-if="policyMessage" class="operation-message" :class="{ error: policyFailed }" role="status">{{ policyMessage }}</p>
      </div>
      <EmptyState v-else data-testid="target-empty" text="暂无可管理的并发目标" />
    </section>

    <t-dialog v-model:visible="priorityDialogVisible" header="调整任务优先级" :close-on-overlay-click="false" :footer="false">
      <div class="dialog-form">
        <label><span>优先级（-1000 至 1000）</span><t-input-number data-testid="priority-value" v-model="priorityForm.priority" :min="-1000" :max="1000" /></label>
        <label><span>调整原因</span><textarea data-testid="priority-reason" v-model="priorityForm.reason" maxlength="200" rows="3" /></label>
        <p v-if="priorityError" class="field-error" role="alert">{{ priorityError }}</p>
        <div class="dialog-actions">
          <t-button variant="outline" :disabled="prioritySaving" @click="priorityDialogVisible = false">取消</t-button>
          <t-button data-testid="submit-priority" :loading="prioritySaving" :disabled="prioritySaving" @click="submitPriority">确认调整</t-button>
        </div>
      </div>
    </t-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { storeToRefs } from "pinia";
import PageHeader from "../components/PageHeader.vue";
import StatusText from "../components/StatusText.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import ErrorState from "../components/ErrorState.vue";
import { formatAdminDate } from "../components/adminDate";
import { useAdminSessionStore } from "../session";
import {
  adminErrorText,
  cancelJob,
  getPolicies,
  listGroups,
  listJobs,
  listUsers,
  reprioritizeJob,
  updateGroupPolicy,
  updateUserPolicy,
  type ConcurrencyLimit,
  type GenerationJobListItem,
  type GenerationJobStatus,
  type GenerationTaskType,
  type GroupDto,
  type JobStatusCounts,
  type UserDto,
} from "../api/adminApi";

const statuses: GenerationJobStatus[] = ["queued", "running", "recovering", "needs_attention", "succeeded", "failed", "cancelled"];
const emptyCounts = () => Object.fromEntries(statuses.map((status) => [status, 0])) as JobStatusCounts;
const emptyLimit = (): ConcurrencyLimit => ({ total: 1, text: 1, image: 1, video: 1 });
const statusOptions = [
  { label: "全部状态", value: "" },
  { label: "排队中", value: "queued" }, { label: "执行中", value: "running" },
  { label: "恢复中", value: "recovering" }, { label: "需要处理", value: "needs_attention" },
  { label: "已完成", value: "succeeded" }, { label: "失败", value: "failed" }, { label: "已取消", value: "cancelled" },
];
const taskTypeOptions = [{ label: "全部类型", value: "" }, { label: "文本", value: "text" }, { label: "图片", value: "image" }, { label: "视频", value: "video" }];
const taskTypeLabels: Record<GenerationTaskType, string> = { text: "文本", image: "图片", video: "视频" };
const limitFields = [
  { key: "total", label: "总并发" }, { key: "text", label: "文本" },
  { key: "image", label: "图片" }, { key: "video", label: "视频" },
] as const;

const sessionStore = useAdminSessionStore();
const { session } = storeToRefs(sessionStore);
const isSuperAdmin = computed(() => session.value?.role === "super_admin");
const jobs = ref<GenerationJobListItem[]>([]);
const counts = ref<JobStatusCounts>(emptyCounts());
const loading = ref(true);
const refreshing = ref(false);
const queueError = ref("");
const queueActionMessage = ref("");
const queueActionFailed = ref(false);
const busyJobId = ref<number | null>(null);
const filterStatus = ref<GenerationJobStatus | "">("");
const filterType = ref<GenerationTaskType | "">("");
const filterUserId = ref<number | "">("");
const groups = ref<GroupDto[]>([]);
const users = ref<UserDto[]>([]);
const selectedGroupId = ref<number | "">("");
const selectedUserId = ref<number | "">("");
const targetLoading = ref(true);
const targetError = ref("");
const groupPolicy = reactive<ConcurrencyLimit>(emptyLimit());
const userPolicy = reactive<ConcurrencyLimit>(emptyLimit());
const policiesLoading = ref(false);
const savingGroup = ref(false);
const savingUser = ref(false);
const policyMessage = ref("");
const policyFailed = ref(false);
const priorityDialogVisible = ref(false);
const prioritySaving = ref(false);
const priorityError = ref("");
const priorityForm = reactive({ id: 0, priority: 0, reason: "" });
let pollTimer: number | undefined;
let queueRequestSequence = 0;
let queueRerunQueued = false;
let queueRunPromise: Promise<void> | null = null;
let policyLoadSequence = 0;
let loadedTarget: { groupId: number; userId: number } | null = null;

const filterUserOptions = computed(() => users.value.map((user) => ({ label: `${user.name} (#${user.id})`, value: user.id })));
const groupOptions = computed(() => groups.value.map((group) => ({ label: group.name, value: group.id })));
const manageableUsers = computed(() => users.value.filter((user) => {
  if (user.id === session.value?.id || user.groupId !== Number(selectedGroupId.value)) return false;
  return isSuperAdmin.value ? user.role === "creator" || user.role === "admin" : user.role === "creator";
}));
const concurrencyUserOptions = computed(() => manageableUsers.value.map((user) => ({ label: `${user.name} (#${user.id})`, value: user.id })));
const selectedUserName = computed(() => manageableUsers.value.find((user) => user.id === Number(selectedUserId.value))?.name ?? "-");
const hasConcurrencyTarget = computed(() => Boolean(selectedGroupId.value && selectedUserId.value));

function canCancel(status: GenerationJobStatus) {
  return status === "queued" || status === "running" || status === "recovering";
}

async function drainQueueRequests() {
  try {
    while (queueRerunQueued) {
      queueRerunQueued = false;
      const sequence = queueRequestSequence;
      try {
        const result = await listJobs({
          ...(filterStatus.value ? { status: filterStatus.value } : {}),
          ...(filterType.value ? { taskType: filterType.value } : {}),
          ...(filterUserId.value ? { ownerUserId: Number(filterUserId.value) } : {}),
        });
        if (sequence !== queueRequestSequence) continue;
        jobs.value = result.items;
        counts.value = result.counts;
      } catch (cause) {
        if (sequence === queueRequestSequence) {
          queueError.value = adminErrorText(cause, "队列加载失败");
        }
      }
    }
  } finally {
    queueRunPromise = null;
    loading.value = false;
    refreshing.value = false;
  }
}

function loadQueue(silent = false): Promise<void> {
  queueRequestSequence += 1;
  queueRerunQueued = true;
  if (silent) refreshing.value = true;
  else if (jobs.value.length === 0) loading.value = true;
  queueError.value = "";
  if (!queueRunPromise) queueRunPromise = drainQueueRequests();
  return queueRunPromise;
}

async function loadTargets() {
  policyLoadSequence += 1;
  loadedTarget = null;
  policiesLoading.value = false;
  targetLoading.value = true;
  targetError.value = "";
  policyMessage.value = "";
  try {
    users.value = await listUsers();
    if (isSuperAdmin.value) {
      groups.value = await listGroups();
    } else if (session.value?.groupId) {
      groups.value = [{ id: session.value.groupId, name: session.value.groupName || `分组 ${session.value.groupId}`, adminUserId: session.value.id, creatorLimit: 0, status: "enabled", createdAt: 0, updatedAt: 0 }];
    }
    selectedGroupId.value = groups.value[0]?.id ?? "";
    selectedUserId.value = manageableUsers.value[0]?.id ?? "";
  } catch (cause) {
    groups.value = [];
    users.value = [];
    selectedGroupId.value = "";
    selectedUserId.value = "";
    targetError.value = adminErrorText(cause, "并发目标加载失败");
    return;
  } finally {
    targetLoading.value = false;
  }
  await loadPolicies();
}

async function handleGroupChange() {
  selectedUserId.value = manageableUsers.value[0]?.id ?? "";
  await loadPolicies();
}

function currentPolicyTarget() {
  if (!selectedGroupId.value || !selectedUserId.value) return null;
  return { groupId: Number(selectedGroupId.value), userId: Number(selectedUserId.value) };
}

function isSamePolicyTarget(
  left: { groupId: number; userId: number } | null,
  right: { groupId: number; userId: number } | null,
) {
  return Boolean(left && right && left.groupId === right.groupId && left.userId === right.userId);
}

async function loadPolicies(): Promise<boolean> {
  const target = currentPolicyTarget();
  const sequence = ++policyLoadSequence;
  loadedTarget = null;
  if (!target) {
    policiesLoading.value = false;
    return false;
  }
  policiesLoading.value = true;
  policyMessage.value = "";
  try {
    const result = await getPolicies(target);
    if (sequence !== policyLoadSequence) return false;
    Object.assign(groupPolicy, result.group);
    Object.assign(userPolicy, result.user);
    loadedTarget = target;
    policyFailed.value = false;
    return true;
  } catch (cause) {
    if (sequence === policyLoadSequence) {
      policyFailed.value = true;
      policyMessage.value = adminErrorText(cause, "并发策略加载失败");
    }
    return false;
  } finally {
    if (sequence === policyLoadSequence) policiesLoading.value = false;
  }
}

async function rejectStalePolicySave() {
  const reloaded = await loadPolicies();
  if (reloaded) {
    policyFailed.value = true;
    policyMessage.value = "当前目标已变更，已重新加载并发策略，请确认后再保存";
  }
}

async function cancel(id: number) {
  busyJobId.value = id;
  queueActionMessage.value = "";
  try {
    await cancelJob(id);
    queueActionFailed.value = false;
    queueActionMessage.value = "取消请求已提交";
    await loadQueue(true);
  } catch (cause) {
    queueActionFailed.value = true;
    queueActionMessage.value = adminErrorText(cause, "取消任务失败");
  } finally {
    busyJobId.value = null;
  }
}

function openPriorityDialog(job: GenerationJobListItem) {
  priorityForm.id = job.id;
  priorityForm.priority = job.priority;
  priorityForm.reason = "";
  priorityError.value = "";
  priorityDialogVisible.value = true;
}

async function submitPriority() {
  const reason = priorityForm.reason.trim();
  if (reason.length < 2) {
    priorityError.value = "请填写调整原因（至少 2 个字符）";
    return;
  }
  prioritySaving.value = true;
  priorityError.value = "";
  try {
    await reprioritizeJob({ id: priorityForm.id, priority: priorityForm.priority, reason });
    priorityDialogVisible.value = false;
    queueActionFailed.value = false;
    queueActionMessage.value = "任务优先级已更新";
    await loadQueue(true);
  } catch (cause) {
    priorityError.value = adminErrorText(cause, "优先级调整失败");
  } finally {
    prioritySaving.value = false;
  }
}

async function saveGroupPolicy() {
  if (!isSuperAdmin.value) return;
  const target = currentPolicyTarget();
  if (!isSamePolicyTarget(target, loadedTarget)) {
    await rejectStalePolicySave();
    return;
  }
  savingGroup.value = true;
  policyMessage.value = "";
  try {
    await updateGroupPolicy({ groupId: target!.groupId, ...groupPolicy });
    policyFailed.value = false;
    policyMessage.value = "分组并发策略已保存";
    await loadPolicies();
  } catch (cause) {
    policyFailed.value = true;
    policyMessage.value = adminErrorText(cause, "分组并发策略保存失败");
  } finally {
    savingGroup.value = false;
  }
}

async function saveUserPolicy() {
  const target = currentPolicyTarget();
  if (!isSamePolicyTarget(target, loadedTarget)) {
    await rejectStalePolicySave();
    return;
  }
  savingUser.value = true;
  policyMessage.value = "";
  try {
    await updateUserPolicy({ userId: target!.userId, ...userPolicy });
    policyFailed.value = false;
    policyMessage.value = "个人并发策略已保存";
    await loadPolicies();
  } catch (cause) {
    policyFailed.value = true;
    policyMessage.value = adminErrorText(cause, "个人并发策略保存失败");
  } finally {
    savingUser.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadQueue(), loadTargets()]);
  pollTimer = window.setInterval(() => void loadQueue(true), 5000);
});

onBeforeUnmount(() => {
  if (pollTimer !== undefined) window.clearInterval(pollTimer);
});
</script>

<style scoped lang="scss">
.admin-page { width: min(100%, 1280px); margin: 0 auto; }
.toolbar, .target-grid { display: grid; grid-template-columns: repeat(3, minmax(160px, 1fr)); gap: 10px; margin-bottom: 12px; }
label { display: grid; gap: 5px; min-width: 0; color: var(--stars-text-muted); font-size: 12px; }
.count-strip { display: grid; grid-template-columns: repeat(7, minmax(82px, 1fr)); margin-bottom: 14px; overflow-x: auto; border: 1px solid var(--stars-border); border-radius: 6px; background: #fff; }
.count-strip div { display: flex; min-width: 92px; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 10px; border-right: 1px solid var(--stars-border); }
.count-strip div:last-child { border-right: 0; }
.count-strip strong { color: var(--stars-text); font-size: 14px; }
.data-section { margin-bottom: 14px; border: 1px solid var(--stars-border); border-radius: 6px; background: #fff; }
.section-heading { display: flex; min-height: 42px; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--stars-border); }
.section-heading h2, .policy-title h3 { margin: 0; color: var(--stars-text); font-size: 14px; letter-spacing: 0; }
.section-heading span, .policy-title span { color: var(--stars-text-muted); font-size: 11px; }
.table-scroll { overflow-x: auto; }
table { width: 100%; min-width: 1040px; border-collapse: collapse; font-size: 12px; }
th { padding: 8px 10px; background: var(--stars-surface-muted); color: var(--stars-text-muted); font-weight: 600; text-align: left; white-space: nowrap; }
td { max-width: 180px; padding: 8px 10px; border-top: 1px solid var(--stars-border); color: var(--stars-text); vertical-align: middle; }
td small { display: block; margin-top: 3px; color: var(--stars-text-muted); }
.error-cell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-actions { display: flex; gap: 3px; white-space: nowrap; }
.operation-message { margin: 0; padding: 8px 12px; border-top: 1px solid var(--stars-border); color: var(--stars-completed); font-size: 12px; }
.operation-message.error, .field-error { color: #b42318; }
.target-grid { grid-template-columns: repeat(2, minmax(180px, 300px)); padding: 12px; margin: 0; }
.policy-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid var(--stars-border); }
.policy-block { padding: 12px; }
.policy-block + .policy-block { border-left: 1px solid var(--stars-border); }
.policy-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.limit-grid { display: grid; grid-template-columns: repeat(4, minmax(80px, 1fr)); gap: 8px; margin-bottom: 10px; }
.dialog-form { display: grid; gap: 12px; }
.dialog-form textarea { width: 100%; resize: vertical; padding: 8px; border: 1px solid var(--stars-border); border-radius: 4px; color: var(--stars-text); font: inherit; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }
.field-error { margin: 0; font-size: 12px; }
@media (max-width: 760px) { .toolbar { grid-template-columns: 1fr; } .target-grid, .policy-grid { grid-template-columns: 1fr; } .policy-block + .policy-block { border-top: 1px solid var(--stars-border); border-left: 0; } .limit-grid { grid-template-columns: repeat(2, minmax(80px, 1fr)); } .section-heading { align-items: flex-start; flex-direction: column; } }
</style>
