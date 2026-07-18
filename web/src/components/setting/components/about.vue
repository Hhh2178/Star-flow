<template>
  <div class="about-page">
    <section class="product-panel">
      <BrandIdentity show-descriptor />
      <dl class="product-meta">
        <div>
          <dt>当前版本</dt>
          <dd>v{{ version || "-" }}</dd>
        </div>
        <div>
          <dt>运行形态</dt>
          <dd>{{ isElectron ? "桌面客户端" : "浏览器服务" }}</dd>
        </div>
        <div>
          <dt>产品定位</dt>
          <dd>{{ brand.chineseDescriptor }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import axios from "@/utils/axios";
import { brand } from "@/assets/brand/brand";
import BrandIdentity from "@/components/brand/BrandIdentity.vue";
import store from "@/stores/index";
import settingStore from "@/stores/setting";

const { version } = storeToRefs(store());
const { isElectron } = storeToRefs(settingStore());

onMounted(async () => {
  const { data } = await axios.get("/other/getVersion");
  version.value = data;
});
</script>

<style scoped lang="scss">
.about-page {
  width: 100%;
}

.product-panel {
  display: grid;
  gap: 24px;
  padding: 24px;
  border: 1px solid var(--stars-border, #dce5f2);
  border-radius: 8px;
  background: var(--stars-surface, #fff);
}

.product-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  border-top: 1px solid var(--stars-border, #dce5f2);
}

.product-meta div {
  display: grid;
  min-width: 0;
  gap: 6px;
  padding: 16px 18px 0 0;
}

.product-meta dt {
  color: var(--stars-text-muted, #667085);
  font-size: 12px;
}

.product-meta dd {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--stars-text, #172033);
  font-size: 14px;
  font-weight: 600;
}

@media (max-width: 680px) {
  .product-meta {
    grid-template-columns: 1fr;
  }
}
</style>
