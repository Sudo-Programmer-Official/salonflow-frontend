<script setup lang="ts">
import { computed } from 'vue';
import OnboardingProgress from '../components/OnboardingProgress.vue';

const isOwner = computed(() => localStorage.getItem('role') === 'OWNER');
</script>

<template>
  <div class="min-h-screen bg-white">
    <main class="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8 sm:px-6">
      <OnboardingProgress v-if="isOwner" />
      <slot />
    </main>
  </div>
</template>
