<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import OnboardingProgress from '../components/OnboardingProgress.vue';
import { trialExpired, trialEndedAt, trialDaysRemaining, resetTrialState } from '../api/trialBanner';
import { fetchOnboardingStatus, dismissOnboardingBanner } from '../api/onboarding';
import { logout } from '../utils/auth';
import SiteFooter from '../components/SiteFooter.vue';
import { fetchSettings, fetchPublicSettings } from '../api/settings';
import { applyThemeFromSettings } from '../utils/theme';

const role = computed(() => localStorage.getItem('role') || '');
const isOwner = computed(() => role.value === 'OWNER');
const dismissBanner = ref(false);
const onboardingBannerDismissed = ref(false);
const onboardingStatus = ref<Awaited<ReturnType<typeof fetchOnboardingStatus>> | null>(null);
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

const handleLogout = () => logout('/app/login');

const publicCheckInUrl = computed(() => {
  if (typeof window === 'undefined') return '/check-in';
  return `${window.location.origin}/check-in`;
});

const openPublicCheckIn = () => {
  window.location.href = publicCheckInUrl.value;
};

const kioskUrl = computed(() => {
  if (typeof window === 'undefined') return '/check-in/kiosk';
  return `${window.location.origin}/check-in/kiosk`;
});

const kioskEnabled = ref(false);

const openKioskMode = () => {
  window.location.href = kioskUrl.value;
};

const loadOnboarding = async () => {
  if (!isOwner.value) return;
  try {
    onboardingStatus.value = await fetchOnboardingStatus(true);
    onboardingBannerDismissed.value = onboardingStatus.value?.onboardingBannerDismissed ?? false;
  } catch (err) {
    // ignore; banner will stay hidden on failure
  }
};

const loadSettingsFlags = async () => {
  try {
    const data = await fetchSettings();
    kioskEnabled.value = data.kioskEnabled;
    applyThemeFromSettings(data);
  } catch {
    kioskEnabled.value = false;
    try {
      const publicData = await fetchPublicSettings();
      applyThemeFromSettings(publicData);
    } catch {
      // leave defaults if loading fails
    }
  }
};

onMounted(() => {
  loadOnboarding();
  loadSettingsFlags();
});

const showOnboardingBanner = computed(
  () =>
    isOwner.value &&
    !onboardingStatus.value?.completed &&
    !onboardingBannerDismissed.value &&
    onboardingStatus.value?.onboardingBannerDismissed !== true,
);

const goOnboarding = () => {
  onboardingBannerDismissed.value = false;
  router.push({ name: 'admin-onboarding' });
};
const dismissOnboarding = () => {
  onboardingBannerDismissed.value = true;
  dismissOnboardingBanner()
    .then((status) => {
      onboardingStatus.value = status;
    })
    .catch(() => {
    onboardingBannerDismissed.value = false;
  });
};

const navItems = computed(() => {
  const items = [
    { label: 'Dashboard', name: 'admin-dashboard', roles: ['OWNER'] },
    { label: 'Queue', name: 'admin-queue', roles: ['OWNER', 'STAFF'] },
    { label: 'Onboarding', name: 'admin-onboarding', roles: ['OWNER'] },
    { label: 'Services', name: 'admin-services', roles: ['OWNER'] },
    { label: 'Categories', name: 'admin-categories', roles: ['OWNER'] },
    { label: 'Analytics', name: 'admin-analytics', roles: ['OWNER'] },
    { label: 'Staff', name: 'admin-staff', roles: ['OWNER'] },
    { label: 'Customers', name: 'admin-customers', roles: ['OWNER'] },
    { label: 'Appointments', name: 'admin-appointments', roles: ['OWNER'] },
    {
      label: 'Appointment Reminders',
      name: 'admin-appointment-reminders',
      roles: ['OWNER'],
    },
    { label: 'Review SMS', name: 'admin-review-sms', roles: ['OWNER'] },
    { label: 'Settings', name: 'admin-settings', roles: ['OWNER'] },
    { label: 'SMS', name: 'admin-sms', roles: ['OWNER'] },
    { label: 'QR Codes', name: 'admin-qr', roles: ['OWNER'] },
    { label: 'Billing', name: 'admin-billing', roles: ['OWNER'] },
    { label: 'Demo Requests', name: 'admin-demo-requests', roles: ['SUPER_ADMIN'] },
  ];

  return items.filter((item) => !item.roles || item.roles.includes(role.value));
});
</script>

<template>
  <div class="flex min-h-screen text-slate-900">
    <aside class="sidebar">
      <div class="sidebar__brand">SalonFlow Admin</div>
      <div class="sidebar__nav">
        <nav class="space-y-1">
          <RouterLink
            v-for="item in navItems"
            :key="item.name"
            :to="{ name: item.name }"
            class="nav-link"
            :class="route.name === item.name ? 'nav-link--active' : 'nav-link--idle'"
          >
            <span>{{ item.label }}</span>
            <span v-if="route.name === item.name" class="nav-link__badge">Current</span>
          </RouterLink>
        </nav>
      </div>
    </aside>

    <div class="flex min-h-screen flex-1 flex-col">
      <header class="admin-header">
        <div class="text-sm font-semibold text-slate-900">Admin</div>
        <div class="flex items-center gap-3">
          <el-button
            v-if="isOwner && kioskEnabled"
            type="success"
            plain
            size="small"
            @click="openKioskMode"
          >
            Kiosk Mode
          </el-button>
          <el-button type="primary" plain size="small" @click="openPublicCheckIn">
            Public Check-In
          </el-button>
          <el-button type="danger" plain size="small" @click="handleLogout">
            Logout
          </el-button>
        </div>
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
      <SiteFooter />
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 16rem;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(148, 163, 184, 0.35);
  background: var(--sidebar-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  font-family: var(--ui-font-family);
}
.sidebar__brand {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-weight: 700;
  font-size: var(--font-lg);
}
.sidebar__nav {
  flex: 1;
  padding: 0 12px 16px 12px;
  font-size: var(--font-md);
}
.nav-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 12px;
  padding: 10px 12px;
  font-weight: 600;
  transition: all 0.15s ease;
  font-size: var(--font-md);
}
.nav-link--active {
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
}
.nav-link--idle {
  color: #334155;
}
.nav-link--idle:hover {
  background: rgba(226, 232, 240, 0.7);
}
.nav-link__badge {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #e2e8f0;
}
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
  background: var(--main-surface);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  padding: 16px 24px;
  font-size: var(--font-md);
  font-family: var(--ui-font-family);
}
</style>
