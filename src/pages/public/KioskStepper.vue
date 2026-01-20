<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElAlert, ElButton, ElCard, ElInput } from 'element-plus';
import { fetchPublicSettings, type BusinessSettings } from '../../api/settings';
import { publicLookup, createPublicCheckIn, fetchGroupedServices, type ServiceOption } from '../../api/checkins';
import { fetchPublicAvailableStaff, type StaffMember } from '../../api/staff';
import { startKioskIdleWatchdog } from '../../utils/kioskIdleWatchdog';
import { applyThemeFromSettings } from '../../utils/theme';
import { formatPhone } from '../../utils/format';

type Step = 'welcome' | 'phone' | 'services' | 'staff' | 'review' | 'done';

type ServiceGroup = {
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  services: Array<
    ServiceOption & {
      durationMinutes?: number;
      priceCents?: number;
      currency?: string;
    }
  >;
};

const route = useRoute();
const step = ref<Step>('phone');
const phone = ref('');
const name = ref('');
const selectedServiceIds = ref<string[]>([]);
const groupedServices = ref<ServiceGroup[]>([]);
const settings = ref<BusinessSettings | null>(null);
const settingsError = ref('');
const errorMessage = ref('');
const submitting = ref(false);
const successName = ref('Guest');
const successServices = ref<string[]>([]);
const animatedPoints = ref<number | null>(null);
const pointsAnimationFrame = ref<number | null>(null);
const doneCountdown = ref<number | null>(null);
const doneTimer = ref<number | null>(null);
const stopWatchdog = ref<(() => void) | null>(null);
const idleWarning = ref(false);
const idleWarningTimer = ref<number | null>(null);
const staffList = ref<StaffMember[]>([]);
const staffLoading = ref(false);
const staffError = ref('');
const selectedStaffId = ref<string | null>(null);
const lookupResult = ref<
  | null
  | {
      exists: boolean;
      customer?: { id: string; name: string; pointsBalance: number | null };
    }
>(null);
const lookupError = ref('');
const lookupLoading = ref(false);
const lookupTimer = ref<number | null>(null);

const defaultSettings: BusinessSettings = {
  businessId: '',
  businessName: '',
  timezone: null,
  currency: 'USD',
  kioskEnabled: false,
  publicCheckInEnabled: true,
  requirePhone: true,
  showPointsOnKiosk: true,
  showPointsPreview: true,
  allowMultiService: false,
  requireService: false,
  allowStaffSelection: false,
  requireStaffSelection: false,
  kioskWelcomeStyle: 'classic',
  kioskShowRewardsCard: true,
  kioskAllowSkipService: true,
  kioskAllowSkipStaff: true,
  kioskAutoResetSeconds: null,
  enforceStaffAvailability: false,
  uiFontScale: 1,
  uiGlassEnabled: true,
  uiFontFamily: 'system',
  kioskThemeMode: 'green',
  kioskPrimaryColor: 'moneyGreen',
  businessPhone: null,
  defaultBookingRules: {
    buffer_before: 0,
    buffer_after: 0,
    min_notice_minutes: 0,
    allow_same_day: true,
    allow_walkins_outside_availability: true,
  },
  createdAt: null,
  updatedAt: null,
};

const tenant = computed(
  () =>
    (route.query.tenant as string | undefined) ||
    (import.meta.env.VITE_TENANT_ID as string | undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantSubdomain') ?? undefined : undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? undefined : undefined) ||
    'demo',
);

const stepItems = computed<Array<{ key: Step; label: string }>>(() => {
  const base: Array<{ key: Step; label: string }> = [];
  if (!useClassicWelcome.value) {
    base.push({ key: 'welcome', label: 'Welcome' });
  }
  base.push({ key: 'phone', label: 'Phone' }, { key: 'services', label: 'Services' });
  if (showStaffStep.value) {
    base.push({ key: 'staff', label: 'Staff' });
  }
  base.push({ key: 'review', label: 'Review' }, { key: 'done', label: 'Done' });
  return base;
});
const stepIcons: Record<Step, string> = {
  welcome: '👋',
  phone: '📞',
  services: '💅',
  staff: '🧑‍🎨',
  review: '📝',
  done: '✅',
};
const currentStepIndex = computed(() => stepItems.value.findIndex((s) => s.key === step.value));

const allowMultiService = computed(() => settings.value?.allowMultiService ?? false);
const requireService = computed(() => settings.value?.requireService ?? false);
const requirePhone = computed(() => settings.value?.requirePhone !== false);
const allowPhoneSkip = computed(() => !requirePhone.value);
const kioskEnabled = computed(() => settings.value?.kioskEnabled ?? false);
const publicEnabled = computed(() => settings.value?.publicCheckInEnabled !== false);
const businessName = computed(() => settings.value?.businessName || 'Salon Kiosk');
const businessPhone = computed(() => {
  const phone = settings.value?.businessPhone;
  return phone ? formatPhone(phone) : 'Front desk';
});
const showPoints = computed(() => {
  if (!settings.value) return true;
  const flag = settings.value.showPointsPreview ?? settings.value.showPointsOnKiosk;
  return flag !== false;
});
const showStaffStep = computed(() => settings.value?.allowStaffSelection === true);
const allowStaffSelection = showStaffStep;
const requireStaffStep = computed(
  () => showStaffStep.value && settings.value?.requireStaffSelection === true,
);
const allowStaffSkip = computed(
  () => showStaffStep.value && (settings.value?.kioskAllowSkipStaff !== false),
);
const enforceStaffAvailability = computed(() => settings.value?.enforceStaffAvailability === true);
const welcomeStyle = computed(() => settings.value?.kioskWelcomeStyle ?? 'classic');
const useClassicWelcome = computed(() => welcomeStyle.value === 'classic');
const showRewardsCard = computed(() => settings.value?.kioskShowRewardsCard !== false);
const allowServiceSkip = computed(
  () => !requireService.value && (settings.value?.kioskAllowSkipService !== false),
);
const autoResetSeconds = computed(() => {
  const raw = settings.value?.kioskAutoResetSeconds;
  if (raw === null || raw === undefined) return 10;
  const n = Number(raw);
  if (Number.isNaN(n)) return 10;
  return Math.min(Math.max(Math.round(n), 5), 120);
});

const selectedServiceDetails = computed<ServiceGroup['services'][number][]>(() => {
  const map = new Map<string, ServiceGroup['services'][number]>();
  groupedServices.value.forEach((group) => {
    group.services.forEach((service) => map.set(service.id, service));
  });
  return selectedServiceIds.value
    .map((id) => map.get(id))
    .filter((service): service is ServiceGroup['services'][number] => Boolean(service));
});

const serviceSections = computed(() => {
  const list = [...groupedServices.value];
  const active = list.filter((c) => c.categoryId);
  const uncategorized = list.filter((c) => !c.categoryId);
  return [...active, ...uncategorized];
});

const formattedPhone = computed(() => {
  if (!phone.value) return 'Not provided';
  const digits = phone.value.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith('1'))
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return phone.value;
});

