<template>
  <div class="marketing-shell flex flex-col bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <RouterLink to="/" class="flex items-center gap-1.5">
          <img :src="logo" alt="SalonFlow" class="brand-logo" />
          <div class="hidden text-lg font-semibold text-slate-900 sm:inline">SalonFlow</div>
        </RouterLink>
      <nav class="flex items-center gap-4 text-sm font-medium text-slate-700">
        <RouterLink class="hover:text-slate-900 transition-colors" to="/">Home</RouterLink>
        <RouterLink class="hover:text-slate-900 transition-colors" to="/start">Get Started</RouterLink>
        <RouterLink class="hover:text-slate-900 transition-colors" to="/salon-login">Login</RouterLink>
      </nav>
      </div>
    </header>
    <main class="marketing-content flex-1">
      <RouterView />
    </main>
    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import SiteFooter from '../components/SiteFooter.vue';
import logo from '../assets/images/salonflow-logo.png';
</script>

<style scoped>
.marketing-shell {
  height: 100vh;
  min-height: 0;
  overflow: hidden;
}
.marketing-content {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
