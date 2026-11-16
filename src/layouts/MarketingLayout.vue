<template>
  <div class="marketing-shell flex flex-col bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <RouterLink to="/" class="flex items-center gap-1.5">
          <img :src="logo" alt="SalonFlow" class="brand-logo" />
          <div class="hidden font-['Space_Grotesk'] text-lg font-semibold text-slate-900 sm:inline">SalonFlow</div>
        </RouterLink>
        <nav class="flex items-center gap-1.5 text-sm font-medium text-slate-700 sm:gap-2 lg:gap-3">
          <a class="hidden rounded-full px-3 py-2 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:inline-flex" href="/#features">
            Features
          </a>
          <a class="hidden rounded-full px-3 py-2 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:inline-flex" href="/#workflow">
            How It Works
          </a>
          <a class="hidden rounded-full px-3 py-2 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:inline-flex" href="/#pricing">
            Pricing
          </a>
          <RouterLink class="rounded-full px-3 py-2 transition-colors hover:bg-slate-100 hover:text-slate-900" to="/salon-login">
            Login
          </RouterLink>
          <RouterLink
            class="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:px-5"
            to="/start"
          >
            Try the Demo
          </RouterLink>
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
