<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { ElCard, ElDivider, ElTag, ElButton, ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { fetchOnboardingStatus, markQrPrinted } from '../../api/onboarding';

const router = useRouter();
const status = ref<Awaited<ReturnType<typeof fetchOnboardingStatus>> | null>(null);
const loading = ref(false);
const markingQr = ref(false);
const liveDomain =
  (import.meta.env.VITE_PUBLIC_APP_DOMAIN as string | undefined)?.replace(/^\s+|\s+$/g, '') ||
  'salonflow.app';

const quickNav = (name: string) => {
  router.push({ name });
};

const load = async () => {
  loading.value = true;
  try {
    status.value = await fetchOnboardingStatus(true);
    if (status.value.businessName) {
      localStorage.setItem('businessName', status.value.businessName);
    }
    if (status.value.completed) {
      router.replace({ name: 'admin-dashboard' });
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load onboarding');
  } finally {
    loading.value = false;
  }
};

const handleMarkQrPrinted = async () => {
  markingQr.value = true;
  try {
    status.value = await markQrPrinted();
    ElMessage.success('Marked QR as printed.');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to mark QR printed');
  } finally {
    markingQr.value = false;
  }
};

onMounted(load);

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

const buildLiveLink = (path: string) => {
  if (!status.value?.subdomain) return '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = hostname.includes('localhost');
  if (isLocal) {
    return `${window.location.origin}/${path}`;
  }
  return `https://${status.value.subdomain}.${liveDomain}/${path}`;
};

const bookingLink = computed(() => buildLiveLink('book'));
const checkinLink = computed(() => buildLiveLink('check-in'));

const copyLink = async (link: string) => {
  if (!link) return;
  if (navigator?.clipboard) {
    await navigator.clipboard.writeText(link);
    ElMessage.success('Copied link');
  }
};

const openLink = (link: string) => {
  if (!link) return;
  window.open(link, '_blank');
};

const progress = computed(() => {
  if (!status.value) return 0;
  const steps = [
    status.value.servicesAdded,
    status.value.staffAdded,
    status.value.qrPrinted,
    status.value.reviewSmsEnabled,
    status.value.billingReady,
  ];
  const done = steps.filter(Boolean).length;
  return Math.round((done / steps.length) * 100);
});

const completedCount = computed(() => {
  if (!status.value) return 0;
  return [
    status.value.servicesAdded,
    status.value.staffAdded,
    status.value.qrPrinted,
    status.value.reviewSmsEnabled,
    status.value.billingReady,
  ].filter(Boolean).length;
});

const stepsList = computed(() => [
  {
    label: 'Services added',
    done: status.value?.servicesAdded ?? false,
    action: () => quickNav('admin-services'),
    cta: 'Add service',
  },
  {
    label: 'Staff added',
    done: status.value?.staffAdded ?? false,
    action: () => quickNav('admin-staff'),
    cta: 'Add staff',
  },
  {
    label: 'QR printed',
    done: status.value?.qrPrinted ?? false,
    action: () => quickNav('admin-qr'),
    cta: 'View QR',
  },
  {
    label: 'Review SMS enabled',
    done: status.value?.reviewSmsEnabled ?? false,
    action: () => quickNav('admin-review-sms'),
    cta: 'Enable Review SMS',
  },
  {
    label: 'Billing ready',
    done: status.value?.billingReady ?? false,
    action: () => quickNav('admin-billing'),
    cta: 'Go to Billing',
  },
]);

const nextStep = computed(() => stepsList.value.find((s) => !s.done));
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-semibold text-slate-900">Owner Onboarding</h1>
          <ElTag type="success" effect="light" v-if="status?.completed">Completed</ElTag>
        </div>
        <p class="text-sm text-slate-600">
          This checklist updates automatically as you set up your salon. Complete steps in any order.
        </p>
      </div>
      <ElButton plain size="small" @click="quickNav('admin-dashboard')">
        Skip for now
      </ElButton>
    </div>

    <ElCard class="bg-white" :loading="loading">
      <div class="flex flex-col gap-2">
        <div class="text-sm font-semibold text-slate-900">
          Onboarding progress: {{ progress }}%
        </div>
        <div class="h-2 rounded-full bg-slate-200">
          <div
            class="h-2 rounded-full bg-sky-500 transition-all"
            :style="{ width: `${progress}%` }"
          />
        </div>
        <div class="text-xs text-slate-600">
          {{ completedCount }} / 5 steps completed
        </div>
        <div
          v-if="nextStep && !status?.completed"
          class="mt-2 flex items-center justify-between rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-slate-700"
        >
          <div class="font-semibold text-slate-900">Next up: {{ nextStep.label }}</div>
          <ElButton type="primary" size="small" @click="nextStep.action">
            {{ nextStep.cta }}
          </ElButton>
        </div>
        <div
          v-else-if="status?.completed"
          class="mt-2 flex items-center justify-between rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
        >
          <div class="font-semibold">Onboarding complete</div>
          <ElButton type="primary" size="small" @click="quickNav('admin-dashboard')">
            Go to Dashboard
          </ElButton>
        </div>
      </div>
    </ElCard>

    <ElCard class="bg-white" :loading="loading">
      <div class="grid gap-3">
        <div
          v-for="(item, idx) in stepsList"
          :key="idx"
          class="flex flex-col gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-2 text-sm text-slate-900">
            <ElTag :type="item.done ? 'success' : 'info'" effect="light">
              {{ item.label }}
            </ElTag>
            <span class="text-xs text-slate-600">{{ item.done ? 'Done' : 'Not done' }}</span>
          </div>
          <div class="flex gap-2">
            <ElButton
              v-if="item.label === 'QR printed' && !item.done"
              type="primary"
              size="small"
              :loading="markingQr"
              @click="handleMarkQrPrinted"
            >
              Mark printed
            </ElButton>
            <ElButton
              :type="item.done ? 'default' : 'primary'"
              size="small"
              :disabled="item.done"
              @click="item.action"
            >
              {{ item.done ? 'Completed' : item.cta }}
            </ElButton>
          </div>
        </div>
      </div>
    </ElCard>

    <ElCard class="bg-white">
      <div class="flex flex-col gap-3">
        <div class="text-lg font-semibold text-slate-900">You’re Live</div>
        <ElDivider class="my-0" />
        <ul class="space-y-2 text-sm text-slate-700">
          <li>• Handle walk-ins with QR or desk check-in</li>
          <li>• Manage staff queues and appointments</li>
          <li>• Track loyalty, VIP tiers, and redemptions</li>
          <li>• Send review requests and reminders (consent-based)</li>
          <li>• See performance in your admin dashboards</li>
        </ul>
        <div class="flex flex-wrap gap-2">
          <ElButton type="primary" plain @click="quickNav('admin-dashboard')">
            Go to Dashboard
          </ElButton>
          <ElButton @click="quickNav('admin-services')">Start with Services</ElButton>
        </div>
      </div>
    </ElCard>

    <ElCard class="bg-white">
      <div class="flex flex-col gap-3">
        <div class="text-lg font-semibold text-slate-900">Your Live Links</div>
        <p class="text-sm text-slate-600">
          Share these with customers. Booking is public; check-in can be placed behind a QR.
        </p>
        <div class="grid gap-3 md:grid-cols-2">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div class="text-sm font-semibold text-slate-900">Booking</div>
            <div class="mt-1 break-words text-sm text-slate-700">
              {{ bookingLink || 'Loading…' }}
            </div>
            <div class="mt-3 flex gap-2">
              <ElButton type="primary" size="small" @click="copyLink(bookingLink)">
                Copy booking link
              </ElButton>
              <ElButton size="small" :disabled="!bookingLink" @click="openLink(bookingLink)">
                Open
              </ElButton>
            </div>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div class="text-sm font-semibold text-slate-900">Check-In</div>
            <div class="mt-1 break-words text-sm text-slate-700">
              {{ checkinLink || 'Loading…' }}
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <ElButton type="primary" size="small" @click="copyLink(checkinLink)">
                Copy check-in link
              </ElButton>
              <ElButton size="small" :disabled="!checkinLink" @click="openLink(checkinLink)">
                Open
              </ElButton>
              <ElButton size="small" @click="quickNav('admin-qr')">Download QR</ElButton>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <ElButton size="small" @click="quickNav('admin-staff')">Invite staff</ElButton>
          <ElButton size="small" @click="quickNav('admin-dashboard')">View dashboard</ElButton>
        </div>
      </div>
    </ElCard>
  </div>
</template>
