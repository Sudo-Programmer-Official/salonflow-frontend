<script setup lang="ts">
import { logout } from '../utils/auth';

const handleLogout = () => logout('/login');
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <main class="mx-auto flex max-w-2xl flex-col px-4 py-6 sm:px-6">
      <div class="mb-4 flex items-center justify-between">
        <div class="text-sm font-medium text-slate-800">Staff</div>
        <button
          type="button"
          class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          @click="handleLogout"
        >
          Logout
        </button>
      </div>
      <slot />
    </main>
  </div>
</template>
