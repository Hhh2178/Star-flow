<template>
  <div class="brand-identity" :class="{ compact, inverse }">
    <img class="brand-identity__mark" :src="brand.markUrl" :alt="brand.markAlt" />
    <div v-if="!compact" class="brand-identity__copy">
      <strong>{{ brand.productName }}</strong>
      <span v-if="showDescriptor">{{ brand.chineseDescriptor }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { brand } from "@/assets/brand/brand";

withDefaults(defineProps<{
  compact?: boolean;
  inverse?: boolean;
  showDescriptor?: boolean;
}>(), {
  compact: false,
  inverse: false,
  showDescriptor: false,
});
</script>

<style scoped lang="scss">
.brand-identity {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  color: var(--stars-text, #172033);

  &__mark {
    display: block;
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
  }

  &__copy {
    display: grid;
    min-width: 0;
    gap: 2px;

    strong {
      font-size: 16px;
      line-height: 1.2;
    }

    span {
      overflow: hidden;
      color: var(--stars-text-muted, #667085);
      font-size: 11px;
      line-height: 1.3;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &.compact &__mark {
    width: 32px;
    height: 32px;
    flex-basis: 32px;
  }

  &.inverse {
    color: #fff;

    span {
      color: rgb(255 255 255 / 72%);
    }
  }
}
</style>
