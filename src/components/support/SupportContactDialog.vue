<template>
  <t-dialog v-model:visible="visible" :header="contact.title || '联系支持'" :footer="false" width="420px">
    <div class="support-contact" data-testid="support-contact-dialog">
      <div v-if="loading" class="support-state">正在加载联系方式…</div>
      <div v-else-if="loadError" class="support-state support-error">{{ loadError }}</div>
      <div v-else-if="!contact.enabled" class="support-state">当前暂未启用联系支持，请稍后再试</div>
      <template v-else>
        <img v-if="contact.qrCodeUrl" class="support-qr" :src="contact.qrCodeUrl" alt="微信联系二维码" />
        <div class="support-copy-row">
          <div>
            <span>微信号</span>
            <strong>{{ contact.wechatId }}</strong>
          </div>
          <t-button data-testid="copy-wechat" size="small" variant="outline" @click="copyWechat">复制微信号</t-button>
        </div>
        <p v-if="contact.description" class="support-description">{{ contact.description }}</p>
        <p v-if="copied" class="support-copied" role="status">微信号已复制</p>
      </template>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import axios from "@/utils/axios";

interface PublicSupportContact {
  enabled: boolean;
  type: "wechat";
  title: string;
  wechatId: string;
  qrCodeUrl: string | null;
  description: string;
}

const visible = defineModel<boolean>({ default: false });
const contact = reactive<PublicSupportContact>({
  enabled: false,
  type: "wechat",
  title: "联系支持",
  wechatId: "",
  qrCodeUrl: null,
  description: "",
});
const loading = ref(false);
const loadError = ref("");
const copied = ref(false);

async function loadContact() {
  loading.value = true;
  loadError.value = "";
  copied.value = false;
  try {
    const response = await axios.get("/public/support/getContact");
    Object.assign(contact, response.data);
  } catch {
    loadError.value = "联系方式加载失败，请稍后重试";
  } finally {
    loading.value = false;
  }
}

async function copyWechat() {
  if (!contact.wechatId) return;
  await navigator.clipboard.writeText(contact.wechatId);
  copied.value = true;
}

watch(visible, (open) => {
  if (open) void loadContact();
}, { immediate: true });
</script>

<style scoped lang="scss">
.support-contact { display: grid; gap: 16px; padding: 4px 2px 12px; }
.support-state { padding: 32px 16px; color: var(--td-text-color-secondary); text-align: center; }
.support-error { color: var(--td-error-color); }
.support-qr { width: 220px; height: 220px; margin: 0 auto; border: 1px solid var(--stars-border); border-radius: 8px; object-fit: contain; }
.support-copy-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px; border: 1px solid var(--stars-border); border-radius: 8px; background: var(--stars-surface-soft); }
.support-copy-row div { display: grid; gap: 3px; }
.support-copy-row span, .support-description { color: var(--td-text-color-secondary); font-size: 12px; }
.support-copy-row strong { font-size: 15px; }
.support-description, .support-copied { margin: 0; text-align: center; }
.support-copied { color: var(--td-success-color); font-size: 12px; }
</style>
