<template>
  <header class="page-header">
    <div class="page-header-copy">
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header-actions"><slot name="actions" /></div>
  </header>
</template>

<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>

<style scoped>
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.page-header-copy { min-width: 0; }
h1 { margin: 0; color: var(--stars-text); font-size: 20px; line-height: 1.35; letter-spacing: 0; }
p { margin: 4px 0 0; color: var(--stars-text-muted); font-size: 12px; line-height: 1.5; }
.page-header-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
@media (max-width: 640px) { .page-header { align-items: stretch; flex-direction: column; } .page-header-actions { justify-content: flex-start; } }
</style>
