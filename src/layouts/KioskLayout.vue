<template>
  <div
    class="kiosk-app kiosk-frame"
    :data-kiosk-theme="kioskTheme"
    :data-kiosk-primary="kioskPrimary"
  >
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

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