const keypad = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['clear', '0', 'backspace'],
];

const primaryServiceId = computed(() => selectedServiceIds.value[0] ?? null);
const selectedStaffName = computed(() => {
  if (!selectedStaffId.value) return null;
  return staffList.value.find((s) => s.id === selectedStaffId.value)?.name ?? null;
});
const rewardValue = computed(() => {
  if (!showPoints.value) return null;
  const points = animatedPoints.value ?? lookupResult.value?.customer?.pointsBalance;
  if (points === null || points === undefined) return null;
  const perPointValue = 5 / 300; // mirrors 300 pts = $5 teaser
  return points * perPointValue;
});

const appendDigit = (digit: string) => {
  if (phone.value.length >= 18) return;
  phone.value += digit;
};

const clearPhone = () => {
  phone.value = '';
};

const handleBackspace = () => {
  phone.value = phone.value.slice(0, -1);
};

const normalizePhone = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return trimmed;
};

const loadSettings = async () => {
  try {
    settings.value = await fetchPublicSettings();
    settingsError.value = '';
    applyThemeFromSettings(settings.value, { boost: 1.12, mode: 'kiosk', maxScale: 1.4 });
    document.documentElement.dataset.kioskTheme = settings.value?.kioskThemeMode || 'green';
    document.documentElement.dataset.kioskPrimary = settings.value?.kioskPrimaryColor || 'moneyGreen';
  } catch (err: any) {
    settings.value = defaultSettings;
    settingsError.value = err?.message || 'Unable to load settings.';
    applyThemeFromSettings(settings.value, { boost: 1.12, mode: 'kiosk', maxScale: 1.4 });
    document.documentElement.dataset.kioskTheme = settings.value?.kioskThemeMode || 'green';
    document.documentElement.dataset.kioskPrimary = settings.value?.kioskPrimaryColor || 'moneyGreen';
  }
  step.value = useClassicWelcome.value ? 'phone' : 'welcome';
};

const refreshServices = async () => {
  try {
    groupedServices.value = await fetchGroupedServices();
  } catch (err: any) {
    groupedServices.value = [];
    errorMessage.value = err?.message || 'Unable to load services.';
  }
};

const loadStaff = async () => {
  if (!showStaffStep.value) return;
  staffLoading.value = true;
  staffError.value = '';
  try {
    const res = await fetchPublicAvailableStaff(
      enforceStaffAvailability.value ? primaryServiceId.value ?? undefined : undefined,
    );
    staffList.value = res.staff ?? [];
    if (!staffList.value.length) {
      selectedStaffId.value = null;
    }
  } catch (err: any) {
    staffError.value = err?.message || 'Unable to load staff right now.';
  } finally {
    staffLoading.value = false;
  }
};

const cancelIdleWarning = () => {
  if (idleWarningTimer.value !== null) {
    clearTimeout(idleWarningTimer.value);
    idleWarningTimer.value = null;
  }
  idleWarning.value = false;
  ['touchstart', 'mousedown', 'keydown'].forEach((evt) =>
    window.removeEventListener(evt, cancelIdleWarning),
  );
};

const triggerIdleReset = () => {
  cancelIdleWarning();
  idleWarning.value = true;
  ['touchstart', 'mousedown', 'keydown'].forEach((evt) =>
    window.addEventListener(evt, cancelIdleWarning),
  );
  idleWarningTimer.value = window.setTimeout(() => {
    cancelIdleWarning();
    resetFlow();
    refreshServices();
  }, 2000);
};

onMounted(async () => {
  if (tenant.value) {
    localStorage.setItem('tenantSubdomain', tenant.value);
    localStorage.setItem('tenantId', tenant.value);
  }
  await loadSettings();
  await refreshServices();
  await loadStaff();
  stopWatchdog.value = startKioskIdleWatchdog({
    softResetMs: 30_000,
    onSoftReset: triggerIdleReset,
  });
});

onBeforeUnmount(() => {
  if (doneTimer.value !== null) {
    clearInterval(doneTimer.value);
  }
});

onUnmounted(() => {
  stopWatchdog.value?.();
  cancelIdleWarning();
  applyThemeFromSettings(settings.value, { mode: 'app' });
  delete document.documentElement.dataset.kioskTheme;
  delete document.documentElement.dataset.kioskPrimary;
});

const resetFlow = () => {
  if (doneTimer.value !== null) {
    clearInterval(doneTimer.value);
    doneTimer.value = null;
  }
  doneCountdown.value = null;
  if (pointsAnimationFrame.value !== null) {
    cancelAnimationFrame(pointsAnimationFrame.value);
    pointsAnimationFrame.value = null;
  }
  animatedPoints.value = null;
  phone.value = '';
  name.value = '';
  selectedServiceIds.value = [];
  selectedStaffId.value = null;
  errorMessage.value = '';
  successServices.value = [];
  successName.value = 'Guest';
  lookupResult.value = null;
  lookupError.value = '';
  lookupLoading.value = false;
  if (lookupTimer.value) {
    clearTimeout(lookupTimer.value);
    lookupTimer.value = null;
  }
  step.value = useClassicWelcome.value ? 'phone' : 'welcome';
  cancelIdleWarning();
};

