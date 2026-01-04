<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { fetchOnboardingStatus } from '../api/onboarding';

const loading = ref(true);
const status = ref<Awaited<ReturnType<typeof fetchOnboardingStatus>> | null>(null);
const error = ref('');

const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    status.value = await fetchOnboardingStatus();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load onboarding';
  } finally {
    loading.value = false;
  }
};

const pollId = ref<number | null>(null);

const startPolling = () => {
  if (pollId.value !== null) return;
  pollId.value = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      load();
    }
  }, 12000);
};

const stopPolling = () => {
  if (pollId.value !== null) {
    clearInterval(pollId.value);
    pollId.value = null;
  }
};

onMounted(() => {
  load();
  startPolling();
});

onBeforeUnmount(() => {
  stopPolling();
});

const steps = computed(() => {
  if (!status.value) return { services: false, staff: false, qrPrinted: false, reviewSmsEnabled: false, billingReady: false };
  return {
    services: status.value.servicesAdded,
    staff: status.value.staffAdded,
    qrPrinted: status.value.qrPrinted,
    reviewSmsEnabled: status.value.reviewSmsEnabled,
    billingReady: status.value.billingReady,
  };
});

const progress = computed(() => {
  const values = Object.values(steps.value);
  const done = values.filter(Boolean).length;
  return Math.round((done / values.length) * 100);
});
</script>

<template>
  <div class="space-y-3">
    <div
      v-if="error"
      class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800"
    >
      {{ error }}
    </div>

    <div v-if="status && !status.completed" class="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-semibold text-slate-900">
            Onboarding progress: {{ progress }}%
          </div>
          <div class="text-xs text-slate-600">
            {{ Object.values(steps).filter(Boolean).length }}/{{ Object.values(steps).length }} steps completed
          </div>
        </div>
      </div>
      <div class="mt-3 h-2 w-full rounded-full bg-slate-200">
        <div
          class="h-2 rounded-full bg-sky-600 transition-all"
          :style="{ width: `${progress}%` }"
        />
      </div>
      <div class="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-700 sm:grid-cols-2">
        <div>• Services added: <strong>{{ steps.services ? 'Yes' : 'No' }}</strong></div>
        <div>• Staff added: <strong>{{ steps.staff ? 'Yes' : 'No' }}</strong></div>
        <div>• QR printed: <strong>{{ steps.qrPrinted ? 'Yes' : 'No' }}</strong></div>
        <div>• Review SMS enabled: <strong>{{ steps.reviewSmsEnabled ? 'Yes' : 'No' }}</strong></div>
        <div>• Billing ready: <strong>{{ steps.billingReady ? 'Yes' : 'No' }}</strong></div>
      </div>
      <div v-if="steps.services && !steps.qrPrinted" class="mt-3">
        <a
          class="inline-flex items-center justify-center rounded-md border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"
          href="/admin/qr"
        >
          🎯 Next: Print your check-in QR
        </a>
      </div>
    </div>

    <div v-else-if="status && status.completed" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      Onboarding complete. You’re good to go!
    </div>

    <div v-if="loading" class="text-xs text-slate-500">Loading onboarding...</div>
  </div>
</template>
