<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElAlert, ElButton, ElCard, ElInput } from 'element-plus';
import { fetchPublicSettings, type BusinessSettings } from '../../api/settings';
import { publicLookup, createPublicCheckIn, fetchGroupedServices, type ServiceOption } from '../../api/checkins';
import { fetchPublicAvailableStaff, type StaffMember } from '../../api/staff';
import { startKioskIdleWatchdog } from '../../utils/kioskIdleWatchdog';

type Step = 'welcome' | 'phone' | 'category' | 'services' | 'staff' | 'review' | 'done';

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
const step = ref<Step>('welcome');
const phone = ref('');
const name = ref('');
const selectedCategoryId = ref<string | null>(null);
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
  allowMultiService: false,
  requireService: false,
  allowStaffSelection: false,
  kioskAutoResetSeconds: null,
  enforceStaffAvailability: false,
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
  const base: Array<{ key: Step; label: string }> = [
    { key: 'welcome', label: 'Welcome' },
    { key: 'phone', label: 'Phone' },
    { key: 'category', label: 'Category' },
    { key: 'services', label: 'Services' },
  ];
  if (allowStaffSelection.value) {
    base.push({ key: 'staff', label: 'Staff' });
  }
  base.push({ key: 'review', label: 'Review' }, { key: 'done', label: 'Done' });
  return base;
});
const currentStepIndex = computed(() => stepItems.value.findIndex((s) => s.key === step.value));

const allowMultiService = computed(() => settings.value?.allowMultiService ?? false);
const requireService = computed(() => settings.value?.requireService ?? false);
const requirePhone = computed(() => settings.value?.requirePhone !== false);
const allowPhoneSkip = computed(() => !requirePhone.value);
const kioskEnabled = computed(() => settings.value?.kioskEnabled ?? false);
const publicEnabled = computed(() => settings.value?.publicCheckInEnabled !== false);
const businessName = computed(() => settings.value?.businessName || 'Salon Kiosk');
const showPoints = computed(() => (settings.value ? settings.value.showPointsOnKiosk === true : true));
const allowStaffSelection = computed(() => settings.value?.allowStaffSelection === true);
const enforceStaffAvailability = computed(() => settings.value?.enforceStaffAvailability === true);
const autoResetSeconds = computed(() => {
  const raw = settings.value?.kioskAutoResetSeconds;
  if (raw === null || raw === undefined) return 10;
  const n = Number(raw);
  if (Number.isNaN(n)) return 10;
  return Math.min(Math.max(Math.round(n), 5), 120);
});

const categories = computed(() => {
  const list = [...groupedServices.value];
  const active = list.filter((c) => c.categoryId);
  const uncategorized = list.filter((c) => !c.categoryId);
  return [...active, ...uncategorized];
});

watch(
  categories,
  (cats) => {
    if (cats.length === 0) {
      selectedCategoryId.value = null;
      return;
    }
    const found = cats.find((c) => c.categoryId === selectedCategoryId.value);
    if (!found) {
      selectedCategoryId.value = cats[0]?.categoryId ?? null;
    }
  },
  { immediate: true },
);

const servicesForCategory = computed(() => {
  if (!categories.value.length) return [];
  if (selectedCategoryId.value === null) {
    return categories.value.find((c) => c.categoryId === null)?.services ?? [];
  }
  return categories.value.find((c) => c.categoryId === selectedCategoryId.value)?.services ?? [];
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
  } catch (err: any) {
    settings.value = defaultSettings;
    settingsError.value = err?.message || 'Unable to load settings.';
  }
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
  if (!allowStaffSelection.value) return;
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
  step.value = 'welcome';
  cancelIdleWarning();
};

const canAdvanceFromPhone = computed(() => {
  if (requirePhone.value) return !!phone.value.trim();
  return true;
});

const canAdvanceFromServices = computed(() => !requireService.value || selectedServiceIds.value.length > 0);

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
  step.value = 'category';
};

