<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div class="flex items-center gap-2">
          <div class="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sm"></div>
          <div class="text-lg font-semibold">SalonFlow</div>
        </div>
        <nav class="flex items-center gap-4 text-sm font-medium text-slate-700">
          <RouterLink class="hover:text-slate-900 transition-colors" to="/">Home</RouterLink>
          <RouterLink class="hover:text-slate-900 transition-colors" to="/start">Get Started</RouterLink>
          <RouterLink class="hover:text-slate-900 transition-colors" to="/check-in">Live Check-In</RouterLink>
        </nav>
      </div>
    </header>
    <main>
      <RouterView />
    </main>
    <footer class="border-t border-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <div>SalonFlow by Sudo Programmer, Inc.</div>
        <div>
          <a class="hover:text-slate-900 transition-colors" href="https://sudoprogrammer.com" target="_blank" rel="noreferrer">
            sudoprogrammer.com
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>
