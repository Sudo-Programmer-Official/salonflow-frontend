<script setup lang="ts">
import { logout } from '../utils/auth';

const handleLogout = () => logout('/login');
</script>

<template>
  <div class="min-h-screen bg-white text-slate-900">
    <div class="flex min-h-screen">
      <aside class="hidden w-64 border-r border-slate-200 bg-slate-50/70 p-4 sm:block">
        <div class="mb-6 text-sm font-semibold text-slate-700">Platform</div>
        <nav class="space-y-2 text-sm font-medium text-slate-700">
          <RouterLink
            to="/platform"
            class="block rounded-md px-3 py-2 transition hover:bg-white hover:text-slate-900"
            active-class="bg-white text-slate-900 shadow-sm"
          >
            Dashboard
          </RouterLink>
          <RouterLink
            to="/platform/create-tenant"
            class="block rounded-md px-3 py-2 transition hover:bg-white hover:text-slate-900"
            active-class="bg-white text-slate-900 shadow-sm"
          >
            Create tenant
          </RouterLink>
        </nav>
      </aside>
      <main class="flex-1 p-4 sm:p-6">
        <div class="mb-4 flex items-center justify-between">
          <div class="text-sm text-slate-600">Signed in as Platform Admin</div>
          <button
            type="button"
            class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            @click="handleLogout"
          >
            Logout
          </button>
        </div>
        <RouterView />
      </main>
    </div>
  </div>
</template>
