<template><div class="state"><i-inbox theme="outline" size="22" /><span>{{ text }}</span></div></template>
<script setup lang="ts">withDefaults(defineProps<{ text?: string }>(), { text: "暂无数据" });</script>
<style scoped>.state { display: flex; min-height: 120px; align-items: center; justify-content: center; flex-direction: column; gap: 7px; color: var(--stars-text-muted); font-size: 13px; }</style>
