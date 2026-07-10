<template>
  <div class="state" role="alert">
    <i-attention theme="outline" size="20" />
    <span>{{ message }}</span>
    <t-button v-if="retryable" size="small" variant="outline" @click="$emit('retry')">重试</t-button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ message: string; retryable?: boolean }>(), { retryable: false });
defineEmits<{ retry: [] }>();
</script>

<style scoped>
.state { display: flex; min-height: 120px; align-items: center; justify-content: center; flex-direction: column; gap: 8px; color: #b42318; font-size: 13px; text-align: center; }
</style>