const canAdvanceFromPhone = computed(() => {
  if (requirePhone.value) return !!phone.value.trim();
  return true;
});

const canAdvanceFromServices = computed(() => {
  if (requireService.value) return selectedServiceIds.value.length > 0;
  if (!allowServiceSkip.value && selectedServiceIds.value.length === 0) return false;
  return true;
});

const goToPhone = () => {
  errorMessage.value = '';
  step.value = 'phone';
};

const skipPhoneStep = () => {
  phone.value = '';
  proceedFromPhone();
};

const proceedFromPhone = () => {
  if (!canAdvanceFromPhone.value) {
    errorMessage.value = 'Phone number is required.';
    return;
  }
  errorMessage.value = '';
  step.value = 'services';
};

const toggleService = (serviceId: string) => {
  errorMessage.value = '';
  if (allowMultiService.value) {
    if (selectedServiceIds.value.includes(serviceId)) {
      selectedServiceIds.value = selectedServiceIds.value.filter((id) => id !== serviceId);
    } else {
      selectedServiceIds.value = [...selectedServiceIds.value, serviceId];
    }
    return;
  }
  selectedServiceIds.value = selectedServiceIds.value.includes(serviceId) ? [] : [serviceId];
};

const skipServiceSelection = () => {
  if (!allowServiceSkip.value) return;
  selectedServiceIds.value = [];
  errorMessage.value = '';
  step.value = showStaffStep.value ? 'staff' : 'review';
  if (showStaffStep.value) {
    loadStaff();
  }
};

const goNextFromServices = async () => {
  if (requireService.value && selectedServiceIds.value.length === 0) {
    errorMessage.value = 'Please select at least one service.';
    return;
  }
  if (!requireService.value && !allowServiceSkip.value && selectedServiceIds.value.length === 0) {
    errorMessage.value = 'Select a service or enable skips in Settings.';
    return;
  }
  errorMessage.value = '';
  if (showStaffStep.value) {
    step.value = 'staff';
    await loadStaff();
    return;
  }
  step.value = 'review';
};

const selectStaff = (staffId: string | null) => {
  selectedStaffId.value = staffId;
  errorMessage.value = '';
};

const goFromStaffToReview = () => {
  if (requireStaffStep.value && !selectedStaffId.value) {
    errorMessage.value = 'Please choose a staff member.';
    return;
  }
  step.value = 'review';
};

const skipStaffSelection = () => {
  if (!allowStaffSkip.value || requireStaffStep.value) return;
  selectedStaffId.value = null;
  errorMessage.value = '';
  step.value = 'review';
};

const startDoneCountdown = () => {
  if (doneTimer.value !== null) {
    clearInterval(doneTimer.value);
  }
  doneCountdown.value = autoResetSeconds.value;
  doneTimer.value = window.setInterval(() => {
    if (doneCountdown.value === null) return;
    if (doneCountdown.value <= 1) {
      resetFlow();
      refreshServices();
      return;
    }
    doneCountdown.value -= 1;
  }, 1000);
};

const startPointsAnimation = (target: number | null | undefined) => {
  if (pointsAnimationFrame.value !== null) {
    cancelAnimationFrame(pointsAnimationFrame.value);
    pointsAnimationFrame.value = null;
  }
  if (target === null || target === undefined || Number.isNaN(target)) {
    animatedPoints.value = null;
    return;
  }
  const start = performance.now();
  const duration = 350;
  const from = 0;
  const to = Math.max(0, target);
  const stepAnim = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    animatedPoints.value = Math.round(from + (to - from) * t);
    if (t < 1) {
      pointsAnimationFrame.value = requestAnimationFrame(stepAnim);
    } else {
      pointsAnimationFrame.value = null;
    }
  };
  pointsAnimationFrame.value = requestAnimationFrame(stepAnim);
};

const confirmCheckIn = async () => {
  if (!publicEnabled.value || !kioskEnabled.value) {
    errorMessage.value = 'Kiosk check-in is disabled right now.';
    step.value = 'welcome';
    return;
  }
  if (requirePhone.value && !phone.value.trim()) {
    errorMessage.value = 'Phone number is required.';
    step.value = 'phone';
    return;
  }
  if (requireService.value && selectedServiceIds.value.length === 0) {
    errorMessage.value = 'Please select at least one service.';
    step.value = 'services';
    return;
  }
  if (requireStaffStep.value && !selectedStaffId.value) {
    errorMessage.value = 'Please select a staff member.';
    step.value = 'staff';
    return;
  }
  submitting.value = true;
  errorMessage.value = '';
  try {
    const normalizedPhone = normalizePhone(phone.value);
    const primaryServiceId = selectedServiceIds.value[0] ?? null;
    const matchedService = primaryServiceId
      ? selectedServiceDetails.value.find((s) => s.id === primaryServiceId) ?? null
      : null;
    const serviceName = matchedService?.name || null;
    await createPublicCheckIn({
      name:
        lookupResult.value?.customer?.name?.trim() ||
        name.value.trim() ||
        'Guest',
      phoneE164: requirePhone.value ? normalizedPhone : normalizedPhone || null,
      serviceId: primaryServiceId,
      serviceName,
      staffId: selectedStaffId.value,
    });
    successName.value =
      lookupResult.value?.customer?.name?.trim() || name.value.trim() || 'Guest';
    successServices.value = selectedServiceDetails.value.map((s) => s.name).filter(Boolean);
    startPointsAnimation(lookupResult.value?.customer?.pointsBalance ?? null);
    step.value = 'done';
    startDoneCountdown();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Failed to check in.';
  } finally {
    submitting.value = false;
  }
};

const onLookup = async () => {
  if (!phone.value.trim()) {
    lookupResult.value = null;
    lookupError.value = '';
    return;
  }
  lookupLoading.value = true;
  try {
    const normalizedPhone = normalizePhone(phone.value);
    const res = await publicLookup(normalizedPhone);
    lookupResult.value = res;
    lookupError.value = '';
    if (res.exists && res.customer?.name) {
      name.value = res.customer.name;
    }
  } catch (_err) {
    lookupResult.value = null;
    lookupError.value = 'Could not load points right now.';
  } finally {
    lookupLoading.value = false;
  }
};

