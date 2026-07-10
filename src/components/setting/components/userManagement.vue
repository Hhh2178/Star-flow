<template>
  <div class="userManagement">
    <div class="toolbar">
      <t-button theme="primary" @click="openCreateDialog">
        <template #icon><i-plus /></template>
        {{ $t("settings.userManagement.addUser") }}
      </t-button>
      <t-button variant="outline" :loading="loading" @click="fetchUsers">
        <template #icon><i-refresh /></template>
        {{ $t("settings.userManagement.refresh") }}
      </t-button>
    </div>

    <t-loading :loading="loading">
      <t-table :data="users" :columns="columns" row-key="id" size="small" :hover="true">
        <template #role="{ row }">
          <t-tag variant="light" :theme="roleTheme(row.role)">{{ roleLabel(row.role) }}</t-tag>
        </template>
        <template #status="{ row }">
          <t-tag variant="light" :theme="row.status === 'enabled' ? 'success' : 'default'">
            {{ statusLabel(row.status) }}
          </t-tag>
        </template>
        <template #mustChangePassword="{ row }">
          {{ row.mustChangePassword ? $t("settings.userManagement.yes") : $t("settings.userManagement.no") }}
        </template>
        <template #lastLoginAt="{ row }">
          {{ formatDate(row.lastLoginAt) }}
        </template>
        <template #actions="{ row }">
          <div class="actions">
            <t-tooltip :content="$t('settings.userManagement.editUser')">
              <t-button variant="text" shape="square" @click="openEditDialog(row)">
                <template #icon><i-edit /></template>
              </t-button>
            </t-tooltip>
            <t-tooltip :content="$t('settings.userManagement.resetPassword')">
              <t-button variant="text" shape="square" @click="openResetDialog(row)">
                <template #icon><i-lock /></template>
              </t-button>
            </t-tooltip>
          </div>
        </template>
      </t-table>
    </t-loading>

    <t-dialog
      v-model:visible="userDialogVisible"
      :header="editingUserId ? $t('settings.userManagement.editUser') : $t('settings.userManagement.addUser')"
      :confirm-btn="{ content: $t('common.save'), loading: saving }"
      :cancel-btn="$t('common.cancel')"
      width="520px"
      @confirm="saveUser">
      <t-form label-align="top" :data="userForm">
        <t-form-item :label="$t('settings.userManagement.username')">
          <t-input v-model="userForm.name" maxlength="20" />
        </t-form-item>
        <t-form-item v-if="!editingUserId" :label="$t('settings.userManagement.temporaryPassword')">
          <t-input v-model="userForm.password" type="password" maxlength="20" />
        </t-form-item>
        <t-form-item :label="$t('settings.userManagement.role')">
          <t-select v-model="userForm.role" :options="roleOptions" />
        </t-form-item>
        <t-form-item :label="$t('settings.userManagement.status')">
          <t-switch
            v-model="userForm.status"
            :custom-value="['enabled', 'disabled']"
            :label="[$t('settings.userManagement.enabled'), $t('settings.userManagement.disabled')]" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog
      v-model:visible="resetDialogVisible"
      :header="$t('settings.userManagement.resetPassword')"
      :confirm-btn="{ content: $t('common.confirm'), loading: saving }"
      :cancel-btn="$t('common.cancel')"
      width="480px"
      @confirm="resetPassword">
      <t-form label-align="top">
        <t-form-item :label="$t('settings.userManagement.temporaryPassword')">
          <t-input v-model="resetForm.password" type="password" maxlength="20" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import userStore, { type UserRole, type UserStatus } from "@/stores/user";

interface ManagedUser {
  id: number;
  name: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  createdAt: number | null;
  updatedAt: number | null;
  lastLoginAt: number | null;
}

const currentUserStore = userStore();
const { currentUser } = storeToRefs(currentUserStore);
const loading = ref(false);
const saving = ref(false);
const users = ref<ManagedUser[]>([]);
const userDialogVisible = ref(false);
const resetDialogVisible = ref(false);
const editingUserId = ref<number | null>(null);

