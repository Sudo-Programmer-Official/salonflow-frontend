<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import OnboardingProgress from '../components/OnboardingProgress.vue';
import { trialExpired, trialEndedAt, trialDaysRemaining, resetTrialState } from '../api/trialBanner';
import { fetchOnboardingStatus } from '../api/onboarding';
import { logout } from '../utils/auth';

const role = computed(() => localStorage.getItem('role') || '');
const isOwner = computed(() => role.value === 'OWNER');
const dismissBanner = ref(false);
const dismissOnboardingBanner = ref(
  localStorage.getItem('dismissOnboardingBanner') === 'true',
);
const onboardingStatus = ref<{ completed: boolean } | null>(null);
const router = useRouter();
const route = useRoute();

const showEndedBanner = computed(() => isOwner.value && trialExpired.value && !dismissBanner.value);
const showCountdownBanner = computed(
  () =>
    isOwner.value &&
    !trialExpired.value &&
    (trialDaysRemaining.value ?? 0) > 0 &&
    !dismissBanner.value,
);

const goBilling = () => {
  window.location.href = '/admin/billing';
};

const clearBanner = () => {
  dismissBanner.value = true;
  resetTrialState();
};

const isImpersonating = computed(() => localStorage.getItem('impersonationActive') === 'true');
const impersonationName = computed(
  () => localStorage.getItem('impersonationBusinessName') || 'this tenant',
);

const exitImpersonation = () => {
  const originalToken = localStorage.getItem('impersonationOriginalToken') || '';
  const originalRole = localStorage.getItem('impersonationOriginalRole') || '';
  const originalTenant = localStorage.getItem('impersonationOriginalTenant') || '';

  if (originalToken) localStorage.setItem('token', originalToken);
  if (originalRole) localStorage.setItem('role', originalRole);
  if (originalTenant) localStorage.setItem('tenantId', originalTenant);

  localStorage.removeItem('impersonationActive');
  localStorage.removeItem('impersonationBusinessName');
  localStorage.removeItem('impersonationOriginalToken');
  localStorage.removeItem('impersonationOriginalRole');
  localStorage.removeItem('impersonationOriginalTenant');

  window.location.href = '/platform';
};

const handleLogout = () => logout('/login');

const loadOnboarding = async () => {
  if (!isOwner.value) return;
  try {
    onboardingStatus.value = await fetchOnboardingStatus(true);
  } catch (err) {
    // ignore; banner will stay hidden on failure
  }
};

onMounted(loadOnboarding);

const showOnboardingBanner = computed(
  () => isOwner.value && !onboardingStatus.value?.completed && !dismissOnboardingBanner.value,
);

const goOnboarding = () => {
  dismissOnboardingBanner.value = false;
  router.push({ name: 'admin-onboarding' });
};
const dismissOnboarding = () => {
  dismissOnboardingBanner.value = true;
  localStorage.setItem('dismissOnboardingBanner', 'true');
};

const navItems = computed(() => {
  const items = [
    { label: 'Dashboard', name: 'admin-dashboard', roles: ['OWNER'] },
    { label: 'Queue', name: 'admin-queue', roles: ['OWNER', 'STAFF'] },
    { label: 'Onboarding', name: 'admin-onboarding', roles: ['OWNER'] },
    { label: 'Services', name: 'admin-services', roles: ['OWNER'] },
    { label: 'Staff', name: 'admin-staff', roles: ['OWNER'] },
    { label: 'Customers', name: 'admin-customers', roles: ['OWNER'] },
    { label: 'Appointments', name: 'admin-appointments', roles: ['OWNER'] },
    {
      label: 'Appointment Reminders',
      name: 'admin-appointment-reminders',
      roles: ['OWNER'],
    },
    { label: 'Review SMS', name: 'admin-review-sms', roles: ['OWNER'] },
    { label: 'SMS', name: 'admin-sms', roles: ['OWNER'] },
    { label: 'QR Codes', name: 'admin-qr', roles: ['OWNER'] },
    { label: 'Billing', name: 'admin-billing', roles: ['OWNER'] },
    { label: 'Demo Requests', name: 'admin-demo-requests', roles: ['SUPER_ADMIN'] },
  ];

  return items.filter((item) => !item.roles || item.roles.includes(role.value));
});
</script>

