<template>
  <div class="kiosk-frame text-white">
    <router-view />
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.kiosk-frame {
  min-height: 100vh;
  background: var(--bg-app);
  color: var(--text-color);
}
</style>
