<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useRoute, useRouter } from 'vue-router';
import OnboardingProgress from '../components/OnboardingProgress.vue';
import { trialExpired, trialEndedAt, trialDaysRemaining, resetTrialState } from '../api/trialBanner';
import { fetchOnboardingStatus, dismissOnboardingBanner } from '../api/onboarding';
import { fetchSettings, fetchPublicSettings } from '../api/settings';
import { applyThemeFromSettings } from '../utils/theme';
import { useInboxNotifications } from '../utils/inboxNotifications';
import { maintenanceActive, maintenanceMessage, clearMaintenanceBanner } from '../api/maintenance';
import {
  getUnreadCount,
  listNotificationFeed,
  markNotificationRead,
  type NotificationFeedItem,
} from '../api/notifications';
import { getAttentionCount } from '../api/appointments';
import { playInboxChime } from '../utils/sound';

dayjs.extend(relativeTime);

const role = computed(() => localStorage.getItem('role') || '');
const isOwner = computed(() => role.value === 'OWNER');
const dismissBanner = ref(false);
const sidebarOpen = ref(false);
const isSidebarCollapsed = ref(true);
const SIDEBAR_COLLAPSE_KEY = 'adminSidebarCollapsed';
const onboardingBannerDismissed = ref(false);
const onboardingStatus = ref<Awaited<ReturnType<typeof fetchOnboardingStatus>> | null>(null);
const router = useRouter();
const route = useRoute();
const hideOnboardingRoutes = ['admin-queue', 'admin-checkout'];
const showOnboardingAllowed = computed(
  () => !hideOnboardingRoutes.includes((route.name as string) || ''),
);
const hideHeaderRoutes = ['admin-queue', 'admin-checkout'];
const showHeader = computed(
  () => !hideHeaderRoutes.includes((route.name as string) || ''),
);
const hideSidebarRoutes = ['admin-checkout'];
const showSidebar = computed(() => !hideSidebarRoutes.includes((route.name as string) || ''));
const isCheckoutRoute = computed(() => (route.name as string) === 'admin-checkout');

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

const kioskEnabled = ref(false);

const {
  state: inboxState,
  startPolling: startInboxPolling,
  stopPolling: stopInboxPolling,
  ensureAudioPrimed,
} = useInboxNotifications();

const unreadCount = ref(0);
const feed = ref<NotificationFeedItem[]>([]);
const feedLoading = ref(false);
const bellOpen = ref(false);
let unreadInterval: number | null = null;
const bellMenu = ref<HTMLElement | null>(null);
const bellButton = ref<HTMLElement | null>(null);
const appointmentsAttentionCount = ref(0);
const markItemRead = async (id: string) => {
  try {
    await markNotificationRead(id);
    feed.value = feed.value.map((n) => (n.id === id ? { ...n, read: true } : n));
    unreadCount.value = Math.max(0, unreadCount.value - 1);
  } catch {
    /* ignore */
  }
};

const markAllRead = async () => {
  const unreadIds = feed.value.filter((n) => !n.read).map((n) => n.id);
  if (!unreadIds.length) return;
  await Promise.all(unreadIds.map((id) => markNotificationRead(id).catch(() => undefined)));
  feed.value = [];
  unreadCount.value = 0;
};

const primeAudioOnInteraction = () => {
  ensureAudioPrimed();
  window.removeEventListener('click', primeAudioOnInteraction);
  window.removeEventListener('keydown', primeAudioOnInteraction);
};

const loadFeed = async () => {
  feedLoading.value = true;
  try {
    feed.value = await listNotificationFeed({ limit: 8 });
  } catch {
    // ignore
  } finally {
    feedLoading.value = false;
  }
};

const pollUnread = async () => {
  try {
    const previous = unreadCount.value;
    const count = await getUnreadCount();
    if (count > previous) {
      await playInboxChime();
    }
    unreadCount.value = count;
  } catch {
    /* ignore */
  }
};

const pollAttention = async () => {
  try {
    appointmentsAttentionCount.value = await getAttentionCount();
  } catch {
    /* ignore */
  }
};

watch(bellOpen, (open) => {
  if (open) {
    loadFeed();
  }
});

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
    applyThemeFromSettings({
      ...data,
      kioskThemeMode: data.kioskThemeMode,
    });
  } catch {
    kioskEnabled.value = false;
    try {
      const publicData = await fetchPublicSettings();
      applyThemeFromSettings({
        ...publicData,
        kioskThemeMode: publicData.kioskThemeMode,
      });
    } catch {
      // leave defaults if loading fails
    }
  }
};

const startUnreadPolling = () => {
  if (unreadInterval) return;
  unreadInterval = window.setInterval(() => {
    pollUnread();
    pollAttention();
  }, 10000);
};

