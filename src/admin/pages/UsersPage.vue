<template>
  <section class="admin-page users-page">
    <PageHeader title="用户管理">
      <template #actions>
        <t-button variant="outline" :loading="refreshing" :disabled="refreshing" @click="loadData(true)"><template #icon><i-refresh theme="outline" /></template>刷新</t-button>
        <t-button data-testid="open-create-user" @click="openCreate"><template #icon><i-add theme="outline" /></template>{{ isSuperAdmin ? "新建账号" : "新建 Creator" }}</t-button>
      </template>
    </PageHeader>

    <div class="toolbar"><label><span>搜索</span><t-input v-model="search" placeholder="用户名或账号 ID" clearable /></label></div>
    <LoadingState v-if="loading" text="正在加载用户..." />
    <ErrorState v-else-if="loadError" :message="loadError" retryable @retry="loadData()" />
    <section v-else class="data-section" aria-labelledby="users-title">
      <div class="section-heading"><h2 id="users-title">账号列表</h2><span>{{ filteredUsers.length }} 个账号</span></div>
      <p v-if="operationMessage" class="operation-message" :class="{ error: operationFailed }" role="status">{{ operationMessage }}</p>
      <EmptyState v-if="filteredUsers.length === 0" text="暂无符合条件的账号" />
      <div v-else class="table-scroll"><table>
        <thead><tr><th>账号</th><th>角色</th><th>分组</th><th>状态</th><th>首次改密</th><th>最近登录</th><th>操作</th></tr></thead>
        <tbody><tr v-for="user in filteredUsers" :key="user.id">
          <td><strong>{{ user.name }}</strong><small>#{{ user.id }}</small></td><td>{{ roleLabels[user.role] }}</td><td>{{ groupName(user.groupId) }}</td>
          <td><span class="status-label" :class="user.status">{{ statusLabels[user.status] }}</span></td><td>{{ user.mustChangePassword ? "待修改" : "已完成" }}</td><td>{{ formatAdminDate(user.lastLoginAt) }}</td>
          <td><div class="row-actions">
            <t-button v-if="canMutate(user)" :data-testid="`toggle-user-${user.id}`" size="small" variant="text" :disabled="busyUserId === user.id" @click="toggleUser(user)"><template #icon><i-unlock v-if="user.status === 'disabled'" theme="outline" /><i-lock v-else theme="outline" /></template>{{ user.status === "enabled" ? "停用" : "启用" }}</t-button>
            <t-button v-if="canMutate(user)" :data-testid="`reset-user-${user.id}`" size="small" variant="text" @click="openReset(user)"><template #icon><i-key theme="outline" /></template>重置密码</t-button>
          </div></td>
        </tr></tbody>
      </table></div>
    </section>

    <t-dialog v-model:visible="createVisible" :header="isSuperAdmin ? '新建账号' : '新建 Creator'" :footer="false" :close-on-overlay-click="false">
      <div class="dialog-form">
        <label v-if="isSuperAdmin"><span>账号角色</span><t-select v-model="createForm.role" :options="createRoleOptions" @change="handleCreateRoleChange" /></label>
        <label><span>用户名</span><t-input data-testid="create-user-name" v-model="createForm.name" maxlength="64" /></label>
        <label><span>临时密码</span><t-input data-testid="create-user-password" v-model="createForm.password" type="password" maxlength="128" /></label>
        <template v-if="createForm.role === 'creator'">
          <label v-if="isSuperAdmin"><span>所属分组</span><t-select data-testid="create-user-group" v-model="createForm.groupId" :options="groupOptions" /></label>
          <label><span>初始状态</span><t-select v-model="createForm.status" :options="statusOptions" /></label>
        </template>
        <template v-else>
          <label><span>分组名称</span><t-input v-model="createForm.groupName" maxlength="64" /></label>
          <label><span>Creator 名额</span><t-input-number v-model="createForm.creatorLimit" :min="0" :max="1000" /></label>
        </template>
        <p v-if="createError" class="field-error" role="alert">{{ createError }}</p>
        <div class="dialog-actions"><t-button variant="outline" :disabled="creating" @click="createVisible = false">取消</t-button><t-button data-testid="submit-create-user" :loading="creating" :disabled="creating" @click="submitCreate">确认创建</t-button></div>
      </div>
    </t-dialog>

    <t-dialog v-model:visible="resetVisible" header="重置临时密码" :footer="false" :close-on-overlay-click="false">
      <div class="dialog-form">
        <p class="dialog-target">{{ resetForm.userName }} (#{{ resetForm.id }})</p>
        <label><span>新临时密码</span><t-input data-testid="reset-password" v-model="resetForm.password" type="password" maxlength="128" /></label>
        <p v-if="resetError" class="field-error" role="alert">{{ resetError }}</p>
        <div class="dialog-actions"><t-button variant="outline" :disabled="resetting" @click="resetVisible = false">取消</t-button><t-button data-testid="submit-reset-password" :loading="resetting" :disabled="resetting" @click="submitReset">确认重置</t-button></div>
      </div>
    </t-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { storeToRefs } from "pinia";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import ErrorState from "../components/ErrorState.vue";
import { formatAdminDate } from "../components/adminDate";
import { useAdminSessionStore } from "../session";
import { adminErrorText, createUser, listGroups, listUsers, resetUserPassword, updateUser, type GroupDto, type UserDto } from "../api/adminApi";
import type { UserRole } from "../../shared/auth";

const roleLabels: Record<UserRole, string> = { super_admin: "超级管理员", admin: "分组管理员", creator: "Creator" };
const statusLabels = { enabled: "启用", disabled: "停用" } as const;
const statusOptions = [{ label: "启用", value: "enabled" }, { label: "停用", value: "disabled" }];
const createRoleOptions = [{ label: "Creator", value: "creator" }, { label: "分组管理员", value: "admin" }];
const sessionStore = useAdminSessionStore();
const { session } = storeToRefs(sessionStore);
const isSuperAdmin = computed(() => session.value?.role === "super_admin");
const users = ref<UserDto[]>([]);
const groups = ref<GroupDto[]>([]);
const search = ref("");
const loading = ref(true);
const refreshing = ref(false);
const loadError = ref("");
const operationMessage = ref("");
const operationFailed = ref(false);
const busyUserId = ref<number | null>(null);
const createVisible = ref(false);
const creating = ref(false);
const createError = ref("");
const resetVisible = ref(false);
const resetting = ref(false);
const resetError = ref("");
const createForm = reactive<{ name: string; password: string; role: "admin" | "creator"; status: "enabled" | "disabled"; groupId: number | ""; groupName: string; creatorLimit: number }>({ name: "", password: "", role: "creator", status: "enabled", groupId: "", groupName: "", creatorLimit: 5 });
const resetForm = reactive({ id: 0, userName: "", password: "" });
let requestSequence = 0;

const groupOptions = computed(() => groups.value.filter((group) => group.status === "enabled").map((group) => ({ label: group.name, value: group.id })));
const filteredUsers = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return users.value;
  return users.value.filter((user) => user.name.toLowerCase().includes(term) || String(user.id) === term);
});

