<template>
  <section class="admin-page groups-page">
    <PageHeader title="分组管理">
      <template #actions>
        <t-button variant="outline" :loading="refreshing" :disabled="refreshing" @click="loadData(true)">
          <template #icon><i-refresh theme="outline" /></template>刷新
        </t-button>
        <t-button data-testid="open-create-group" @click="openCreate">
          <template #icon><i-add theme="outline" /></template>新建分组
        </t-button>
      </template>
    </PageHeader>

    <LoadingState v-if="loading" text="正在加载分组..." />
    <ErrorState v-else-if="loadError" :message="loadError" retryable @retry="loadData()" />
    <section v-else class="data-section" aria-labelledby="groups-title">
      <div class="section-heading"><h2 id="groups-title">分组列表</h2><span>{{ groups.length }} 个分组</span></div>
      <p v-if="operationMessage" class="operation-message" :class="{ error: operationFailed }" role="status">{{ operationMessage }}</p>
      <EmptyState v-if="groups.length === 0" text="暂无分组" />
      <div v-else class="table-scroll">
        <table>
          <thead><tr><th>分组</th><th>分组管理员</th><th>Creator 名额</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="group in groups" :key="group.id">
              <td><strong>{{ group.name }}</strong><small>#{{ group.id }}</small></td>
              <td>{{ adminName(group.adminUserId) }}</td>
              <td>{{ group.creatorLimit }} 人</td>
              <td><span class="status-label" :class="group.status">{{ statusLabels[group.status] }}</span></td>
              <td>{{ formatAdminDate(group.updatedAt) }}</td>
              <td><t-button :data-testid="`edit-group-${group.id}`" size="small" variant="text" @click="openEdit(group)"><template #icon><i-edit theme="outline" /></template>编辑</t-button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <t-dialog v-model:visible="createVisible" header="新建分组" :footer="false" :close-on-overlay-click="false">
      <div class="dialog-form">
        <label><span>分组名称</span><t-input data-testid="create-group-name" v-model="createForm.groupName" maxlength="64" /></label>
        <label><span>管理员用户名</span><t-input data-testid="create-admin-name" v-model="createForm.name" maxlength="64" /></label>
        <label><span>管理员临时密码</span><t-input data-testid="create-admin-password" v-model="createForm.password" type="password" maxlength="128" /></label>
        <label><span>Creator 名额</span><t-input-number v-model="createForm.creatorLimit" :min="0" :max="1000" /></label>
        <p v-if="createError" class="field-error" role="alert">{{ createError }}</p>
        <div class="dialog-actions"><t-button variant="outline" :disabled="creating" @click="createVisible = false">取消</t-button><t-button data-testid="submit-create-group" :loading="creating" :disabled="creating" @click="submitCreate">确认创建</t-button></div>
      </div>
    </t-dialog>

    <t-dialog v-model:visible="editVisible" header="编辑分组" :footer="false" :close-on-overlay-click="false">
      <div class="dialog-form">
        <label><span>分组名称</span><t-input v-model="editForm.name" maxlength="64" /></label>
        <label><span>Creator 名额</span><t-input-number data-testid="edit-group-limit" v-model="editForm.creatorLimit" :min="0" :max="1000" /></label>
        <label><span>状态</span><t-select data-testid="edit-group-status" v-model="editForm.status" :options="statusOptions" /></label>
        <p v-if="editError" class="field-error" role="alert">{{ editError }}</p>
        <div class="dialog-actions"><t-button variant="outline" :disabled="saving" @click="editVisible = false">取消</t-button><t-button data-testid="submit-edit-group" :loading="saving" :disabled="saving" @click="submitEdit">保存</t-button></div>
      </div>
    </t-dialog>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import ErrorState from "../components/ErrorState.vue";
import { formatAdminDate } from "../components/adminDate";
import { adminErrorText, createUser, listGroups, listUsers, updateGroup, type GroupDto, type UserDto } from "../api/adminApi";

const statusLabels = { enabled: "启用", disabled: "停用" } as const;
const statusOptions = [{ label: "启用", value: "enabled" }, { label: "停用", value: "disabled" }];
const groups = ref<GroupDto[]>([]);
const users = ref<UserDto[]>([]);
const loading = ref(true);
const refreshing = ref(false);
const loadError = ref("");
const operationMessage = ref("");
const operationFailed = ref(false);
const createVisible = ref(false);
const creating = ref(false);
const createError = ref("");
const editVisible = ref(false);
const saving = ref(false);
const editError = ref("");
const createForm = reactive({ groupName: "", name: "", password: "", creatorLimit: 5 });
const editForm = reactive<{ id: number; name: string; creatorLimit: number; status: "enabled" | "disabled" }>({ id: 0, name: "", creatorLimit: 5, status: "enabled" });
let requestSequence = 0;

