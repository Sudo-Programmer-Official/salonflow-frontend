<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import OnboardingProgress from '../components/OnboardingProgress.vue';
import { trialExpired, trialEndedAt, trialDaysRemaining, resetTrialState } from '../api/trialBanner';
import { fetchOnboardingStatus, dismissOnboardingBanner } from '../api/onboarding';
import { logout } from '../utils/auth';
import { fetchSettings, fetchPublicSettings } from '../api/settings';
import { applyThemeFromSettings } from '../utils/theme';
import { useInboxNotifications } from '../utils/inboxNotifications';
import { maintenanceActive, maintenanceMessage, clearMaintenanceBanner } from '../api/maintenance';

const role = computed(() => localStorage.getItem('role') || '');
const isOwner = computed(() => role.value === 'OWNER');
const dismissBanner = ref(false);
const sidebarOpen = ref(false);
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

const triggerManualCheckin = () => {
  const evt = new CustomEvent('open-manual-checkin');
  if (route.name === 'admin-queue') {
    window.dispatchEvent(evt);
    return;
  }
  router.push({ name: 'admin-queue', query: { newCheckin: '1' } }).then(() => {
    window.dispatchEvent(evt);
  });
};

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

const {
  state: inboxState,
  startPolling: startInboxPolling,
  stopPolling: stopInboxPolling,
  ensureAudioPrimed,
} = useInboxNotifications();

const primeAudioOnInteraction = () => {
  ensureAudioPrimed();
  window.removeEventListener('click', primeAudioOnInteraction);
  window.removeEventListener('keydown', primeAudioOnInteraction);
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
  startInboxPolling(currentRouteName);
  window.addEventListener('click', primeAudioOnInteraction, { once: true });
  window.addEventListener('keydown', primeAudioOnInteraction, { once: true });
  window.addEventListener('touchstart', primeAudioOnInteraction, { once: true });
});

onUnmounted(() => {
  window.removeEventListener('click', primeAudioOnInteraction);
  window.removeEventListener('keydown', primeAudioOnInteraction);
  window.removeEventListener('touchstart', primeAudioOnInteraction);
  stopInboxPolling();
});

const showOnboardingBanner = computed(
  () =>
    isOwner.value &&
    !onboardingStatus.value?.completed &&
    !onboardingBannerDismissed.value &&
    onboardingStatus.value?.onboardingBannerDismissed !== true,
);

const showMaintenanceBanner = computed(() => maintenanceActive.value);

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

const STORAGE_KEY = 'adminSidebarGroups';
const groupState = ref<Record<string, boolean>>({});

const sidebarGroups = computed(() => [
  {
    key: 'core',
    label: 'Core',
    defaultOpen: true,
    items: [
      { label: 'Dashboard', name: 'admin-dashboard', icon: '📊', roles: ['OWNER'] },
      { label: 'Queue', name: 'admin-queue', icon: '⏳', roles: ['OWNER', 'STAFF'] },
    ],
  },
  {
    key: 'appointments',
    label: 'Appointments',
    defaultOpen: true,
    items: [
      { label: 'Appointments', name: 'admin-appointments', icon: '📅', roles: ['OWNER'] },
      {
        label: 'Appointment Reminders (Operational)',
        name: 'admin-appointment-reminders',
        icon: '🔔',
        roles: ['OWNER'],
      },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    defaultOpen: true,
    items: [
      { label: 'Services', name: 'admin-services', icon: '🛠', roles: ['OWNER'] },
      { label: 'Categories', name: 'admin-categories', icon: '🗂', roles: ['OWNER'] },
      { label: 'Staff', name: 'admin-staff', icon: '👩‍💼', roles: ['OWNER'] },
    ],
  },
  {
    key: 'engagement',
    label: 'Engagement',
    defaultOpen: true,
    items: [
      { label: 'Review SMS', name: 'admin-review-sms', icon: '⭐', roles: ['OWNER'] },
      { label: 'SMS', name: 'admin-sms', icon: '💬', roles: ['OWNER'] },
      { label: 'Inbox', name: 'admin-inbox', icon: '📥', roles: ['OWNER', 'STAFF'] },
      { label: 'Smart Reminders', name: 'admin-smart-reminders', icon: '📣', roles: ['OWNER'] },
      { label: 'Notifications', name: 'admin-notifications', icon: '🔔', roles: ['OWNER'] },
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    defaultOpen: true,
    items: [{ label: 'Analytics', name: 'admin-analytics', icon: '📈', roles: ['OWNER'] }],
  },
  {
    key: 'system',
    label: 'System',
    defaultOpen: false,
    items: [
      { label: 'Settings', name: 'admin-settings', icon: '⚙️', roles: ['OWNER'] },
      { label: 'QR Codes', name: 'admin-qr', icon: '🔗', roles: ['OWNER'] },
      { label: 'Billing', name: 'admin-billing', icon: '💳', roles: ['OWNER'] },
      { label: 'Demo Requests', name: 'admin-demo-requests', icon: '🧪', roles: ['SUPER_ADMIN'] },
      { label: 'Messaging Numbers', name: 'platform-numbers', icon: '☎️', roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    key: 'onboarding',
    label: 'Onboarding',
    defaultOpen: true,
    items: [{ label: 'Onboarding', name: 'admin-onboarding', icon: '🚀', roles: ['OWNER'] }],
  },
]);

const visibleGroups = computed(() =>
  sidebarGroups.value
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(role.value)),
    }))
    .filter((group) => group.items.length > 0),
);