function groupName(id: number | null) {
  if (id === null) return "平台级";
  if (!isSuperAdmin.value && id === session.value?.groupId) return session.value.groupName || `分组 #${id}`;
  const group = groups.value.find((item) => item.id === id);
  return group ? `${group.name} (#${id})` : `#${id}`;
}

function canMutate(user: UserDto) {
  return user.id !== session.value?.id && (isSuperAdmin.value || user.role === "creator");
}

async function loadData(silent = false) {
  const sequence = ++requestSequence;
  if (silent) refreshing.value = true; else loading.value = true;
  loadError.value = "";
  try {
    const [nextUsers, nextGroups] = await Promise.all([listUsers(), isSuperAdmin.value ? listGroups() : Promise.resolve([])]);
    if (sequence !== requestSequence) return;
    users.value = nextUsers;
    groups.value = nextGroups;
  } catch (cause) { if (sequence === requestSequence) loadError.value = adminErrorText(cause, "用户加载失败"); }
  finally { if (sequence === requestSequence) { loading.value = false; refreshing.value = false; } }
}

function openCreate() {
  Object.assign(createForm, { name: "", password: "", role: "creator", status: "enabled", groupId: isSuperAdmin.value ? (groupOptions.value[0]?.value ?? "") : (session.value?.groupId ?? ""), groupName: "", creatorLimit: 5 });
  createError.value = "";
  createVisible.value = true;
}

function handleCreateRoleChange() {
  createError.value = "";
}