const stopUnreadPolling = () => {
  if (unreadInterval) {
    window.clearInterval(unreadInterval);
    unreadInterval = null;
  }
};

const handleVisibilityChange = () => {
  if (document.hidden) {
    stopUnreadPolling();
  } else {
    pollUnread();
    pollAttention();
    startUnreadPolling();
  }
};

const handleGlobalClick = (event: MouseEvent) => {
  const target = event.target as Node | null;
  if (!target) return;
  if (
    bellOpen.value &&
    bellMenu.value &&
    !bellMenu.value.contains(target) &&
    bellButton.value &&
    !bellButton.value.contains(target)
  ) {
    bellOpen.value = false;
  }
};

onMounted(() => {
  loadOnboarding();
  loadSettingsFlags();
  startInboxPolling(currentRouteName);
  pollUnread();
  pollAttention();
  startUnreadPolling();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('click', handleGlobalClick);
  window.addEventListener('click', primeAudioOnInteraction, { once: true });
  window.addEventListener('keydown', primeAudioOnInteraction, { once: true });
  window.addEventListener('touchstart', primeAudioOnInteraction, { once: true });
});

onUnmounted(() => {
  stopUnreadPolling();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.removeEventListener('click', handleGlobalClick);
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
        label: 'Appointment Reminders',
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
      { label: 'Customers', name: 'admin-customers', icon: '👥', roles: ['OWNER'] },
      { label: 'Gift Cards', name: 'admin-gift-cards', icon: '🎁', roles: ['OWNER'] },
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
      { label: 'Promotions', name: 'admin-promotions', icon: '🏷️', roles: ['OWNER'] },
      { label: 'Notifications', name: 'admin-notifications', icon: '🔔', roles: ['OWNER'] },
    ],
  },
  {
    key: 'website',
    label: 'Website',
    defaultOpen: false,
    items: [
      { label: 'Website', name: 'admin-website', icon: '🌐', roles: ['OWNER'] },
      { label: 'Website Navigation', name: 'admin-website-navigation', icon: '🧭', roles: ['OWNER'] },
      { label: 'Website Analytics', name: 'admin-website-analytics', icon: '📊', roles: ['OWNER'] },
      { label: 'Website Leads (Legacy)', name: 'admin-website-leads', icon: '📨', roles: ['OWNER'] },
    ],
  },
  {
    key: 'reviews',
    label: 'Reviews',
    defaultOpen: true,
    items: [
      { label: 'Reviews', name: 'admin-reviews-settings', icon: '⭐', roles: ['OWNER'] },
      { label: 'Review Requests', name: 'admin-reviews-requests', icon: '📣', roles: ['OWNER'] },
      { label: 'Review Feedback', name: 'admin-reviews-feedback', icon: '📝', roles: ['OWNER'] },
    ],
  },
  {
    key: 'social',
    label: 'Social',
    defaultOpen: true,
    items: [{ label: 'Social Posts', name: 'admin-social-posts', icon: '🗣', roles: ['OWNER'] }],
  },
  {
    key: 'google',
    label: 'Google',
    defaultOpen: true,
    items: [{ label: 'Google Business', name: 'admin-google-business', icon: '🏢', roles: ['OWNER'] }],
  },
  {
    key: 'growth',
    label: 'Growth',
    defaultOpen: true,
    items: [{ label: 'Growth', name: 'admin-growth', icon: '🚀', roles: ['OWNER'] }],
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
  const collapsePref = localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
  if (collapsePref !== null) {
    isSidebarCollapsed.value = collapsePref === 'true';
  }
});

const currentRouteName = computed(() => (route.name ? String(route.name) : null));

watch(currentRouteName, (val) => {
  openGroupForRoute(val);
  sidebarOpen.value = false;
  bellOpen.value = false;
});

const closeSidebar = () => {
  sidebarOpen.value = false;
};

const toggleSidebarCollapse = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  localStorage.setItem(SIDEBAR_COLLAPSE_KEY, isSidebarCollapsed.value ? 'true' : 'false');
};
</script>