<template>
  <div class="flex min-h-screen bg-slate-50 text-slate-900">
    <aside class="flex w-64 flex-col border-r border-slate-200 bg-white">
      <div class="flex h-14 items-center px-4 text-base font-semibold">SalonFlow Admin</div>
      <div class="flex-1 px-3 pb-4">
        <nav class="space-y-1">
          <RouterLink
            v-for="item in navItems"
            :key="item.name"
            :to="{ name: item.name }"
            class="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition"
            :class="
              route.name === item.name
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            "
          >
            <span>{{ item.label }}</span>
            <span
              v-if="route.name === item.name"
              class="text-[10px] uppercase tracking-wide text-white/70"
            >
              Current
            </span>
          </RouterLink>
        </nav>
      </div>
    </aside>

    <div class="flex min-h-screen flex-1 flex-col">
      <header
        class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4"
      >
        <div class="text-sm font-semibold text-slate-900">Admin</div>
        <button
          type="button"
          class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          @click="handleLogout"
        >
          Logout
        </button>
      </header>

      <main class="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <div
          v-if="isImpersonating"
          class="flex flex-col gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-base font-semibold">Impersonation</span>
              <div>
                <div class="font-semibold">You are impersonating "{{ impersonationName }}"</div>
                <div class="text-xs text-indigo-800">Actions here affect this tenant account.</div>
              </div>
            </div>
            <button
              type="button"
              class="rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-900 transition hover:bg-indigo-100"
              @click="exitImpersonation"
            >
              Exit impersonation
            </button>
          </div>
        </div>

        <div
          v-if="showOnboardingBanner"
          class="flex flex-col gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="font-semibold">Setup incomplete</div>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700"
                @click="goOnboarding"
              >
                Continue setup
              </button>
              <button
                type="button"
                class="rounded-md border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
                @click="dismissOnboarding"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div class="text-xs text-slate-700">
            Complete the checklist to finish onboarding. You can keep using the app meanwhile.
          </div>
        </div>

        <div
          v-if="showEndedBanner"
          class="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="font-semibold">Trial ended</div>
            <button
              type="button"
              class="text-amber-800 transition hover:text-amber-600"
              @click="clearBanner"
            >
              ✕
            </button>
          </div>
          <div>
            Your free trial has ended{{ trialEndedAt ? ` (ended ${new Date(trialEndedAt).toLocaleDateString()})` : '' }}. Upgrade to continue using SalonFlow.
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
              @click="goBilling"
            >
              Go to Billing
            </button>
            <button
              type="button"
              class="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
              @click="clearBanner"
            >
              Dismiss
            </button>
          </div>
        </div>

        <div
          v-else-if="showCountdownBanner"
          class="flex flex-col gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="font-semibold">Trial ends soon</div>
            <button
              type="button"
              class="text-sky-800 transition hover:text-sky-600"
              @click="clearBanner"
            >
              ✕
            </button>
          </div>
          <div>
            Your free trial ends in {{ trialDaysRemaining }} day{{ trialDaysRemaining === 1 ? '' : 's' }}{{ trialEndedAt ? ` (${new Date(trialEndedAt).toLocaleDateString()})` : '' }}.
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700"
              @click="goBilling"
            >
              Go to Billing
            </button>
            <button
              type="button"
              class="rounded-md border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
              @click="clearBanner"
            >
              Dismiss
            </button>
          </div>
        </div>

        <OnboardingProgress v-if="isOwner" />
        <RouterView />
      </main>
    </div>
  </div>
</template>
