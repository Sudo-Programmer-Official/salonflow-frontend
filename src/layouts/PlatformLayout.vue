<template>
  <div class="platform-shell flex flex-col bg-white text-slate-900">
    <div class="platform-body flex flex-1">
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
        <RouterLink
          to="/platform/demo-requests"
          class="block rounded-md px-3 py-2 transition hover:bg-white hover:text-slate-900"
          active-class="bg-white text-slate-900 shadow-sm"
        >
          Demo requests
        </RouterLink>
        <RouterLink
          to="/platform/features"
          class="block rounded-md px-3 py-2 transition hover:bg-white hover:text-slate-900"
          active-class="bg-white text-slate-900 shadow-sm"
        >
          Feature flags
        </RouterLink>
        <RouterLink
          to="/platform/usage"
          class="block rounded-md px-3 py-2 transition hover:bg-white hover:text-slate-900"
          active-class="bg-white text-slate-900 shadow-sm"
        >
          Usage
        </RouterLink>
        <RouterLink
          to="/platform/plans"
          class="block rounded-md px-3 py-2 transition hover:bg-white hover:text-slate-900"
          active-class="bg-white text-slate-900 shadow-sm"
        >
          Plans
        </RouterLink>
        <RouterLink
          to="/platform/invoice-preview"
          class="block rounded-md px-3 py-2 transition hover:bg-white hover:text-slate-900"
          active-class="bg-white text-slate-900 shadow-sm"
        >
          Invoice preview
        </RouterLink>
        <RouterLink
          to="/platform/upgrade-requests"
          class="block rounded-md px-3 py-2 transition hover:bg-white hover:text-slate-900"
          active-class="bg-white text-slate-900 shadow-sm"
        >
          <span class="inline-flex items-center gap-2">
            <span>Upgrade requests</span>
            <span
              v-if="upgradeCount > 0"
              class="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white"
            >
              {{ upgradeCount }}
            </span>
          </span>
        </RouterLink>
        <RouterLink
          to="/platform/settings/alerts"
          class="block rounded-md px-3 py-2 transition hover:bg-white hover:text-slate-900"
          active-class="bg-white text-slate-900 shadow-sm"
        >
          Alert emails
        </RouterLink>
      </nav>
      </aside>
      <main class="platform-content flex-1 p-4 sm:p-6">
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

<script setup lang="ts">
import { logout } from '../utils/auth';
import { onMounted, onUnmounted, ref } from 'vue';
import { fetchUpgradeRequestCount } from '../api/upgradeRequestsCount';

const handleLogout = () => logout('/app/login');

const upgradeCount = ref(0);
const loadCount = async () => {
  try {
    upgradeCount.value = await fetchUpgradeRequestCount();
  } catch {
    upgradeCount.value = 0;
  }
};

const timerId = ref<number | null>(null);

onMounted(() => {
  loadCount();
  timerId.value = window.setInterval(loadCount, 30000);
  window.addEventListener('focus', loadCount);
});

onUnmounted(() => {
  if (timerId.value) clearInterval(timerId.value);
  window.removeEventListener('focus', loadCount as any);
});
</script>

<style scoped>
.platform-shell {
  height: 100vh;
  overflow: hidden;
}
.platform-body {
  min-height: 0;
}
.platform-content {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
