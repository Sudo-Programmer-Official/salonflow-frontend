<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { ElCard, ElDivider, ElTag, ElButton, ElMessage, ElInput, ElSelect, ElOption } from 'element-plus';
import { useRouter } from 'vue-router';
import { fetchOnboardingStatus, markQrPrinted, updateOnboardingLocation } from '../../api/onboarding';
import { DEFAULT_TIMEZONE, setBusinessTimezone } from '../../utils/dates';

const router = useRouter();
const status = ref<Awaited<ReturnType<typeof fetchOnboardingStatus>> | null>(null);
const loading = ref(false);
const markingQr = ref(false);
const savingLocation = ref(false);
const countryCode = ref('US');
const postalCode = ref('');
const timezone = ref(DEFAULT_TIMEZONE);
const rawLiveDomain =
  (import.meta.env.VITE_PUBLIC_APP_DOMAIN as string | undefined)?.replace(/^\s+|\s+$/g, '') ||
  'salonflow.app';
// If the env value includes a leading www, strip it because we prepend the tenant subdomain.
const liveDomain = rawLiveDomain.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');

const timezoneOptions = [
  { value: 'America/New_York', label: 'America/New_York (Eastern)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central)' },
  { value: 'America/Denver', label: 'America/Denver (Mountain)' },
  { value: 'America/Phoenix', label: 'America/Phoenix (Mountain, no DST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific)' },
  { value: 'America/Anchorage', label: 'America/Anchorage (Alaska)' },
  { value: 'Pacific/Honolulu', label: 'Pacific/Honolulu (Hawaii)' },
];

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
    countryCode.value = status.value.countryCode?.trim() || 'US';
    postalCode.value = status.value.postalCode?.trim() || '';
    timezone.value = status.value.timezone?.trim() || DEFAULT_TIMEZONE;
    setBusinessTimezone(timezone.value);
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
  const isLocal = hostname.includes('localhost') || hostname.startsWith('127.');
  if (isLocal) {
    return `${window.location.origin}/${path}`;
  }
  return `https://${status.value.subdomain}.${liveDomain}/${path}`;
};

const bookingLink = computed(() => buildLiveLink('book'));
const checkinLink = computed(() => buildLiveLink('check-in'));
const kioskLink = computed(() => buildLiveLink('check-in/kiosk'));

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