watch(
  () => phone.value,
  () => {
    if (lookupTimer.value) {
      clearTimeout(lookupTimer.value);
    }
    if (!phone.value.trim()) {
      lookupResult.value = null;
      lookupError.value = '';
      return;
    }
    lookupTimer.value = window.setTimeout(onLookup, 400);
  },
);

watch(
  () => [primaryServiceId.value, enforceStaffAvailability.value, allowStaffSelection.value],
  () => {
    if (showStaffStep.value) {
      loadStaff();
    }
  },
);

watch(
  useClassicWelcome,
  (isClassic) => {
    if (isClassic && step.value === 'welcome') {
      step.value = 'phone';
    }
    if (!isClassic && step.value === 'phone' && !phone.value && !name.value) {
      step.value = 'welcome';
    }
  },
);
</script>

<template>
  <div class="kiosk-shell">
    <div class="kiosk-inner">
      <div class="kiosk-top">
        <div>
          <p class="text-sm uppercase tracking-wide" :style="{ color: 'var(--kiosk-text-secondary)' }">Kiosk Mode</p>
          <p class="text-2xl font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">{{ businessName }}</p>
        </div>
        <div class="rounded-full bg-white/40 px-3 py-1 text-xs font-semibold uppercase" :style="{ color: 'var(--kiosk-text-primary)' }">
          Touch to start
        </div>
      </div>

      <div v-if="idleWarning" class="idle-banner">Resetting due to inactivity…</div>

      <ElAlert v-if="settingsError" :closable="false" type="warning" :title="settingsError" class="mb-3" />

      <div
        v-if="!kioskEnabled"
        class="kiosk-disabled"
      >
        <div class="text-lg font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">Kiosk is disabled</div>
        <div class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">Enable kiosk mode in Settings to allow check-ins.</div>
        <ElButton class="mt-3" @click="resetFlow" round>Back to welcome</ElButton>
      </div>

      <template v-else>
        <div class="stepper glass-card" aria-hidden="true">
          <div
            v-for="(item, index) in stepItems"
            :key="item.key"
            class="stepper-item"
            :class="{ active: index <= currentStepIndex }"
          >
            <div class="stepper-dot">{{ index + 1 }}</div>
            <span class="stepper-icon" aria-hidden="true">{{ stepIcons[item.key] }}</span>
            <span>{{ item.label }}</span>
          </div>
        </div>

        <ElCard class="kiosk-card glass-card">
          <template #default>
            <div v-if="!publicEnabled" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              Public check-in is disabled. Please see the front desk.
            </div>

            <div v-else>
              <div v-if="step === 'welcome'" class="welcome-card" @click="goToPhone">
                <div class="space-y-2">
                  <p class="text-sm uppercase tracking-wide" :style="{ color: 'var(--kiosk-text-secondary)' }">Touch to start</p>
                  <p class="text-4xl font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">Check in & earn rewards</p>
                  <p class="text-lg" :style="{ color: 'var(--kiosk-text-secondary)' }">We kept the classic flow your team already knows.</p>
                  <ElButton type="primary" size="large">Start</ElButton>
                </div>
                <div
                  v-if="showRewardsCard && showPoints"
                  class="welcome-reward glass-card"
                >
                  <div class="text-xs font-semibold uppercase tracking-wide" :style="{ color: 'var(--kiosk-text-secondary)' }">Loyalty</div>
                  <div class="text-2xl font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">300 points = $5 off</div>
                  <div class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">Tap to begin and keep earning.</div>
                </div>
              </div>

              <div v-else-if="step === 'phone'" class="space-y-5">
                <div class="phone-hero grid gap-5 lg:grid-cols-[1fr,1.15fr]">
                  <div v-if="showRewardsCard && showPoints" class="left-stack">
                    <div class="business-card glass-card">
                    <div class="text-xs font-semibold uppercase tracking-wide" :style="{ color: 'var(--kiosk-text-secondary)' }">Salon</div>
                    <div class="text-2xl font-semibold leading-tight" :style="{ color: 'var(--kiosk-text-primary)' }">{{ businessName }}</div>
                    <div class="text-sm mt-1" :style="{ color: 'var(--kiosk-text-secondary)' }">{{ businessPhone }}</div>
                  </div>
                  <div class="reward-panel glass-card">
                    <div class="text-xs font-semibold uppercase tracking-wide" :style="{ color: 'var(--kiosk-text-secondary)' }">Loyalty</div>
                    <div class="text-3xl font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">300 points = $5 off</div>
                    <p class="text-sm mt-1" :style="{ color: 'var(--kiosk-text-secondary)' }">Enter your phone to load rewards.</p>
                    <div class="reward-body">
                      <div v-if="lookupResult?.exists && lookupResult.customer" class="reward-stats glass-card">
                        <div class="text-base font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">👋 {{ lookupResult.customer.name }}</div>
                        <div class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">
                          💎 {{ lookupResult.customer.pointsBalance ?? 0 }} points
                          <span class="ml-2 text-xs" :style="{ color: 'var(--kiosk-text-muted)' }">We’ll keep these ready.</span>
                        </div>
                      </div>
                      <div v-else class="reward-placeholder">
                        <div class="text-base font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">Tap the keypad to load your points.</div>
                        <div class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">We’ll track rewards automatically.</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="phone-panel kiosk-pane glass-card">
                  <div class="phone-heading">
                    <p class="text-xs uppercase tracking-wide" :style="{ color: 'var(--kiosk-text-secondary)' }">Step 1 • Phone</p>
                    <p class="text-2xl font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">Please enter your phone number</p>
                    <p class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">We’ll use this to find your rewards.</p>
                  </div>
                  <div class="phone-display">
                    <div class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">Phone number</div>
                    <div class="text-3xl font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">{{ phone || 'Tap the keypad' }}</div>
                  </div>
                    <div class="keypad">
                      <template v-for="(row, rowIndex) in keypad" :key="row.join('-')">
                        <button
                          v-for="key in row"
                          :key="`${rowIndex}-${key}`"
                          :class="['keypad-key', { action: key === 'backspace' || key === 'clear' }]"
                          @click="
                            key === 'backspace'
                              ? handleBackspace()
                              : key === 'clear'
                                ? clearPhone()
                                : appendDigit(key)
                          "
                        >
                          <span v-if="key === 'backspace'">⌫</span>
                          <span v-else-if="key === 'clear'">Clear</span>
                          <span v-else>{{ key }}</span>
                        </button>
                      </template>
                    </div>
                    <div class="flex flex-wrap gap-3 justify-end">
                      <ElButton size="large" @click="resetFlow">Start over</ElButton>
                      <ElButton
                        v-if="allowPhoneSkip"
                        size="large"
                        plain
                        @click="skipPhoneStep"
                      >
                        Skip phone
                      </ElButton>
                      <ElButton
                        type="primary"
                        size="large"
                        :disabled="!canAdvanceFromPhone"
                        @click="proceedFromPhone"
                      >
                        Next
                      </ElButton>
                    </div>
                  </div>
                </div>
                <div class="kiosk-pane phone-bottom glass-card">
                  <div class="grid gap-4 lg:grid-cols-[1.1fr,0.9fr] items-start">
                    <div>
                      <label class="kiosk-label">
                        Name
                      </label>
                      <ElInput v-model="name" size="large" placeholder="Your name" />
                    </div>
                    <div class="space-y-2">
                      <div v-if="showPoints" class="rounded-xl border border-white/40 bg-white/10 px-4 py-3 min-h-[90px] flex flex-col justify-center" :style="{ color: 'var(--kiosk-text-primary)' }">
                        <div v-if="lookupLoading" class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">Checking rewards…</div>
                        <template v-else-if="lookupResult?.exists && lookupResult.customer">
                          <div class="text-base font-semibold">💎 {{ lookupResult.customer.pointsBalance ?? 0 }} points</div>
                          <div class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">Keep earning rewards every visit.</div>
                        </template>
                        <template v-else>
                          <div class="text-base font-semibold">💎 Earn rewards</div>
                          <div class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">Check in today to start earning points.</div>
                        </template>
                      </div>
                      <div v-if="lookupError" class="rounded-xl border border-amber-300 bg-amber-100/20 px-4 py-3 text-sm text-amber-700">
                        {{ lookupError }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else-if="step === 'services'" class="space-y-5">
                <div class="kiosk-heading">
                  <div>
                    <p class="text-xl font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">Select services</p>
                    <p class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">
                      {{ allowMultiService ? 'Tap all that apply.' : 'Choose one service.' }}
                    </p>
                  </div>
                  <ElButton size="large" @click="step = 'phone'">Back</ElButton>
                </div>

                <div v-if="serviceSections.length" class="service-section-grid">
                  <div
                    v-for="category in serviceSections"
                    :key="category.categoryId || 'uncategorized'"
                    class="service-section glass-card"
                  >
                    <div class="section-header">
                      <div class="section-icon">{{ category.categoryIcon || '💅' }}</div>
                      <div>
                        <div class="section-title">{{ category.categoryName || 'Other services' }}</div>
                        <div class="section-sub">{{ category.services.length }} options</div>
                      </div>
                    </div>
                    <div v-if="category.services.length" class="service-list">
                      <label
                        v-for="service in category.services"
                        :key="service.id"
                        class="service-row"
                        :class="{ active: selectedServiceIds.includes(service.id) }"
                      >
                        <input
                          type="checkbox"
                          class="service-checkbox"
                          :checked="selectedServiceIds.includes(service.id)"
                          @change="toggleService(service.id)"
                        />
                        <div class="service-copy">
                          <div class="service-name">{{ service.name }}</div>
                          <div class="service-meta">
                            <span v-if="service.durationMinutes">{{ service.durationMinutes }} min</span>
                            <span
                              v-if="service.priceCents !== undefined && service.priceCents !== null"
                              class="inline-flex items-center gap-1"
                            >
                              <span aria-hidden="true">•</span>
                              {{
                                Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: service.currency || settings?.currency || 'USD',
                                  minimumFractionDigits: 0,
                                }).format((service.priceCents || 0) / 100)
                              }}
                            </span>
                          </div>
                        </div>
                        <span class="service-chip" v-if="selectedServiceIds.includes(service.id)">Selected</span>
                      </label>
                    </div>
                    <div v-else class="service-empty">No services in this category yet.</div>
                  </div>
                </div>
                  <div v-else class="rounded-xl border border-white/10 bg-white/5 px-4 py-3" :style="{ color: 'var(--kiosk-text-secondary)' }">
                    No services published yet.
                  </div>

                <div class="service-actions">
                  <ElButton size="large" @click="step = 'phone'">Back</ElButton>
                  <ElButton v-if="allowServiceSkip" size="large" plain @click="skipServiceSelection">
                    Skip
                  </ElButton>
                  <ElButton
                    type="primary"
                    size="large"
                    :disabled="!canAdvanceFromServices"
                    @click="goNextFromServices"
                  >
                    Next
                  </ElButton>
                </div>
              </div>

              <div v-else-if="step === 'staff' && showStaffStep" class="space-y-5">
                <div class="kiosk-heading">
                  <div>
                    <p class="text-xl font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">Choose a staff member</p>
                    <p class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">
                      {{ enforceStaffAvailability ? 'Available staff shown based on today’s schedule.' : 'Pick anyone or continue without preference.' }}
                    </p>
                  </div>
                  <ElButton size="large" @click="step = 'services'">Back</ElButton>
                </div>

                <div v-if="staffError" class="rounded-xl border border-amber-300 bg-amber-100/20 px-4 py-3 text-amber-800">
                  {{ staffError }}
                </div>

                <div v-if="staffLoading" class="rounded-xl border border-white/10 bg-white/5 px-4 py-3" :style="{ color: 'var(--kiosk-text-secondary)' }">
                  Loading staff…
                </div>

                <div class="services-grid" v-if="!staffLoading">
                  <button
                    class="service-card"
                    :class="{ active: selectedStaffId === null }"
                    @click="selectStaff(null)"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="text-2xl">🤝</div>
                      <div class="service-chip" v-if="selectedStaffId === null">Selected</div>
                    </div>
                    <div class="text-lg font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">No preference</div>
                    <div class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">We will assign the best available staff.</div>
                  </button>

                  <button
                    v-for="staff in staffList"
                    :key="staff.id"
                    class="service-card"
                    :class="{ active: selectedStaffId === staff.id }"
                    @click="selectStaff(staff.id)"
                    :disabled="!staff.active"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="text-2xl">👤</div>
                      <div class="service-chip" v-if="selectedStaffId === staff.id">Selected</div>
                    </div>
                    <div class="text-lg font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">
                      {{ staff.name }}
                      <span v-if="staff.nickname" :style="{ color: 'var(--kiosk-text-secondary)' }">({{ staff.nickname }})</span>
                    </div>
                    <div class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">
                      {{ staff.active ? 'Available' : 'Unavailable' }}
                    </div>
                  </button>
                </div>

                <div v-if="!staffList.length && !staffLoading" class="rounded-xl border border-white/10 bg-white/5 px-4 py-3" :style="{ color: 'var(--kiosk-text-secondary)' }">
                  No staff available right now — we'll assign for you.
                </div>

                <div class="service-actions">
                  <ElButton size="large" @click="step = 'services'">Back</ElButton>
                  <ElButton
                    v-if="allowStaffSkip && !requireStaffStep"
                    size="large"
                    plain
                    @click="skipStaffSelection"
                  >
                    Skip
                  </ElButton>
                  <ElButton
                    type="primary"
                    size="large"
                    :disabled="requireStaffStep && !selectedStaffId"
                    @click="goFromStaffToReview"
                  >
                    Next
                  </ElButton>
                </div>
              </div>

              <div v-else-if="step === 'review'" class="space-y-4">
                <div class="kiosk-heading">
                  <div>
                    <p class="text-xl font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">Review</p>
                    <p class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">Confirm before checking in.</p>
                  </div>
                  <ElButton size="large" @click="step = 'services'">Back</ElButton>
                </div>

                <div class="review-block glass-card">
                  <div>
                    <p class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">Name</p>
                    <p class="text-lg font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">{{ name || 'Guest' }}</p>
                  </div>
                  <div>
                    <p class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">Phone</p>
                    <p class="text-lg font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">{{ formattedPhone }}</p>
                  </div>
                  <div>
                    <p class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">Services</p>
                    <ul v-if="selectedServiceDetails.length" class="list-inside list-disc" :style="{ color: 'var(--kiosk-text-primary)' }">
                      <li v-for="service in selectedServiceDetails" :key="service.id" class="text-base">
                        {{ service.name }}
                        <span v-if="service.durationMinutes" :style="{ color: 'var(--kiosk-text-secondary)' }">
                          · {{ service.durationMinutes }} min
                        </span>
                      </li>
                    </ul>
                    <p v-else class="text-base" :style="{ color: 'var(--kiosk-text-secondary)' }">No services selected.</p>
                  </div>
                  <div v-if="allowStaffSelection">
                    <p class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">Staff preference</p>
                    <p class="text-base" :style="{ color: 'var(--kiosk-text-primary)' }">
                      {{ selectedStaffName || 'No preference' }}
                    </p>
                  </div>
                  <div v-if="showPoints && lookupResult?.exists && lookupResult.customer">
                    <p class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">Rewards preview</p>
                    <p class="text-base" :style="{ color: 'var(--kiosk-text-primary)' }">
                      💎 {{ lookupResult.customer.pointsBalance ?? 0 }} points
                    </p>
                    <p class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">
                      Keep earning rewards every visit.
                    </p>
                  </div>
                </div>

                <ElAlert
                  v-if="errorMessage"
                  type="error"
                  :closable="false"
                  :title="errorMessage"
                  class="mb-2"
                />

                <div class="flex justify-end gap-3">
                  <ElButton size="large" @click="step = showStaffStep ? 'staff' : 'services'">Back</ElButton>
                  <ElButton type="primary" size="large" :loading="submitting" @click="confirmCheckIn">
                    Confirm check-in
                  </ElButton>
                </div>
              </div>

              <div v-else-if="step === 'done'" class="done-card glass-card">
                <div class="done-header">
                  <div class="done-check">✔</div>
                  <h1>Checked in</h1>
                  <p class="done-name">Thanks, {{ successName }}.</p>
                  <p class="done-sub">You’re all set — we’ll take it from here.</p>
                </div>

                <div v-if="showPoints" class="done-rewards">
                  <div class="rewards-header">
                    <span class="rewards-icon" aria-hidden="true">💎</span>
                    <div class="text-xl font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">
                      {{ animatedPoints ?? lookupResult?.customer?.pointsBalance ?? 0 }} points
                    </div>
                  </div>
                  <div class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">
                    <template v-if="rewardValue !== null">
                      ≈
                      {{
                        Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: settings?.currency || 'USD',
                          minimumFractionDigits: 2,
                        }).format(rewardValue)
                      }}
                      toward rewards
                    </template>
                    <template v-else>
                      Earn rewards after today’s visit.
                    </template>
                  </div>
                </div>

                <div class="final-services">
                  <p class="label">
                    <span class="label-icon" aria-hidden="true">📋</span>
                    <span>You’re checked in for</span>
                  </p>
                  <div v-if="successServices.length" class="flex flex-wrap justify-center gap-2">
                    <div
                      v-for="svc in successServices"
                      :key="svc"
                      class="service-chip-card"
                    >
                      <span class="text-lg">💅</span>
                      <span class="text-sm font-semibold" :style="{ color: 'var(--kiosk-text-primary)' }">{{ svc }}</span>
                    </div>
                  </div>
                  <div v-else class="text-sm text-center" :style="{ color: 'var(--kiosk-text-secondary)' }">
                    Services will be confirmed at the counter.
                  </div>
                </div>

                <div class="mt-5 flex flex-col items-center gap-2">
                  <div class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">
                    Restarting for next guest in {{ doneCountdown ?? autoResetSeconds }}s
                  </div>
                  <ElButton class="mt-1" type="primary" size="large" @click="resetFlow">
                    Restart now
                  </ElButton>
                </div>
              </div>
            </div>
          </template>
        </ElCard>
      </template>
    </div>
  </div>
