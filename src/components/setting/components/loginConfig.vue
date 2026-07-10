<template>
  <t-loading :loading="loading">
    <t-alert v-if="currentUser?.mustChangePassword" class="passwordAlert" theme="warning">
      {{ $t("settings.login.mustChangePassword") }}
    </t-alert>
    <t-form ref="formRef" labelAlign="top" :data="formData" :rules="formRules" :colon="true" @submit="handleSubmit" @reset="handleReset">
      <t-form-item :label="$t('settings.login.username')" name="name">
        <t-input v-model="formData.name" :placeholder="$t('settings.login.usernamePlaceholder')" clearable width="100%" />
      </t-form-item>
      <t-form-item :label="$t('settings.login.password')" name="password">
        <t-input v-model="formData.password" type="password" :placeholder="$t('settings.login.optionalPasswordPlaceholder')" />
      </t-form-item>
      <t-form-item :status-icon="false">
        <t-space size="small">
          <t-button theme="primary" type="submit" :loading="loading">{{ $t("settings.login.modify") }}</t-button>
        </t-space>
      </t-form-item>
    </t-form>
  </t-loading>
</template>

<script setup lang="ts">
import type { FormInstanceFunctions, SubmitContext, FormRules } from "tdesign-vue-next";
import axios from "@/utils/axios";
import userStore from "@/stores/user";

interface UserForm {
  name: string;
  password: string;
}

const formRef = ref<FormInstanceFunctions | null>(null);
const loading = ref(false);
const currentUserStore = userStore();
const { currentUser } = storeToRefs(currentUserStore);

const formData = ref<UserForm>({
  name: "",
  password: "",
});

const formRules: FormRules<UserForm> = {
  name: [
    { required: true, message: $t("settings.login.msg.enterUsername"), trigger: "blur" },
    { min: 2, max: 20, message: $t("settings.login.msg.usernameLength"), trigger: "blur" },
  ],
  password: [
    {
      validator: (value) => !value || (String(value).length >= 6 && String(value).length <= 20),
      message: $t("settings.login.msg.passwordLength"),
      trigger: "blur",
    },
  ],
};

async function fetchUserInfo() {
  try {
    const user = await currentUserStore.fetchCurrentUser();
    formData.value = { name: user?.name ?? "", password: "" };
  } catch (error) {
    window.$message.error($t("settings.login.msg.fetchFailed"));
  }
}

async function saveUserInfo() {
  loading.value = true;
  try {
    const payload: { name: string; password?: string } = { name: formData.value.name };
    if (formData.value.password) payload.password = formData.value.password;
    await axios.post("/setting/loginConfig/updateUserPwd", payload);
    window.$message.success($t("settings.login.msg.saveSuccess"));
    await fetchUserInfo();
  } catch (error) {
    window.$message.error($t("settings.login.msg.saveFailed"));
  } finally {
    loading.value = false;
  }
}

function handleSubmit(context: SubmitContext) {
  if (context.validateResult === true) {
    saveUserInfo();
  }
}

function handleReset() {
  formRef.value?.reset();
}

onMounted(() => {
  fetchUserInfo();
});
</script>

<style lang="scss" scoped>
.passwordAlert {
  margin-bottom: 16px;
}
</style>