const selectCategory = (categoryId: string | null) => {
  selectedCategoryId.value = categoryId;
  errorMessage.value = '';
  step.value = 'services';
  if (!allowMultiService.value) {
    selectedServiceIds.value = [];
  }
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
  selectedServiceIds.value = [];
  step.value = allowStaffSelection.value ? 'staff' : 'review';
  if (allowStaffSelection.value) {
    loadStaff();
  }
};

const goNextFromServices = async () => {
  if (requireService.value && selectedServiceIds.value.length === 0) {
    errorMessage.value = 'Please select at least one service.';
    return;
  }
  errorMessage.value = '';
  if (allowStaffSelection.value) {
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
    if (allowStaffSelection.value) {
      loadStaff();
    }
  },
);
</script>

<template>
  <div class="kiosk-shell">
    <div class="kiosk-inner">
      <div class="kiosk-top">
        <div>
          <p class="text-sm uppercase tracking-wide text-white/70">Kiosk Mode</p>
          <p class="text-2xl font-semibold text-white">{{ businessName }}</p>
        </div>
        <div class="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase text-white/80">
          Touch to start
        </div>
      </div>

      <div v-if="idleWarning" class="idle-banner">Resetting due to inactivity…</div>

      <ElAlert v-if="settingsError" :closable="false" type="warning" :title="settingsError" class="mb-3" />

      <div
        v-if="!kioskEnabled"
        class="kiosk-disabled"
      >
        <div class="text-lg font-semibold text-white">Kiosk is disabled</div>
        <div class="text-sm text-white/80">Enable kiosk mode in Settings to allow check-ins.</div>
        <ElButton class="mt-3" @click="resetFlow" round>Back to welcome</ElButton>
      </div>

      <template v-else>
        <div class="stepper" aria-hidden="true">
          <div
            v-for="(item, index) in stepItems"
            :key="item.key"
            class="stepper-item"
            :class="{ active: index <= currentStepIndex }"
          >
            <div class="stepper-dot">{{ index + 1 }}</div>
            <span>{{ item.label }}</span>
          </div>
        </div>

        <ElCard class="kiosk-card">
          <template #default>
            <div v-if="!publicEnabled" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              Public check-in is disabled. Please see the front desk.
            </div>

            <div v-else>
              <div v-if="step === 'welcome'" class="welcome-card" @click="goToPhone">
                <div>
                  <p class="text-4xl font-semibold text-white">Welcome 👋</p>
                  <p class="mt-2 text-lg text-white/80">Tap to check in</p>
                </div>
                <div
                  v-if="showPoints"
                  class="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-left text-white shadow-lg"
                >
                  <div class="text-sm font-semibold uppercase tracking-wide text-white/60">💎 Earn rewards</div>
                  <div class="text-lg font-semibold text-white">300 points = $5 off</div>
                  <div class="text-sm text-white/70">Check in to start earning.</div>
                </div>
                <ElButton type="primary" size="large">Start</ElButton>
              </div>

              <div v-else-if="step === 'phone'" class="grid gap-6 lg:grid-cols-2">
                <div class="kiosk-pane">
                  <div class="phone-display">
                    <div class="text-sm text-white/70">Phone number</div>
                    <div class="text-3xl font-semibold text-white">{{ phone || 'Enter phone' }}</div>
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
                </div>
                <div class="kiosk-pane space-y-4 min-h-[320px]">
                  <div>
                    <label class="kiosk-label">
                      Phone {{ requirePhone ? '(required)' : '(optional)' }}
                    </label>
                    <div class="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white/90">
                      {{ phone || 'Tap numbers to enter' }}
                    </div>
                  </div>
                  <div class="space-y-2">
                    <div v-if="showPoints" class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white min-h-[90px] flex flex-col justify-center">
                      <div v-if="lookupLoading" class="text-sm text-white/80">Checking rewards…</div>
                      <template v-else-if="lookupResult?.exists && lookupResult.customer">
                        <div class="text-base font-semibold">👋 Welcome back, {{ lookupResult.customer.name }}!</div>
                        <div class="text-sm text-white/80">
                          💎 {{ lookupResult.customer.pointsBalance ?? 0 }} points
                          <span class="ml-2 text-xs text-white/60">Keep earning rewards every visit.</span>
                        </div>
                      </template>
                      <template v-else>
                        <div class="text-base font-semibold">💎 Earn rewards</div>
                        <div class="text-sm text-white/70">Check in today to start earning points.</div>
                      </template>
                    </div>
                    <div v-if="lookupError" class="rounded-xl border border-amber-300 bg-amber-100/20 px-4 py-3 text-sm text-amber-100">
                      {{ lookupError }}
                    </div>
                  </div>
                  <div>
                    <label class="kiosk-label">Name</label>
                    <ElInput v-model="name" size="large" placeholder="Your name" />
                  </div>
                  <div class="flex flex-wrap gap-3">
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

              <div v-else-if="step === 'category'" class="space-y-4">
                <div class="kiosk-heading">
                  <div>
                    <p class="text-xl font-semibold text-white">Pick a category</p>
                    <p class="text-sm text-white/70">Uncategorized is always available.</p>
                  </div>
                  <ElButton size="large" @click="step = 'phone'">Back</ElButton>
                </div>
                <div class="category-grid">
                  <button
                    v-for="category in categories"
                    :key="category.categoryId || 'uncategorized'"
                    class="category-card"
                    :class="{ active: selectedCategoryId === category.categoryId }"
                    @click="selectCategory(category.categoryId)"
                  >
                    <div class="text-3xl">{{ category.categoryIcon || '📋' }}</div>
                    <div class="text-lg font-semibold">{{ category.categoryName }}</div>
                    <div class="text-sm text-white/80">{{ category.services.length }} services</div>
                  </button>
                </div>
                <div class="flex justify-end">
                  <ElButton type="primary" size="large" @click="step = 'services'">Choose services</ElButton>
                </div>
              </div>

              <div v-else-if="step === 'services'" class="space-y-5">
                <div class="kiosk-heading">
                  <div>
                    <p class="text-xl font-semibold text-white">Select services</p>
                    <p class="text-sm text-white/70">
                      {{ allowMultiService ? 'Tap all that apply.' : 'Choose one service.' }}
                    </p>
                  </div>
                  <ElButton size="large" @click="step = 'category'">Back</ElButton>
                </div>

                <div v-if="servicesForCategory.length" class="services-grid">
                  <button
                    v-for="service in servicesForCategory"
                    :key="service.id"
                    class="service-card"
                    :class="{ active: selectedServiceIds.includes(service.id) }"
                    @click="toggleService(service.id)"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="text-2xl">{{ service.icon || '💇' }}</div>
                      <div class="service-chip" v-if="selectedServiceIds.includes(service.id)">Selected</div>
                    </div>
                    <div class="text-lg font-semibold text-white">{{ service.name }}</div>
                    <div class="text-sm text-white/80">
                      <span v-if="service.durationMinutes">{{ service.durationMinutes }} min · </span>
                      <span v-if="service.priceCents !== undefined && service.priceCents !== null">
                        {{
                          Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: service.currency || settings?.currency || 'USD',
                            minimumFractionDigits: 0,
                          }).format((service.priceCents || 0) / 100)
                        }}
                      </span>
                      <span v-else>Tap to select</span>
                    </div>
                  </button>
                </div>
                <div v-else class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/80">
                  No services in this category yet.
                </div>

                <div class="flex flex-wrap justify-end gap-3">
                  <ElButton size="large" @click="step = 'category'">Back</ElButton>
                  <ElButton v-if="!requireService" size="large" plain @click="skipServiceSelection">
                    Skip
                  </ElButton>
                  <ElButton
                    type="primary"
                    size="large"
                    :disabled="!canAdvanceFromServices"
                    @click="goNextFromServices"
                  >
                    Review
                  </ElButton>
                </div>
              </div>

              <div v-else-if="step === 'staff' && allowStaffSelection" class="space-y-5">
                <div class="kiosk-heading">
                  <div>
                    <p class="text-xl font-semibold text-white">Choose a staff member</p>
                    <p class="text-sm text-white/70">
                      {{ enforceStaffAvailability ? 'Available staff shown based on today’s schedule.' : 'Pick anyone or continue without preference.' }}
                    </p>
                  </div>
                  <ElButton size="large" @click="step = 'services'">Back</ElButton>
                </div>

                <div v-if="staffError" class="rounded-xl border border-amber-300 bg-amber-100/20 px-4 py-3 text-amber-100">
                  {{ staffError }}
                </div>

                <div class="services-grid">
                  <button
                    class="service-card"
                    :class="{ active: selectedStaffId === null }"
                    @click="selectStaff(null); goFromStaffToReview()"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="text-2xl">🤝</div>
                      <div class="service-chip" v-if="selectedStaffId === null">Selected</div>
                    </div>
                    <div class="text-lg font-semibold text-white">No preference</div>
                    <div class="text-sm text-white/80">We will assign the best available staff.</div>
                  </button>

                  <button
                    v-for="staff in staffList"
                    :key="staff.id"
                    class="service-card"
                    :class="{ active: selectedStaffId === staff.id }"
                    @click="selectStaff(staff.id); goFromStaffToReview()"
                    :disabled="!staff.active"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="text-2xl">👤</div>
                      <div class="service-chip" v-if="selectedStaffId === staff.id">Selected</div>
                    </div>
                    <div class="text-lg font-semibold text-white">
                      {{ staff.name }}
                      <span v-if="staff.nickname" class="text-white/60">({{ staff.nickname }})</span>
                    </div>
                    <div class="text-sm text-white/70">
                      {{ staff.active ? 'Available' : 'Unavailable' }}
                    </div>
                  </button>
                </div>

                <div v-if="!staffList.length && !staffLoading" class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/80">
                  No staff available right now — we'll assign for you.
                </div>
              </div>

              <div v-else-if="step === 'review'" class="space-y-4">
                <div class="kiosk-heading">
                  <div>
                    <p class="text-xl font-semibold text-white">Review</p>
                    <p class="text-sm text-white/70">Confirm before checking in.</p>
                  </div>
                  <ElButton size="large" @click="step = 'services'">Back</ElButton>
                </div>

                <div class="review-block">
                  <div>
                    <p class="text-sm text-white/70">Name</p>
                    <p class="text-lg font-semibold text-white">{{ name || 'Guest' }}</p>
                  </div>
                  <div>
                    <p class="text-sm text-white/70">Phone</p>
                    <p class="text-lg font-semibold text-white">{{ formattedPhone }}</p>
                  </div>
                  <div>
                    <p class="text-sm text-white/70">Services</p>
                    <ul v-if="selectedServiceDetails.length" class="list-inside list-disc text-white">
                      <li v-for="service in selectedServiceDetails" :key="service.id" class="text-base">
                        {{ service.name }}
                        <span v-if="service.durationMinutes" class="text-white/70">
                          · {{ service.durationMinutes }} min
                        </span>
                      </li>
                    </ul>
                    <p v-else class="text-base text-white/80">No services selected.</p>
                  </div>
                  <div v-if="allowStaffSelection">
                    <p class="text-sm text-white/70">Staff preference</p>
                    <p class="text-base text-white">
                      {{ selectedStaffName || 'No preference' }}
                    </p>
                  </div>
                  <div v-if="showPoints && lookupResult?.exists && lookupResult.customer">
                    <p class="text-sm text-white/70">Rewards preview</p>
                    <p class="text-base text-white">
                      💎 {{ lookupResult.customer.pointsBalance ?? 0 }} points
                    </p>
                    <p class="text-sm text-white/70">
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
                  <ElButton size="large" @click="step = 'services'">Back</ElButton>
                  <ElButton type="primary" size="large" :loading="submitting" @click="confirmCheckIn">
                    Confirm check-in
                  </ElButton>
                </div>
              </div>

              <div v-else-if="step === 'done'" class="done-card">
                <div class="text-4xl mb-1">✅ Checked in!</div>
                <div class="text-2xl font-semibold text-white mb-2">Thanks, {{ successName }}.</div>
                <div class="text-sm text-white/70 mb-4">You’re all set — we’ll take it from here.</div>

                <div
                  v-if="showPoints"
                  class="mt-1 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-left shadow-lg"
                >
                  <div class="text-xl font-semibold text-white">
                    💎 {{ animatedPoints ?? lookupResult?.customer?.pointsBalance ?? 0 }} points
                  </div>
                  <div class="text-sm text-white/80">
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

                <div class="mt-4 w-full max-w-2xl mx-auto text-left">
                  <div class="text-sm text-white/70 mb-2">Services selected</div>
                  <div v-if="successServices.length" class="flex flex-wrap gap-2">
                    <div
                      v-for="svc in successServices"
                      :key="svc"
                      class="service-chip-card"
                    >
                      <span class="text-lg">💅</span>
                      <span class="text-sm font-semibold text-white">{{ svc }}</span>
                    </div>
                  </div>
                  <div v-else class="text-sm text-white/60">
                    Services will be confirmed at the counter.
                  </div>
                </div>

                <div class="mt-5 flex flex-col items-center gap-2">
                  <div class="text-sm text-white/70">
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
  background: radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.2), transparent 40%),
    radial-gradient(circle at 80% 0%, rgba(59, 130, 246, 0.25), transparent 35%),
    linear-gradient(135deg, #0f172a, #0b132b 45%, #111827);
  overscroll-behavior: none;
  touch-action: manipulation;
  -webkit-touch-callout: none;
  user-select: none;
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
}
.kiosk-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
}
.kiosk-disabled {
  border: 1px dashed rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
}
.stepper {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 8px 10px;
}
.stepper-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
  font-size: 13px;
}
.stepper-item.active {
  color: #fff;
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
.welcome-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 16px;
  padding: 32px;
  background: linear-gradient(120deg, #0ea5e9, #6366f1);
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.welcome-card:active {
  transform: scale(0.985);
  box-shadow: 0 10px 30px rgba(14, 165, 233, 0.25);
}
.kiosk-pane {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  padding: 16px;
}
.phone-display {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
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
  background: #0ea5e9;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  padding: 16px 12px;
  border: none;
  cursor: pointer;
  transition: transform 0.1s ease, background 0.1s ease;
}
.keypad-key.action {
  background: rgba(255, 255, 255, 0.08);
}
.keypad-key:hover {
  transform: translateY(-1px);
}
.keypad-key:active {
  transform: scale(0.97);
  background: #0284c7;
}
.kiosk-label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 6px;
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
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  padding: 16px;
  text-align: left;
  color: #fff;
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
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.service-card {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  padding: 16px;
  text-align: left;
  color: #fff;
  cursor: pointer;
  transition: transform 0.12s ease, border 0.12s ease, background 0.12s ease;
}
.service-card.active {
  border-color: rgba(99, 102, 241, 0.8);
  background: rgba(99, 102, 241, 0.12);
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
  background: rgba(99, 102, 241, 0.2);
  border-radius: 999px;
  font-size: 12px;
  color: #c7d2fe;
  border: 1px solid rgba(99, 102, 241, 0.4);
}
.review-block {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  padding: 16px;
  display: grid;
  gap: 12px;
}
.review-block p {
  user-select: text;
}
.done-card {
  text-align: center;
  padding: 36px 24px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(120deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.12));
  color: #fff;
}
.service-chip-card {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}
.service-chip-card span {
  color: #fff;
}
.idle-banner {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
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