const isGroupOpen = (key: string, defaultOpen = false) =>
  groupState.value[key] !== undefined ? groupState.value[key] : defaultOpen;

const persistGroupState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groupState.value));
};

const loadGroupState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      groupState.value = parsed;
    }
  } catch {
    groupState.value = {};
  }
};

const toggleGroup = (key: string, defaultOpen = false) => {
  const open = isGroupOpen(key, defaultOpen);
  groupState.value = { ...groupState.value, [key]: !open };
  persistGroupState();
};

const openGroupForRoute = (routeName: string | null) => {
  if (!routeName) return;
  const match = visibleGroups.value.find((g) =>
    g.items.some((item) => item.name === routeName),
  );
  if (match) {
    groupState.value = { ...groupState.value, [match.key]: true };
    persistGroupState();
  }
};

onMounted(() => {
  loadGroupState();
  openGroupForRoute(route.name as string);
});

const currentRouteName = computed(() => (route.name ? String(route.name) : null));

watch(currentRouteName, (val) => {
  openGroupForRoute(val);
  sidebarOpen.value = false;
});

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

const closeSidebar = () => {
  sidebarOpen.value = false;
};
</script>

<template>
  <div class="admin-shell text-slate-900">
    <aside :class="['sidebar', { open: sidebarOpen }]">
      <div class="sidebar__brand">
        <img src="/icons/icon-128x128.png" alt="SalonFlow logo" class="brand-logo sidebar__logo" />
        <div class="sidebar__brand-text">
          <span class="sidebar__brand-name">SalonFlow</span>
          <span class="sidebar__brand-sub">Admin</span>
        </div>
      </div>
      <div class="sidebar__nav">
        <nav class="space-y-2">
          <div
            v-for="group in visibleGroups"
            :key="group.key"
            class="sidebar__section"
          >
            <button
              type="button"
              class="sidebar__section-header"
              @click="toggleGroup(group.key, group.defaultOpen)"
            >
              <span>{{ group.label }}</span>
              <span class="sidebar__section-caret">{{ isGroupOpen(group.key, group.defaultOpen) ? '▾' : '▸' }}</span>
            </button>
            <div
              v-if="isGroupOpen(group.key, group.defaultOpen)"
              class="sidebar__section-body"
            >
              <RouterLink
                v-for="item in group.items"
                :key="item.name"
                :to="{ name: item.name }"
                class="nav-link"
                :class="route.name === item.name ? 'nav-link--active' : 'nav-link--idle'"
              >
                <div class="nav-link__left">
                  <span class="nav-link__icon" aria-hidden="true">{{ item.icon }}</span>
                  <span>{{ item.label }}</span>
                </div>
                <div class="nav-link__right">
                  <span
                    v-if="item.name === 'admin-inbox' && inboxState.unreadCount > 0"
                    class="nav-link__pill"
                    :title="`You have ${inboxState.unreadCount} unread messages`"
                  >
                    {{ inboxState.unreadCount > 99 ? '99+' : inboxState.unreadCount }}
                  </span>
                  <span v-if="route.name === item.name" class="nav-link__badge">Current</span>
                  <span
                    v-else-if="item.name === 'admin-onboarding' && showOnboardingBanner"
                    class="nav-link__badge nav-link__badge--info"
                  >
                    Setup
                  </span>
                </div>
              </RouterLink>
            </div>
          </div>
        </nav>
      </div>
    </aside>
    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="closeSidebar"></div>

    <div class="admin-main">
      <header class="admin-header">
        <div class="flex items-center gap-3">
          <button
            class="sidebar-toggle lg:hidden"
            type="button"
            aria-label="Toggle menu"
            @click="toggleSidebar"
          >
            ☰
          </button>
          <div class="text-sm font-semibold text-slate-900">Admin</div>
        </div>
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
          <el-button
            v-if="isOwner"
            type="primary"
            size="small"
            @click="triggerManualCheckin"
          >
            + New Check-In
          </el-button>
          <el-button class="logout-btn" type="danger" size="small" @click="handleLogout">
            Logout
          </el-button>
        </div>
      </header>

      <main class="admin-content">
        <div
          v-if="showMaintenanceBanner"
          class="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="font-semibold">Maintenance mode</div>
            <button
              type="button"
              class="text-amber-800 transition hover:text-amber-600"
              @click="clearMaintenanceBanner"
            >
              ✕
            </button>
          </div>
          <div>{{ maintenanceMessage || 'Maintenance in progress' }}</div>
        </div>

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