<template>
  <div class="admin-shell text-slate-900">
    <aside v-if="showSidebar" :class="['sidebar', { open: sidebarOpen, collapsed: isSidebarCollapsed }]">
      <div class="sidebar__brand">
        <button
          class="collapse-toggle"
          type="button"
          @click="toggleSidebarCollapse"
          :aria-label="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <span class="collapse-icon">{{ isSidebarCollapsed ? '⟩' : '⟨' }}</span>
        </button>
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
                  <span
                    v-else-if="item.name === 'admin-appointments' && appointmentsAttentionCount > 0"
                    class="nav-link__pill"
                    :title="`You have ${appointmentsAttentionCount} upcoming appointments needing attention`"
                  >
                    {{ appointmentsAttentionCount > 99 ? '99+' : appointmentsAttentionCount }}
                  </span>
                  <span
                    v-else-if="item.name === 'admin-notifications' && unreadCount > 0"
                    class="nav-link__pill"
                    :title="`You have ${unreadCount} unread notifications`"
                  >
                    {{ unreadCount > 99 ? '99+' : unreadCount }}
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
    <div v-if="sidebarOpen && showSidebar" class="sidebar-backdrop" @click="closeSidebar"></div>

    <div class="admin-main">
      <header v-if="showHeader" class="admin-header">
        <div class="flex items-center gap-3">
          <div class="text-sm font-semibold text-slate-900">
            {{ route.meta?.title || 'SalonFlow' }}
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="relative">
            <button
              type="button"
              class="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              @click="bellOpen = !bellOpen"
              ref="bellButton"
              aria-label="Notifications"
            >
              <span>🔔</span>
              <span v-if="unreadCount > 0" class="inline-flex min-w-[22px] justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
                {{ unreadCount > 99 ? '99+' : unreadCount }}
              </span>
            </button>
            <Teleport to="body">
              <div
                v-if="bellOpen"
                class="notification-dropdown fixed right-4 top-16 z-[99999] w-80 max-h-[70vh] rounded-xl border border-slate-200 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.18)] backdrop-blur"
                ref="bellMenu"
              >
                <div class="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                  <div class="text-sm font-semibold text-slate-800">Notifications</div>
                  <button
                    type="button"
                    class="text-xs font-semibold text-slate-500 transition hover:text-slate-700"
                    @click="loadFeed"
                  >
                    Refresh
                  </button>
                </div>
                <div class="px-3 py-2">
                  <div class="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{{ unreadCount }} unread</span>
                    <button
                      type="button"
                      class="font-semibold text-sky-600 transition hover:text-sky-700"
                      @click="markAllRead"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div class="notification-list max-h-[60vh] overflow-y-auto overflow-x-hidden pr-1 space-y-2">
                    <div v-if="feedLoading" class="py-4 text-sm text-slate-500">Loading…</div>
                    <div v-else-if="!feed.length" class="py-4 text-sm text-slate-500">No notifications yet.</div>
                    <ul v-else class="space-y-2">
                      <li
                        v-for="item in feed"
                        :key="item.id"
                        class="rounded-md border border-slate-100 px-3 py-2 cursor-pointer transition hover:border-slate-200"
                        :class="item.read ? 'bg-white' : 'bg-indigo-50/60'"
                        @click="markItemRead(item.id)"
                      >
                        <div class="text-sm text-slate-800">{{ item.message }}</div>
                        <div class="text-xs text-slate-500">
                          {{ dayjs(item.created_at).fromNow() }}
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
                <div class="border-t border-slate-100 px-3 py-2 text-right text-xs">
                  <RouterLink
                    :to="{ name: 'admin-notifications' }"
                    class="font-semibold text-sky-600 transition hover:text-sky-700"
                  >
                    View all
                  </RouterLink>
                </div>
              </div>
            </Teleport>
          </div>
        </div>
      </header>

      <main class="admin-content" :class="{ 'admin-content--kiosk': isCheckoutRoute }">
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

        <OnboardingProgress v-if="isOwner && showOnboardingAllowed" />
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
.admin-content--kiosk {
  padding: 0;
  overflow: hidden;
  background: transparent;
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
.sidebar.collapsed {
  width: 64px;
}
.sidebar.collapsed .collapse-toggle {
  width: 44px;
  height: 44px;
}
.sidebar.collapsed .sidebar__brand-text,
.sidebar.collapsed .sidebar__section-header,
.sidebar.collapsed .nav-link__right,
.sidebar.collapsed .sidebar__section-caret,
.sidebar.collapsed .sidebar__section-body .nav-link span:not(.nav-link__icon) {
  display: none;
}
.sidebar.collapsed .sidebar__section {
  border: none;
  background: transparent;
  box-shadow: none;
}
.sidebar.collapsed .sidebar__section-body {
  gap: 6px;
  padding: 4px;
}
.sidebar.collapsed .nav-link {
  justify-content: center;
  padding: 10px 8px;
}
.sidebar.collapsed .nav-link__icon {
  font-size: 16px;
}
.collapse-toggle {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.7);
  border-radius: 10px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #0f172a;
  cursor: pointer;
  font-size: 16px;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.08);
}
.collapse-toggle:hover {
  background: rgba(255, 255, 255, 0.85);
}
.collapse-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 18px;
  line-height: 1;
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
.notification-dropdown {
  will-change: transform, opacity;
}
}
</style>
