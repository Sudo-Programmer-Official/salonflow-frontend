<template>
  <div
    class="kiosk-app kiosk-frame relative"
    :data-kiosk-theme="kioskTheme"
    :data-kiosk-primary="kioskPrimary"
  >
    <router-view v-if="!maintenanceActive" />
    <div v-else class="absolute inset-0 flex items-center justify-center">
      <MaintenanceBanner :message="maintenanceMessage || undefined" mode="fullscreen" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { maintenanceActive, maintenanceMessage } from '../api/maintenance';
import MaintenanceBanner from '../components/MaintenanceBanner.vue';

const kioskTheme = ref('black-glass');
const kioskPrimary = ref('gold');
let observer: MutationObserver | null = null;

const syncFromRoot = () => {
  if (typeof document === 'undefined') return;
  const { dataset } = document.documentElement;
  kioskTheme.value = dataset.kioskTheme || 'black-glass';
  kioskPrimary.value = dataset.kioskPrimary || 'gold';
};

onMounted(() => {
  syncFromRoot();
  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(syncFromRoot);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-kiosk-theme', 'data-kiosk-primary'] });
  }
});

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});
</script>

<style scoped>
.kiosk-frame {
  min-height: 100vh;
  background: var(--bg-app);
  color: var(--kiosk-text-primary, #fff);
}
</style>