</template>

<style scoped>
.kiosk-shell {
  min-height: calc(100vh - 80px);
  padding: 32px 12px 40px;
  background: var(--bg-app);
  overscroll-behavior: none;
  touch-action: manipulation;
  -webkit-touch-callout: none;
  user-select: none;
  --kiosk-surface: var(--kiosk-glass-bg, var(--glass-bg));
  --kiosk-border: var(--kiosk-glass-border, var(--glass-border));
  --kiosk-blur: var(--kiosk-glass-blur, var(--glass-blur));
  color: var(--kiosk-text-primary);
  background-color: var(--bg-app);
}
:root[data-glass='off'] .kiosk-shell {
  --kiosk-surface: rgba(17, 24, 39, 0.92);
  --kiosk-border: rgba(17, 24, 39, 0.65);
  --kiosk-blur: 0px;
}
.kiosk-inner {
  margin: 0 auto;
  width: 100%;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.kiosk-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--kiosk-text-primary);
}
.kiosk-card {
  border: 1px solid var(--kiosk-border);
  background: color-mix(in srgb, var(--kiosk-surface) 96%, rgba(255, 255, 255, 0.04) 4%);
  backdrop-filter: blur(var(--kiosk-blur));
  -webkit-backdrop-filter: blur(var(--kiosk-blur));
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.08);
}
.kiosk-disabled {
  border: 1px dashed var(--kiosk-border);
  background: var(--kiosk-surface);
  border-radius: 16px;
  padding: 16px;
  border-style: dashed;
}
.stepper {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  background: color-mix(in srgb, var(--kiosk-surface) 85%, #ffffff 15%);
  border: 1px solid var(--kiosk-border);
  border-radius: 14px;
  padding: 8px 10px;
}
.stepper-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--kiosk-text-secondary);
  font-weight: 600;
  font-size: 13px;
}
.stepper-item.active {
  color: var(--kiosk-text-primary);
}
.stepper-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
}
.stepper-icon {
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  color: currentColor;
}
.welcome-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  align-items: center;
  gap: 16px;
  border-radius: 18px;
  padding: 28px 32px;
  background: linear-gradient(135deg, var(--kiosk-primary), #18b46d 45%, var(--kiosk-accent));
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  box-shadow: 0 20px 60px rgba(34, 197, 94, 0.28);
}
.welcome-card:active {
  transform: scale(0.985);
  box-shadow: 0 10px 30px rgba(34, 197, 94, 0.2);
}
.welcome-reward {
  max-width: 340px;
  justify-self: end;
}
.kiosk-pane {
  border-radius: 16px;
  border: 1px solid var(--kiosk-border);
  background: color-mix(in srgb, var(--kiosk-surface) 94%, rgba(255, 255, 255, 0.06) 6%);
  backdrop-filter: blur(var(--kiosk-blur));
  -webkit-backdrop-filter: blur(var(--kiosk-blur));
  padding: 16px;
}
.phone-display {
  border-radius: 12px;
  border: 1px solid var(--kiosk-border);
  background: color-mix(in srgb, var(--kiosk-surface) 92%, rgba(255, 255, 255, 0.08) 8%);
  backdrop-filter: blur(var(--kiosk-blur));
  -webkit-backdrop-filter: blur(var(--kiosk-blur));
  padding: 12px;
}
.keypad {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.keypad-key {
  border-radius: 12px;
  background: var(--kiosk-primary);
  color: var(--kiosk-text-primary);
  font-size: 22px;
  font-weight: 800;
  min-height: 68px;
  padding: 18px 12px;
  border: none;
  cursor: pointer;
  transition: transform 0.1s ease, background 0.12s ease, box-shadow 0.12s ease;
}
.keypad-key.action {
  background: rgba(255, 255, 255, 0.2);
  color: #1f2937;
}
.keypad-key:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 30px rgba(22, 163, 74, 0.25);
}
.keypad-key:active {
  transform: scale(0.96);
  background: color-mix(in srgb, var(--kiosk-primary) 85%, #000 15%);
}
.kiosk-label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 6px;
}
.phone-hero {
  align-items: stretch;
}
.reward-panel {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  background: color-mix(in srgb, var(--kiosk-surface) 94%, rgba(255, 255, 255, 0.06) 6%);
}
.business-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--kiosk-surface) 94%, rgba(255, 255, 255, 0.06) 6%);
}
.left-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.reward-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.reward-stats {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  padding: 12px;
}
.reward-placeholder {
  text-align: center;
  color: rgba(255, 255, 255, 0.85);
  display: grid;
  gap: 6px;
}
.phone-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.phone-bottom {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.08));
}
.kiosk-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.category-card {
  border-radius: 14px;
  border: 1px solid var(--kiosk-border);
  background: var(--kiosk-surface);
  backdrop-filter: blur(var(--kiosk-blur));
  -webkit-backdrop-filter: blur(var(--kiosk-blur));
  padding: 16px;
  text-align: left;
  color: var(--kiosk-text-primary);
  cursor: pointer;
  transition: transform 0.12s ease, border 0.12s ease, background 0.12s ease;
}
.category-card.active {
  border-color: rgba(14, 165, 233, 0.8);
  background: rgba(14, 165, 233, 0.1);
}
.category-card:hover {
  transform: translateY(-2px);
}
.category-card:active {
  transform: scale(0.985);
  background: rgba(14, 165, 233, 0.14);
}
.service-section-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
.service-section {
  border: 1px solid var(--kiosk-border);
  background: var(--kiosk-surface);
  backdrop-filter: blur(var(--kiosk-blur));
  -webkit-backdrop-filter: blur(var(--kiosk-blur));
  border-radius: 16px;
  padding: 14px;
  box-shadow: var(--glass-shadow);
}
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.section-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  display: grid;
  place-items: center;
  font-size: 20px;
}
.section-title {
  font-weight: 700;
  color: var(--kiosk-text-primary);
}
.section-sub {
  font-size: 13px;
  color: var(--kiosk-text-secondary);
}
.service-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.service-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--kiosk-border);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px;
  transition: border 0.12s ease, transform 0.12s ease, background 0.12s ease;
}
.service-row.active {
  border-color: color-mix(in srgb, var(--kiosk-primary) 70%, #fff 30%);
  background: color-mix(in srgb, var(--kiosk-primary) 12%, transparent);
  transform: translateY(-1px);
}
.service-checkbox {
  width: 22px;
  height: 22px;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
  display: grid;
  place-items: center;
  position: relative;
}
.service-checkbox:checked {
  border-color: color-mix(in srgb, var(--kiosk-primary) 80%, #fff 20%);
  background: color-mix(in srgb, var(--kiosk-primary) 18%, transparent);
}
.service-checkbox:checked::after {
  content: '✓';
  font-size: 13px;
  color: var(--kiosk-text-primary);
}
.kiosk-shell :deep(.el-button--primary) {
  background: var(--kiosk-primary);
  border-color: color-mix(in srgb, var(--kiosk-primary) 90%, #000 10%);
}
.kiosk-shell :deep(.el-button--primary:hover) {
  filter: brightness(1.05);
  box-shadow: 0 10px 28px rgba(22, 163, 74, 0.25);
}
.kiosk-shell :deep(.el-button--primary:disabled) {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.6);
  box-shadow: none;
}
.service-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.service-name {
  color: var(--kiosk-text-primary);
  font-weight: 700;
  font-size: 16px;
}
.service-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--kiosk-text-secondary);
  font-size: 13px;
}
.service-empty {
  color: var(--kiosk-text-secondary);
  font-size: 14px;
}
.service-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 6px;
  flex-wrap: wrap;
}
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.service-card {
  border-radius: 14px;
  border: 1px solid var(--kiosk-border);
  background: color-mix(in srgb, var(--kiosk-surface) 85%, #ffffff 15%);
  backdrop-filter: blur(var(--kiosk-blur));
  -webkit-backdrop-filter: blur(var(--kiosk-blur));
  padding: 16px;
  text-align: left;
  color: var(--kiosk-text-primary);
  cursor: pointer;
  transition: transform 0.12s ease, border 0.12s ease, background 0.12s ease;
}
.service-card.active {
  border-color: rgba(99, 102, 241, 0.8);
  background: color-mix(in srgb, var(--kiosk-primary) 12%, rgba(255, 255, 255, 0.1) 88%);
}
.service-card:hover {
  transform: translateY(-2px);
}
.service-card:active {
  transform: scale(0.985);
  background: rgba(99, 102, 241, 0.16);
}
.service-chip {
  padding: 4px 8px;
  background: color-mix(in srgb, var(--kiosk-primary) 20%, transparent);
  border-radius: 999px;
  font-size: 12px;
  color: var(--kiosk-text-primary);
  border: 1px solid color-mix(in srgb, var(--kiosk-primary) 40%, #ffffff 60%);
}
.review-block {
  border-radius: 14px;
  border: 1px solid var(--kiosk-border);
  background: color-mix(in srgb, var(--kiosk-surface) 86%, #ffffff 14%);
  backdrop-filter: blur(var(--kiosk-blur));
  -webkit-backdrop-filter: blur(var(--kiosk-blur));
  padding: 16px;
  display: grid;
  gap: 12px;
}
.review-block p {
  user-select: text;
  color: var(--kiosk-text-primary);
}
.done-card {
  text-align: center;
  padding: 36px 24px;
  border-radius: 16px;
  border: 1px solid var(--kiosk-glass-border);
  background: color-mix(in srgb, var(--kiosk-glass-bg) 94%, rgba(255, 255, 255, 0.06) 6%);
  backdrop-filter: blur(var(--kiosk-glass-blur));
  -webkit-backdrop-filter: blur(var(--kiosk-glass-blur));
  box-shadow: var(--glass-shadow);
  color: var(--kiosk-text-primary);
}
.done-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
}
.done-check {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--kiosk-primary) 18%, transparent);
  color: var(--kiosk-primary);
  font-size: 22px;
  display: grid;
  place-items: center;
  margin-bottom: 6px;
  animation: pop-in 160ms ease-out;
}
.done-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: var(--kiosk-heading, var(--kiosk-text-primary));
}
.done-name {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--kiosk-text-primary);
}
.done-sub {
  font-size: 14px;
  margin: 4px 0 0;
  color: var(--kiosk-text-secondary);
}
.done-rewards {
  margin: 0 auto;
  max-width: 520px;
  text-align: center;
  padding: 18px 16px;
  border-radius: 16px;
  border: 1px solid var(--kiosk-glass-border);
  background: color-mix(in srgb, var(--kiosk-glass-bg) 92%, rgba(255, 255, 255, 0.08) 8%);
  box-shadow: var(--glass-shadow);
}
.rewards-header {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}
.rewards-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--kiosk-primary) 16%, transparent);
  color: var(--kiosk-primary);
  font-size: 16px;
}
.final-services {
  margin: 20px auto 0;
  max-width: 620px;
  text-align: center;
}
.final-services .label {
  font-size: 14px;
  color: var(--kiosk-text-secondary);
  margin-bottom: 8px;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
}
.service-chip-card {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-border);
  backdrop-filter: blur(var(--kiosk-blur));
  -webkit-backdrop-filter: blur(var(--kiosk-blur));
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}
.service-chip-card span {
  color: var(--kiosk-text-primary);
}
.idle-banner {
  border-radius: 999px;
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-border);
  color: var(--kiosk-text-primary);
  font-weight: 700;
  font-size: 13px;
  padding: 10px 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
}
.idle-banner::before {
  content: '⏳';
}
@keyframes pop-in {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.kiosk-shell input,
.kiosk-shell textarea {
  user-select: text;
}

@media (max-width: 768px) {
  .kiosk-shell {
    padding-top: 16px;
  }
  .welcome-card {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}

@media (min-width: 1024px) {
  .review-block {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

</style>
