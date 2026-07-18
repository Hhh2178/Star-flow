<template><div class="state" role="status"><i-loading-three class="spin" theme="outline" size="18" /><span>{{ text }}</span></div></template>
<script setup lang="ts">withDefaults(defineProps<{ text?: string }>(), { text: "加载中..." });</script>
<style scoped>.state { display: flex; min-height: 120px; align-items: center; justify-content: center; gap: 8px; color: var(--stars-text-muted); font-size: 13px; } .spin { animation: spin 800ms linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }</style>