const userForm = ref({
  name: "",
  password: "",
  role: "creator" as UserRole,
  status: "enabled" as UserStatus,
});

const resetForm = ref({
  id: 0,
  password: "",
});

const columns = [
  { colKey: "name", title: $t("settings.userManagement.username"), minWidth: 140 },
  { colKey: "role", title: $t("settings.userManagement.role"), width: 130, cell: "role" },
  { colKey: "status", title: $t("settings.userManagement.status"), width: 100, cell: "status" },
  {
    colKey: "mustChangePassword",
    title: $t("settings.userManagement.mustChangePassword"),
    width: 130,
    cell: "mustChangePassword",
  },
  { colKey: "lastLoginAt", title: $t("settings.userManagement.lastLogin"), minWidth: 170, cell: "lastLoginAt" },
  { colKey: "actions", title: $t("settings.userManagement.actions"), width: 100, cell: "actions" },
];

const roleOptions = computed(() => {
  const roles: UserRole[] = currentUser.value?.role === "super_admin" ? ["super_admin", "admin", "creator"] : ["creator"];
  return roles.map((role) => ({ label: roleLabel(role), value: role }));
});

function roleLabel(role: UserRole) {
  return $t(`settings.userManagement.roles.${role}`);
}

function statusLabel(status: UserStatus) {
  return $t(`settings.userManagement.${status}`);
}

function roleTheme(role: UserRole) {
  if (role === "super_admin") return "danger";
  if (role === "admin") return "warning";
  return "primary";
}

function formatDate(timestamp: number | null) {
  if (!timestamp) return $t("settings.userManagement.never");
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

async function fetchUsers() {
  loading.value = true;
  try {
    const response = await axios.get("/setting/userManagement/listUsers");
    users.value = response.data;
  } catch (error: any) {
    window.$message.error(error?.message || $t("settings.userManagement.fetchFailed"));
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  editingUserId.value = null;
  userForm.value = { name: "", password: "", role: "creator", status: "enabled" };
  userDialogVisible.value = true;
}

function openEditDialog(user: ManagedUser) {
  editingUserId.value = user.id;
  userForm.value = { name: user.name, password: "", role: user.role, status: user.status };
  userDialogVisible.value = true;
}

async function saveUser() {
  if (userForm.value.name.trim().length < 2) {
    window.$message.warning($t("settings.login.msg.usernameLength"));
    return;
  }
  if (!editingUserId.value && (userForm.value.password.length < 6 || userForm.value.password.length > 20)) {
    window.$message.warning($t("settings.login.msg.passwordLength"));
    return;
  }

  saving.value = true;
  try {
    if (editingUserId.value) {
      await axios.post("/setting/userManagement/updateUser", {
        id: editingUserId.value,
        name: userForm.value.name,
        role: userForm.value.role,
        status: userForm.value.status,
      });
      window.$message.success($t("settings.userManagement.updateSuccess"));
    } else {
      await axios.post("/setting/userManagement/createUser", userForm.value);
      window.$message.success($t("settings.userManagement.createSuccess"));
    }
    userDialogVisible.value = false;
    await fetchUsers();
  } catch (error: any) {
    window.$message.error(error?.message || $t("settings.userManagement.saveFailed"));
  } finally {
    saving.value = false;
  }
}

function openResetDialog(user: ManagedUser) {
  resetForm.value = { id: user.id, password: "" };
  resetDialogVisible.value = true;
}

async function resetPassword() {
  if (resetForm.value.password.length < 6 || resetForm.value.password.length > 20) {
    window.$message.warning($t("settings.login.msg.passwordLength"));
    return;
  }
  saving.value = true;
  try {
    await axios.post("/setting/userManagement/resetPassword", resetForm.value);
    window.$message.success($t("settings.userManagement.resetSuccess"));
    resetDialogVisible.value = false;
    await fetchUsers();
  } catch (error: any) {
    window.$message.error(error?.message || $t("settings.userManagement.saveFailed"));
  } finally {
    saving.value = false;
  }
}

onMounted(fetchUsers);
</script>

<style lang="scss" scoped>
.userManagement {
  width: 100%;

  .toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}
</style>
