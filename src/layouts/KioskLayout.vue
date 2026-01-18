<template>
  <div class="min-h-screen bg-slate-900 text-white">
    <router-view />
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.min-h-screen {
  background: radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.2), transparent 40%),
    radial-gradient(circle at 80% 0%, rgba(59, 130, 246, 0.25), transparent 35%),
    linear-gradient(135deg, #0f172a, #0b132b 45%, #111827);
}
</style>