const saveLocation = async () => {
  const cc = countryCode.value.trim();
  const zip = postalCode.value.trim();
  if (!cc || !zip) {
    ElMessage.error('Country and ZIP / Postal Code are required');
    return;
  }
  if (!/^[a-zA-Z0-9 \-]+$/.test(zip)) {
    ElMessage.error('ZIP / Postal Code must be letters, numbers, spaces, or dashes');
    return;
  }
  const tz = timezone.value || DEFAULT_TIMEZONE;
  savingLocation.value = true;
  try {
    status.value = await updateOnboardingLocation({
      countryCode: cc,
      postalCode: zip,
      timezone: tz,
    });
    countryCode.value = status.value.countryCode?.trim() || cc;
    postalCode.value = status.value.postalCode?.trim() || zip;
    timezone.value = status.value.timezone?.trim() || tz;
    setBusinessTimezone(timezone.value);
    ElMessage.success('Location updated');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to update location');
  } finally {
    savingLocation.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-semibold text-slate-900">Owner Onboarding</h1>
          <ElTag type="success" effect="light" v-if="status?.completed">Completed</ElTag>
        </div>
        <p class="text-sm text-slate-600" v-if="!status?.completed">
          This checklist updates automatically as you set up your salon. Complete steps in any order.
        </p>
        <p class="text-sm text-slate-600" v-else>
          Onboarding is finished. You can review or update any step at any time.
        </p>
      </div>
      <ElButton plain size="small" class="sf-btn sf-btn--table" @click="quickNav('admin-dashboard')">
        {{ status?.completed ? 'Back to dashboard' : 'Skip for now' }}
      </ElButton>
    </div>

    <ElCard class="bg-white" :loading="loading">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="space-y-1">
          <label class="text-sm font-semibold text-slate-800">Timezone</label>
          <ElSelect v-model="timezone" filterable placeholder="Select timezone">
            <ElOption v-for="zone in timezoneOptions" :key="zone.value" :label="zone.label" :value="zone.value" />
          </ElSelect>
          <p class="text-xs text-slate-500">Used for displaying dates/times in your dashboards.</p>
        </div>
        <div class="space-y-1">
          <label class="text-sm font-semibold text-slate-800">Country</label>
          <ElInput
            v-model="countryCode"
            placeholder="US"
            maxlength="4"
            clearable
          />
          <p class="text-xs text-slate-500">Required. Used for regional settings and messaging.</p>
        </div>
        <div class="space-y-1">
          <label class="text-sm font-semibold text-slate-800">ZIP / Postal Code</label>
          <ElInput
            v-model="postalCode"
            placeholder="e.g., 94103"
            clearable
          />
          <p class="text-xs text-slate-500">Used for regional settings and analytics.</p>
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <ElButton type="primary" class="sf-btn" :loading="savingLocation" @click="saveLocation">
          Save location
        </ElButton>
      </div>
    </ElCard>

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
          <ElButton type="primary" size="small" class="sf-btn sf-btn--table" @click="nextStep.action">
            {{ nextStep.cta }}
          </ElButton>
        </div>
        <div
          v-else-if="status?.completed"
          class="mt-2 flex items-center justify-between rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
        >
          <div class="font-semibold">Onboarding complete</div>
          <ElButton type="primary" size="small" class="sf-btn sf-btn--table" @click="quickNav('admin-dashboard')">
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
              class="sf-btn sf-btn--table"
              :loading="markingQr"
              @click="handleMarkQrPrinted"
            >
              Mark printed
            </ElButton>
            <ElButton
              :type="item.done ? 'default' : 'primary'"
              size="small"
              class="sf-btn sf-btn--table"
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
          <ElButton type="primary" plain class="sf-btn" @click="quickNav('admin-dashboard')">
            Go to Dashboard
          </ElButton>
          <ElButton class="sf-btn" @click="quickNav('admin-services')">Start with Services</ElButton>
        </div>
      </div>
    </ElCard>

    <ElCard class="bg-white">
      <div class="flex flex-col gap-3">
        <div class="text-lg font-semibold text-slate-900">Your Live Links</div>
        <p class="text-sm text-slate-600">
          Share these with customers. Booking is public; check-in can be placed behind a QR.
        </p>
        <div class="grid gap-3 md:grid-cols-3">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div class="text-sm font-semibold text-slate-900">Booking</div>
            <div class="mt-1 break-words text-sm text-slate-700">
              {{ bookingLink || 'Loading…' }}
            </div>
            <div class="mt-3 flex gap-2">
              <ElButton type="primary" size="small" class="sf-btn sf-btn--table" @click="copyLink(bookingLink)">
                Copy booking link
              </ElButton>
              <ElButton size="small" class="sf-btn sf-btn--table" :disabled="!bookingLink" @click="openLink(bookingLink)">
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
              <ElButton type="primary" size="small" class="sf-btn sf-btn--table" @click="copyLink(checkinLink)">
                Copy check-in link
              </ElButton>
              <ElButton size="small" class="sf-btn sf-btn--table" :disabled="!checkinLink" @click="openLink(checkinLink)">
                Open
              </ElButton>
              <ElButton size="small" class="sf-btn sf-btn--table" @click="quickNav('admin-qr')">Download QR</ElButton>
            </div>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div class="text-sm font-semibold text-slate-900">Kiosk</div>
            <div class="mt-1 break-words text-sm text-slate-700">
              {{ kioskLink || 'Loading…' }}
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <ElButton type="primary" size="small" class="sf-btn sf-btn--table" @click="copyLink(kioskLink)">
                Copy kiosk link
              </ElButton>
              <ElButton size="small" class="sf-btn sf-btn--table" :disabled="!kioskLink" @click="openLink(kioskLink)">
                Open
              </ElButton>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <ElButton size="small" class="sf-btn sf-btn--table" @click="quickNav('admin-staff')">Invite staff</ElButton>
          <ElButton size="small" class="sf-btn sf-btn--table" @click="quickNav('admin-dashboard')">View dashboard</ElButton>
        </div>
      </div>
    </ElCard>
  </div>
</template>