<style scoped>
.admin-shell {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: var(--bg-app);
}
.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}
.admin-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
  overflow-y: auto;
  overflow-x: hidden;
}
.sidebar {
  width: 16rem;
  height: 100vh;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid rgba(148, 163, 184, 0.35);
  background: var(--sidebar-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  font-family: var(--ui-font-family);
  overflow: hidden;
}
.sidebar__brand {
  min-height: 96px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  font-weight: 800;
  font-size: var(--font-lg);
  white-space: nowrap;
}
.sidebar__logo {
  flex-shrink: 0;
}
.sidebar__brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}
.sidebar__brand-name {
  font-size: 18px;
}
.sidebar__brand-sub {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
}
.sidebar__nav {
  flex: 1;
  min-height: 0;
  padding: 4px 12px 16px 12px;
  font-size: var(--font-md);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.sidebar__section {
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}
.sidebar__section-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.01em;
  color: #0f172a;
  background: transparent;
  border: none;
  cursor: pointer;
}
.sidebar__section-caret {
  font-size: 12px;
  color: #64748b;
}
.sidebar__section-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px 10px 8px;
}
.nav-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 12px;
  padding: 9px 10px;
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
.nav-link__badge--info {
  color: #0ea5e9;
}
.nav-link__left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.nav-link__icon {
  width: 20px;
  text-align: center;
  font-size: 14px;
}
.nav-link__right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.nav-link__pill {
  min-width: 20px;
  padding: 2px 6px;
  border-radius: 999px;
  background: #dc2626;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  box-shadow: 0 6px 14px rgba(220, 38, 38, 0.25);
  text-align: center;
  position: relative;
}
.nav-link__pill::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 999px;
  border: 2px solid rgba(220, 38, 38, 0.4);
  animation: pulse 1.4s ease-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.9);
    opacity: 0.9;
  }
  70% {
    transform: scale(1.15);
    opacity: 0;
  }
  100% {
    transform: scale(1.15);
    opacity: 0;
  }
}
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
  background: var(--header-surface, var(--main-surface));
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  padding: 16px 24px;
  font-size: 1rem;
  font-family: var(--ui-font-family);
}
.admin-header :deep(.el-button) {
  font-size: inherit;
  height: auto;
  padding: 0.75em 1em;
  border-radius: 14px;
  background: linear-gradient(135deg, #0ea5e9, #0b83d9);
  border-color: #0b83d9;
  color: #fff;
}
.admin-header :deep(.el-button.logout-btn) {
  background: #dc2626;
  border-color: #dc2626;
}
.admin-header :deep(.el-button.is-plain) {
  background: linear-gradient(135deg, #0ea5e9, #0b83d9);
  color: #fff;
  border-color: #0b83d9;
}
.admin-header :deep(.el-button:hover),
.admin-header :deep(.el-button:focus) {
  filter: brightness(1.08);
}

.sidebar-toggle {
  height: 38px;
  width: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(255, 255, 255, 0.85);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.sidebar-backdrop {
  display: none;
}

@media (max-width: 1024px) {
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: -16rem;
    z-index: 60;
    transition: left 0.2s ease;
    box-shadow: 16px 0 40px rgba(15, 23, 42, 0.18);
  }
  .sidebar.open {
    left: 0;
  }
  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.35);
    backdrop-filter: blur(2px);
    z-index: 55;
  }
  .admin-shell,
  .admin-main {
    width: 100vw;
  }
}
</style>
