<template>
  <div class="flex min-h-screen flex-col bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <RouterLink to="/" class="flex items-center gap-1.5">
          <img :src="logo" alt="SalonFlow" class="h-8 w-auto rounded-lg shadow-sm" />
          <div class="hidden text-lg font-semibold text-slate-900 sm:inline">SalonFlow</div>
        </RouterLink>
        <nav class="flex items-center gap-4 text-sm font-medium text-slate-700">
          <RouterLink class="hover:text-slate-900 transition-colors" to="/">Home</RouterLink>
          <RouterLink class="hover:text-slate-900 transition-colors" to="/start">Get Started</RouterLink>
          <RouterLink class="hover:text-slate-900 transition-colors" to="/salon-login">Login</RouterLink>
        </nav>
      </div>
    </header>
    <main class="flex-1">
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
