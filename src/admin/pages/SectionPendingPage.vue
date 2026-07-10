<template>
  <section class="pending-page">
    <header>
      <h1>{{ route.meta.title }}</h1>
      <t-tag variant="outline">待建设</t-tag>
    </header>
    <div class="pending-line" />
  </section>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();
</script>

<style scoped lang="scss">
.pending-page {
  width: min(100%, 1120px);
  margin: 0 auto;
}

.pending-page header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.pending-page h1 {
  margin: 0;
  color: var(--stars-text);
  font-size: 20px;
  letter-spacing: 0;
}

.pending-line {
  height: 1px;
  margin-top: 16px;
  background: var(--stars-border);
}
</style>
