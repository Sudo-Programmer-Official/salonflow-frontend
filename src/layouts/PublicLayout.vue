<template>
  <div class="public-shell flex flex-col text-slate-900">
    <header class="border-b border-white/30 bg-white/70 backdrop-blur font-[var(--ui-font-family)]">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <RouterLink to="/" class="flex items-center gap-1.5">
          <img :src="logo" alt="SalonFlow" class="brand-logo" />
          <div class="hidden text-lg font-semibold text-slate-900 sm:inline">SalonFlow</div>
        </RouterLink>
        <nav class="flex items-center gap-4 text-sm font-medium text-slate-700">
          <RouterLink class="hover:text-slate-900 transition-colors" to="/">Home</RouterLink>
          <RouterLink class="hover:text-slate-900 transition-colors" to="/start">Get Started</RouterLink>
          <RouterLink class="hover:text-slate-900 transition-colors" to="/check-in">Live Check-In</RouterLink>
        </nav>
      </div>
    </header>
    <main class="public-content mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:px-6">
      <MaintenanceBanner
        v-if="maintenanceActive"
        class="mb-4"
        :message="maintenanceMessage || undefined"
        mode="banner"
      />
      <router-view />
    </main>
    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { maintenanceActive, maintenanceMessage } from '../api/maintenance';
import SiteFooter from '../components/SiteFooter.vue';
import MaintenanceBanner from '../components/MaintenanceBanner.vue';
import logo from '../assets/images/salonflow-logo.png';
</script>

<style scoped>
.public-shell {
  height: 100vh;
  overflow: hidden;
}
.public-content {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