function adminName(id: number | null) {
  if (id === null) return "未绑定";
  const user = users.value.find((item) => item.id === id);
  return user ? `${user.name} (#${id})` : `#${id}`;
}

async function loadData(silent = false) {
  const sequence = ++requestSequence;
  if (silent) refreshing.value = true; else loading.value = true;
  loadError.value = "";
  try {
    const [nextGroups, nextUsers] = await Promise.all([listGroups(), listUsers()]);
    if (sequence !== requestSequence) return;
    groups.value = nextGroups;
    users.value = nextUsers;
  } catch (cause) {
    if (sequence === requestSequence) loadError.value = adminErrorText(cause, "分组加载失败");
  } finally {
    if (sequence === requestSequence) { loading.value = false; refreshing.value = false; }
  }
}

function openCreate() {
  Object.assign(createForm, { groupName: "", name: "", password: "", creatorLimit: 5 });
  createError.value = "";
  createVisible.value = true;
}

function validateCreate() {
  if (createForm.groupName.trim().length < 2) return "分组名称至少 2 个字符";
  if (createForm.name.trim().length < 2) return "管理员用户名至少 2 个字符";
  if (createForm.password.length < 8) return "临时密码至少 8 个字符";
  if (!Number.isInteger(createForm.creatorLimit) || createForm.creatorLimit < 0 || createForm.creatorLimit > 1000) return "Creator 名额必须是 0 至 1000 的整数";
  return "";
}

async function submitCreate() {
  const validation = validateCreate();
  if (validation) { createError.value = validation; return; }
  creating.value = true;
  try {
    await createUser({ name: createForm.name.trim(), password: createForm.password, role: "admin", groupName: createForm.groupName.trim(), creatorLimit: createForm.creatorLimit, status: "enabled" });
    createVisible.value = false;
    operationFailed.value = false;
    operationMessage.value = "分组创建成功";
    await loadData(true);
  } catch (cause) {
    createError.value = adminErrorText(cause, "分组创建失败");
  } finally { creating.value = false; }
}

function openEdit(group: GroupDto) {
  Object.assign(editForm, { id: group.id, name: group.name, creatorLimit: group.creatorLimit, status: group.status });
  editError.value = "";
  editVisible.value = true;
}

async function submitEdit() {
  const name = editForm.name.trim();
  if (name.length < 2) { editError.value = "分组名称至少 2 个字符"; return; }
  if (!Number.isInteger(editForm.creatorLimit) || editForm.creatorLimit < 0 || editForm.creatorLimit > 1000) { editError.value = "Creator 名额必须是 0 至 1000 的整数"; return; }
  saving.value = true;
  try {
    await updateGroup({ id: editForm.id, name, creatorLimit: editForm.creatorLimit, status: editForm.status });
    editVisible.value = false;
    operationFailed.value = false;
    operationMessage.value = "分组更新成功";
    await loadData(true);
  } catch (cause) { editError.value = adminErrorText(cause, "分组更新失败"); }
  finally { saving.value = false; }
}

void loadData();
</script>

<style scoped lang="scss">
.admin-page { width: min(100%, 1240px); margin: 0 auto; }
.data-section { border: 1px solid var(--stars-border); border-radius: 6px; background: #fff; }
.section-heading { display: flex; min-height: 42px; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--stars-border); }
.section-heading h2 { margin: 0; font-size: 14px; }.section-heading span { color: var(--stars-text-muted); font-size: 11px; }
.table-scroll { overflow-x: auto; } table { width: 100%; min-width: 760px; border-collapse: collapse; font-size: 12px; }
th { padding: 8px 10px; background: var(--stars-surface-muted); color: var(--stars-text-muted); font-weight: 600; text-align: left; white-space: nowrap; }
td { padding: 8px 10px; border-top: 1px solid var(--stars-border); color: var(--stars-text); } td small { display: block; margin-top: 2px; color: var(--stars-text-muted); }
.status-label { font-weight: 600; }.status-label.enabled { color: var(--stars-completed); }.status-label.disabled { color: #667085; }
.operation-message { margin: 0; padding: 8px 12px; border-bottom: 1px solid var(--stars-border); color: var(--stars-completed); font-size: 12px; }.operation-message.error, .field-error { color: #b42318; }
.dialog-form { display: grid; gap: 12px; }.dialog-form label { display: grid; gap: 5px; color: var(--stars-text-muted); font-size: 12px; }.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }.field-error { margin: 0; font-size: 12px; }
</style>
