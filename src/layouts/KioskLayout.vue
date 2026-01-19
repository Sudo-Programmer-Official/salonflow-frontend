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
  background:
    radial-gradient(1200px 600px at 20% 10%, rgba(0, 120, 255, 0.18), transparent),
    radial-gradient(1000px 800px at 80% 30%, rgba(0, 80, 200, 0.14), transparent),
    linear-gradient(180deg, #0a1630, #050b1a);
}
</style>