function validateCreate() {
  if (createForm.name.trim().length < 2) return "用户名至少 2 个字符";
  if (createForm.password.length < 8) return "临时密码至少 8 个字符";
  if (createForm.role === "creator" && !createForm.groupId) return "请选择所属分组";
  if (createForm.role === "admin" && createForm.groupName.trim().length < 2) return "分组名称至少 2 个字符";
  if (createForm.role === "admin" && (!Number.isInteger(createForm.creatorLimit) || createForm.creatorLimit < 0 || createForm.creatorLimit > 1000)) return "Creator 名额必须是 0 至 1000 的整数";
  return "";
}

async function submitCreate() {
  const validation = validateCreate();
  if (validation) { createError.value = validation; return; }
  creating.value = true;
  try {
    if (createForm.role === "creator") {
      await createUser({ name: createForm.name.trim(), password: createForm.password, role: "creator", status: createForm.status, groupId: Number(createForm.groupId) });
    } else {
      await createUser({ name: createForm.name.trim(), password: createForm.password, role: "admin", status: "enabled", groupName: createForm.groupName.trim(), creatorLimit: createForm.creatorLimit });
    }
    createVisible.value = false;
    operationFailed.value = false;
    operationMessage.value = "账号创建成功";
    await loadData(true);
  } catch (cause) { createError.value = adminErrorText(cause, "账号创建失败"); }
  finally { creating.value = false; }
}

async function toggleUser(user: UserDto) {
  busyUserId.value = user.id;
  operationMessage.value = "";
  try {
    await updateUser({ id: user.id, status: user.status === "enabled" ? "disabled" : "enabled" });
    operationFailed.value = false;
    operationMessage.value = user.status === "enabled" ? "账号已停用" : "账号已启用";
    await loadData(true);
  } catch (cause) { operationFailed.value = true; operationMessage.value = adminErrorText(cause, "账号状态更新失败"); }
  finally { busyUserId.value = null; }
}

function openReset(user: UserDto) {
  Object.assign(resetForm, { id: user.id, userName: user.name, password: "" });
  resetError.value = "";
  resetVisible.value = true;
}

async function submitReset() {
  if (resetForm.password.length < 8) { resetError.value = "临时密码至少 8 个字符"; return; }
  resetting.value = true;
  try {
    await resetUserPassword({ id: resetForm.id, password: resetForm.password });
    resetVisible.value = false;
    operationFailed.value = false;
    operationMessage.value = "临时密码已重置";
    await loadData(true);
  } catch (cause) { resetError.value = adminErrorText(cause, "密码重置失败"); }
  finally { resetting.value = false; }
}

void loadData();
</script>

<style scoped lang="scss">
.admin-page { width: min(100%, 1240px); margin: 0 auto; }.toolbar { display: grid; grid-template-columns: minmax(220px, 320px); margin-bottom: 12px; }.toolbar label, .dialog-form label { display: grid; gap: 5px; color: var(--stars-text-muted); font-size: 12px; }
.data-section { border: 1px solid var(--stars-border); border-radius: 6px; background: #fff; }.section-heading { display: flex; min-height: 42px; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--stars-border); }.section-heading h2 { margin: 0; font-size: 14px; }.section-heading span { color: var(--stars-text-muted); font-size: 11px; }
.table-scroll { overflow-x: auto; } table { width: 100%; min-width: 920px; border-collapse: collapse; font-size: 12px; } th { padding: 8px 10px; background: var(--stars-surface-muted); color: var(--stars-text-muted); font-weight: 600; text-align: left; white-space: nowrap; } td { padding: 8px 10px; border-top: 1px solid var(--stars-border); color: var(--stars-text); } td small { display: block; margin-top: 2px; color: var(--stars-text-muted); }
.status-label { font-weight: 600; }.status-label.enabled { color: var(--stars-completed); }.status-label.disabled { color: #667085; }.row-actions { display: flex; gap: 4px; white-space: nowrap; }
.operation-message { margin: 0; padding: 8px 12px; border-bottom: 1px solid var(--stars-border); color: var(--stars-completed); font-size: 12px; }.operation-message.error, .field-error { color: #b42318; }
.dialog-form { display: grid; gap: 12px; }.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }.field-error, .dialog-target { margin: 0; font-size: 12px; }.dialog-target { color: var(--stars-text); font-weight: 600; }
@media (max-width: 620px) { .toolbar { grid-template-columns: 1fr; } }
</style>
