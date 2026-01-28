<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import { useRoute } from "vue-router";
import { ElAlert, ElButton, ElCard, ElInput } from "element-plus";
import { fetchPublicSettings, type BusinessSettings } from "../../api/settings";
import {
  publicLookup,
  createPublicCheckIn,
  fetchGroupedServices,
  type ServiceOption,
} from "../../api/checkins";
import { fetchPublicAvailableStaff, type StaffMember } from "../../api/staff";
import { startKioskIdleWatchdog } from "../../utils/kioskIdleWatchdog";
import { applyThemeFromSettings } from "../../utils/theme";
import { formatUSPhone } from "../../utils/format";

type Step = "welcome" | "phone" | "name" | "services" | "staff" | "done";

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
const step = ref<Step>("phone");
const phone = ref("");
const name = ref("");
const email = ref("");
const emailDomains = ["@gmail.com", "@icloud.com", "@outlook.com"];
const selectedServiceIds = ref<string[]>([]);
const groupedServices = ref<ServiceGroup[]>([]);
const settings = ref<BusinessSettings | null>(null);
const settingsError = ref("");
const errorMessage = ref("");
const submitting = ref(false);
const successName = ref("Guest");
const successServices = ref<string[]>([]);
const animatedPoints = ref<number | null>(null);
const pointsAnimationFrame = ref<number | null>(null);
const doneCountdown = ref<number | null>(null);
const doneTimer = ref<number | null>(null);
const stopWatchdog = ref<(() => void) | null>(null);
const staffList = ref<StaffMember[]>([]);
const staffLoading = ref(false);
const staffError = ref("");
const selectedStaffId = ref<string | null>(null);
const lookupResult = ref<null | {
  exists: boolean;
  customer?: {
    id: string;
    name: string;
    email?: string | null;
    pointsBalance: number | null;
  };
}>(null);
const lookupError = ref("");
const lookupLoading = ref(false);
const lookupTimer = ref<number | null>(null);

const defaultSettings: BusinessSettings = {
  businessId: "",
  businessName: "",
  timezone: null,
  currency: "USD",
  kioskEnabled: false,
  publicCheckInEnabled: true,
  requirePhone: true,
  showPointsOnKiosk: true,
  showPointsPreview: true,
  allowMultiService: false,
  requireService: false,
  allowStaffSelection: false,
  requireStaffSelection: false,
  kioskWelcomeStyle: "classic",
  kioskShowRewardsCard: true,
  kioskAllowSkipService: true,
  kioskAllowSkipStaff: true,
  kioskAutoResetSeconds: null,
  enforceStaffAvailability: false,
  uiFontScale: 1,
  uiGlassEnabled: true,
  uiFontFamily: "system",
  kioskThemeMode: "milky",
  kioskPrimaryColor: "moneyGreen",
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
    (typeof window !== "undefined"
      ? (localStorage.getItem("tenantSubdomain") ?? undefined)
      : undefined) ||
    (typeof window !== "undefined"
      ? (localStorage.getItem("tenantId") ?? undefined)
      : undefined) ||
    "demo",
);

const stepItems = computed<Array<{ key: Step; label: string }>>(() => {
  const base: Array<{ key: Step; label: string }> = [];
  if (!useClassicWelcome.value) {
    base.push({ key: "welcome", label: "Welcome" });
  }
  base.push(
    { key: "phone", label: "Phone" },
    { key: "name", label: "Name & Email" },
    { key: "services", label: "Services" },
  );
  if (showStaffStep.value) {
    base.push({ key: "staff", label: "Staff" });
  }
  base.push({ key: "done", label: "Done" });
  return base;
});
const stepIcons: Record<Step, string> = {
  welcome: "👋",
  phone: "📞",
  name: "👤",
  services: "💅",
  staff: "🧑‍🎨",
  done: "✅",
};
const currentStepIndex = computed(() =>
  stepItems.value.findIndex((s) => s.key === step.value),
);

const allowMultiService = computed(
  () => settings.value?.allowMultiService ?? false,
);
const requireService = computed(() => settings.value?.requireService ?? false);
const requirePhone = computed(() => settings.value?.requirePhone !== false);
const allowPhoneSkip = computed(() => !requirePhone.value);
const kioskEnabled = computed(() => settings.value?.kioskEnabled ?? false);
const publicEnabled = computed(
  () => settings.value?.publicCheckInEnabled !== false,
);
const showPoints = computed(() => {
  if (!settings.value) return true;
  const flag =
    settings.value.showPointsPreview ?? settings.value.showPointsOnKiosk;
  return flag !== false;
});
const showStaffStep = computed(
  () => settings.value?.allowStaffSelection === true,
);
const allowStaffSelection = showStaffStep;
const requireStaffStep = computed(
  () => showStaffStep.value && settings.value?.requireStaffSelection === true,
);
const allowStaffSkip = computed(
  () => showStaffStep.value && settings.value?.kioskAllowSkipStaff !== false,
);
const enforceStaffAvailability = computed(
  () => settings.value?.enforceStaffAvailability === true,
);
const welcomeStyle = computed(
  () => settings.value?.kioskWelcomeStyle ?? "classic",
);
const useClassicWelcome = computed(() => welcomeStyle.value === "classic");
const showRewardsCard = computed(
  () => settings.value?.kioskShowRewardsCard !== false,
);
const allowServiceSkip = computed(
  () =>
    !requireService.value && settings.value?.kioskAllowSkipService !== false,
);
const autoResetSeconds = computed(() => {
  const raw = settings.value?.kioskAutoResetSeconds;
  if (raw === null || raw === undefined) return 10;
  const n = Number(raw);
  if (Number.isNaN(n)) return 10;
  return Math.min(Math.max(Math.round(n), 5), 120);
});

const selectedServiceDetails = computed<ServiceGroup["services"][number][]>(
  () => {
    const map = new Map<string, ServiceGroup["services"][number]>();
    groupedServices.value.forEach((group) => {
      group.services.forEach((service) => map.set(service.id, service));
    });
    return selectedServiceIds.value
      .map((id) => map.get(id))
      .filter((service): service is ServiceGroup["services"][number] =>
        Boolean(service),
      );
  },
);

const serviceSections = computed(() => {
  const list = [...groupedServices.value];
  const active = list.filter((c) => c.categoryId);
  const uncategorized = list.filter((c) => !c.categoryId);
  return [...active, ...uncategorized];
});

const displayPhone = computed(() => formatUSPhone(phone.value) || "• • • •");

const keypad = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["clear", "0", "backspace"],
];

const backspaceTimer = ref<number | null>(null);
const lastPointerTs = ref(0);

const primaryServiceId = computed(() => selectedServiceIds.value[0] ?? null);
const estimatedTotal = computed(() => {
  const totalCents = selectedServiceDetails.value.reduce(
    (acc, svc) => acc + (svc.priceCents ?? 0),
    0,
  );
  const currency = settings.value?.currency || "USD";
  const amount = totalCents / 100;
  const formatted = Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
  return { amount, totalCents, formatted, currency };
});

const appendDigit = (digit: string) => {
  if (phone.value.length >= 18) return;
  phone.value += digit;
};

const clearPhone = () => {
  phone.value = "";
};

const handleBackspace = () => {
  phone.value = phone.value.slice(0, -1);
};

const startBackspaceHold = () => {
  if (backspaceTimer.value !== null) return;
  backspaceTimer.value = window.setTimeout(() => {
    clearPhone();
    stopBackspaceHold();
  }, 650);
};

const stopBackspaceHold = () => {
  if (backspaceTimer.value !== null) {
    clearTimeout(backspaceTimer.value);
    backspaceTimer.value = null;
  }
};

const handleKeyRelease = (key: string) => {
  if (key === "backspace") {
    handleBackspace();
    return;
  }
  if (key === "clear") {
    clearPhone();
    return;
  }
  appendDigit(key);
};

const onKeyPointerDown = (key: string, event: PointerEvent) => {
  event.preventDefault();
  if (key === "backspace") {
    startBackspaceHold();
  }
};

const onKeyPointerUp = (key: string, event: PointerEvent) => {
  event.preventDefault();
  lastPointerTs.value = performance.now();
  if (key === "backspace") {
    stopBackspaceHold();
  }
  handleKeyRelease(key);
};

const onKeyPointerCancel = (key: string) => {
  if (key === "backspace") {
    stopBackspaceHold();
  }
};

const onKeyClick = (key: string) => {
  const now = performance.now();
  if (now - lastPointerTs.value < 400) return;
  handleKeyRelease(key);
};

const normalizePhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length !== 10) {
    throw new Error("Enter a valid 10-digit phone number");
  }
  return `+1${digits}`;
};

const loadSettings = async () => {
  try {
    settings.value = await fetchPublicSettings();
    settingsError.value = "";
    applyThemeFromSettings(settings.value, {
      boost: 1.12,
      mode: "kiosk",
      maxScale: 1.4,
    });
  } catch (err: any) {
    settings.value = defaultSettings;
    settingsError.value = err?.message || "Unable to load settings.";
    applyThemeFromSettings(settings.value, {
      boost: 1.12,
      mode: "kiosk",
      maxScale: 1.4,
    });
  }
  step.value = useClassicWelcome.value ? "phone" : "welcome";
};

const refreshServices = async () => {
  try {
    groupedServices.value = await fetchGroupedServices();
  } catch (err: any) {
    groupedServices.value = [];
    errorMessage.value = err?.message || "Unable to load services.";
  }
};

const loadStaff = async () => {
  if (!showStaffStep.value) return;
  staffLoading.value = true;
  staffError.value = "";
  try {
    const res = await fetchPublicAvailableStaff(
      enforceStaffAvailability.value
        ? (primaryServiceId.value ?? undefined)
        : undefined,
    );
    staffList.value = res.staff ?? [];
    if (!staffList.value.length) {
      selectedStaffId.value = null;
    }
  } catch (err: any) {
    staffError.value = err?.message || "Unable to load staff right now.";
  } finally {
    staffLoading.value = false;
  }
};

const preventTouch = (e: Event) => e.preventDefault();

onMounted(async () => {
  if (tenant.value) {
    localStorage.setItem("tenantSubdomain", tenant.value);
    localStorage.setItem("tenantId", tenant.value);
  }
  window.addEventListener("touchmove", preventTouch, { passive: false });
  window.addEventListener("wheel", preventTouch, { passive: false });
  window.addEventListener("gesturestart", preventTouch as EventListener);
  await loadSettings();
  await refreshServices();
  await loadStaff();
  stopWatchdog.value = startKioskIdleWatchdog({
    softResetMs: 30_000,
    onSoftReset: () => {
      resetFlow();
      refreshServices();
      loadStaff();
    },
  });
});

onBeforeUnmount(() => {
  if (doneTimer.value !== null) {
    clearInterval(doneTimer.value);
  }
});

onUnmounted(() => {
  stopWatchdog.value?.();
  applyThemeFromSettings(settings.value, { mode: "app" });
  delete document.documentElement.dataset.kioskTheme;
  delete document.documentElement.dataset.kioskPrimary;
  window.removeEventListener("touchmove", preventTouch);
  window.removeEventListener("wheel", preventTouch);
  window.removeEventListener("gesturestart", preventTouch as EventListener);
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
  phone.value = "";
  name.value = "";
  email.value = "";
  selectedServiceIds.value = [];
  selectedStaffId.value = null;
  errorMessage.value = "";
  successServices.value = [];
  successName.value = "Guest";
  lookupResult.value = null;
  lookupError.value = "";
  lookupLoading.value = false;
  if (lookupTimer.value) {
    clearTimeout(lookupTimer.value);
    lookupTimer.value = null;
  }
  step.value = useClassicWelcome.value ? "phone" : "welcome";
};

const canAdvanceFromPhone = computed(() => {
  if (!requirePhone.value) return true;
  const digits = phone.value.replace(/\D/g, "");
  return digits.length === 10;
});

const hasKnownIdentity = computed(
  () => !!name.value.trim() && !!email.value.trim(),
);
const canAdvanceFromName = computed(() => !!name.value.trim());
const hasPhoneDigits = computed(() => phone.value.replace(/\D/g, "").length > 0);

const canAdvanceFromServices = computed(() => {
  if (requireService.value) return selectedServiceIds.value.length > 0;
  if (!allowServiceSkip.value && selectedServiceIds.value.length === 0)
    return false;
  return true;
});

const goToPhone = () => {
  errorMessage.value = "";
  step.value = "phone";
};

const skipPhoneStep = () => {
  phone.value = "";
  proceedFromPhone();
};

const proceedFromPhone = () => {
  if (!canAdvanceFromPhone.value) {
    errorMessage.value = "Enter a valid 10-digit phone number.";
    return;
  }
  errorMessage.value = "";
  step.value = hasKnownIdentity.value ? "services" : "name";
};

const proceedFromName = () => {
  if (!canAdvanceFromName.value) {
    errorMessage.value = "Name is required.";
    return;
  }
  errorMessage.value = "";
  step.value = "services";
};

const toggleService = (serviceId: string) => {
  errorMessage.value = "";
  if (allowMultiService.value) {
    if (selectedServiceIds.value.includes(serviceId)) {
      selectedServiceIds.value = selectedServiceIds.value.filter(
        (id) => id !== serviceId,
      );
    } else {
      selectedServiceIds.value = [...selectedServiceIds.value, serviceId];
    }
    return;
  }
  selectedServiceIds.value = selectedServiceIds.value.includes(serviceId)
    ? []
    : [serviceId];
};

const skipServiceSelection = () => {
  if (!allowServiceSkip.value) return;
  selectedServiceIds.value = [];
  errorMessage.value = "";
  if (showStaffStep.value) {
    step.value = "staff";
    loadStaff();
    return;
  }
  confirmCheckIn();
};

const goNextFromServices = async () => {
  if (requireService.value && selectedServiceIds.value.length === 0) {
    errorMessage.value = "Please select at least one service.";
    return;
  }
  if (
    !requireService.value &&
    !allowServiceSkip.value &&
    selectedServiceIds.value.length === 0
  ) {
    errorMessage.value = "Select a service or enable skips in Settings.";
    return;
  }
  errorMessage.value = "";
  if (showStaffStep.value) {
    step.value = "staff";
    await loadStaff();
    return;
  }
  await confirmCheckIn();
};

const selectStaff = (staffId: string | null) => {
  selectedStaffId.value = staffId;
  errorMessage.value = "";
};

const goFromStaffToReview = async () => {
  if (requireStaffStep.value && !selectedStaffId.value) {
    errorMessage.value = "Please choose a staff member.";
    return;
  }
  await confirmCheckIn();
};

const skipStaffSelection = async () => {
  if (!allowStaffSkip.value || requireStaffStep.value) return;
  selectedStaffId.value = null;
  errorMessage.value = "";
  await confirmCheckIn();
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
    errorMessage.value = "Kiosk check-in is disabled right now.";
    step.value = "welcome";
    return;
  }
  if (requirePhone.value && !canAdvanceFromPhone.value) {
    errorMessage.value = "Enter a valid 10-digit phone number.";
    step.value = "phone";
    return;
  }
  const personName =
    lookupResult.value?.customer?.name?.trim() || name.value.trim();
  if (!personName) {
    errorMessage.value = "Name is required.";
    step.value = "name";
    return;
  }
  if (requireService.value && selectedServiceIds.value.length === 0) {
    errorMessage.value = "Please select at least one service.";
    step.value = "services";
    return;
  }
  if (requireStaffStep.value && !selectedStaffId.value) {
    errorMessage.value = "Please select a staff member.";
    step.value = "staff";
    return;
  }
  submitting.value = true;
  errorMessage.value = "";
  try {
    const normalizedPhone = normalizePhone(phone.value);
    const primaryServiceId = selectedServiceIds.value[0] ?? null;
    const matchedService = primaryServiceId
      ? (selectedServiceDetails.value.find((s) => s.id === primaryServiceId) ??
        null)
      : null;
    const serviceName = matchedService?.name || null;
    await createPublicCheckIn({
      name: personName,
      phoneE164: requirePhone.value ? normalizedPhone : normalizedPhone || null,
      serviceId: primaryServiceId,
      serviceName,
      staffId: selectedStaffId.value,
      email: email.value.trim() || null,
    });
    name.value = personName;
    successName.value = personName;
    successServices.value = selectedServiceDetails.value
      .map((s) => s.name)
      .filter(Boolean);
    startPointsAnimation(lookupResult.value?.customer?.pointsBalance ?? null);
    step.value = "done";
    startDoneCountdown();
  } catch (err: any) {
    errorMessage.value = err?.message || "Failed to check in.";
  } finally {
    submitting.value = false;
  }
};

const onLookup = async () => {
  const digits = phone.value.replace(/\D/g, "");
  if (!digits) {
  lookupResult.value = null;
  lookupError.value = "";
  return;
}
if (digits.length !== 10) {
  lookupResult.value = null;
  lookupError.value = "";
  return;
}
  lookupLoading.value = true;
  try {
    const normalizedPhone = normalizePhone(phone.value);
    const res = await publicLookup(normalizedPhone);
    lookupResult.value = res;
    lookupError.value = "";
    if (res.exists && res.customer?.name) {
      name.value = res.customer.name;
    }
    if (res.exists && res.customer?.email) {
      email.value = res.customer.email;
    }
    if (
      step.value === "phone" &&
      canAdvanceFromPhone.value &&
      name.value.trim() &&
      email.value.trim()
    ) {
      step.value = "services";
    }
  } catch (_err) {
    lookupResult.value = null;
    lookupError.value = "";
  } finally {
    lookupLoading.value = false;
  }
};

const applyEmailDomain = (domain: string) => {
  const current = email.value.trim();
  if (!current) {
    // Require user to type local-part first; no action if empty.
    return;
  }
  const local = current.split("@")[0] || current;
  email.value = `${local}${domain}`;
};

watch(
  () => phone.value,
  () => {
    if (lookupTimer.value) {
      clearTimeout(lookupTimer.value);
    }
    const digits = phone.value.replace(/\D/g, "");
    if (!digits) {
      lookupResult.value = null;
      lookupError.value = "";
      return;
    }
    if (digits.length !== 10) {
      lookupResult.value = null;
      lookupError.value = "Enter a valid 10-digit phone number";
      return;
    }
    lookupTimer.value = window.setTimeout(onLookup, 400);
  },
);

watch(
  () => [
    primaryServiceId.value,
    enforceStaffAvailability.value,
    allowStaffSelection.value,
  ],
  () => {
    if (showStaffStep.value) {
      loadStaff();
    }
  },
);

watch(useClassicWelcome, (isClassic) => {
  if (isClassic && step.value === "welcome") {
    step.value = "phone";
  }
  if (!isClassic && step.value === "phone" && !phone.value && !name.value) {
    step.value = "welcome";
  }
});
</script>

<template>
  <div class="kiosk-shell">
    <div class="kiosk-inner">
      
      <ElAlert
        v-if="settingsError"
        :closable="false"
        type="warning"
        :title="settingsError"
        class="mb-3"
      />

      <div v-if="!kioskEnabled" class="kiosk-disabled">
        <div
          class="text-lg font-semibold"
          :style="{ color: 'var(--kiosk-text-primary)' }"
        >
          Kiosk is disabled
        </div>
        <div class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">
          Enable kiosk mode in Settings to allow check-ins.
        </div>
        <ElButton class="mt-3" @click="resetFlow" round
          >Back to welcome</ElButton
        >
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
            <span class="stepper-icon" aria-hidden="true">{{
              stepIcons[item.key]
            }}</span>
            <span>{{ item.label }}</span>
          </div>
        </div>
        <div v-if="errorMessage" class="kiosk-inline-error">
          {{ errorMessage }}
        </div>

        <ElCard class="kiosk-card glass-card">
          <template #default>
            <div
              v-if="!publicEnabled"
              class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800"
            >
              Public check-in is disabled. Please see the front desk.
            </div>

            <div v-else>
              <div
                v-if="step === 'welcome'"
                class="welcome-card"
                @click="goToPhone"
              >
                <div class="space-y-2">
                  <p
                    class="text-sm uppercase tracking-wide"
                    :style="{ color: 'var(--kiosk-text-secondary)' }"
                  >
                    Touch to start
                  </p>
                  <p
                    class="text-4xl font-semibold"
                    :style="{ color: 'var(--kiosk-text-primary)' }"
                  >
                    Check in & earn rewards
                  </p>
                  <p
                    class="text-lg"
                    :style="{ color: 'var(--kiosk-text-secondary)' }"
                  >
                    We kept the classic flow your team already knows.
                  </p>
                  <ElButton type="primary" size="large">Start</ElButton>
                </div>
                <div
                  v-if="showRewardsCard && showPoints"
                  class="welcome-reward glass-card"
                >
                  <div
                    class="text-xs font-semibold uppercase tracking-wide"
                    :style="{ color: 'var(--kiosk-text-secondary)' }"
                  >
                    Loyalty
                  </div>
                  <div
                    class="text-2xl font-semibold"
                    :style="{ color: 'var(--kiosk-text-primary)' }"
                  >
                    300 points = $5 off
                  </div>
                  <div
                    class="text-sm"
                    :style="{ color: 'var(--kiosk-text-secondary)' }"
                  >
                    Tap to begin and keep earning.
                  </div>
                </div>
              </div>

              <div v-else-if="step === 'phone'" class="space-y-5">
                <div class="phone-hero grid gap-4 lg:grid-cols-[1fr,1.15fr]">
                  <div class="left-stack kiosk-left-panel">
                    <div class="identity-box glass-card">
                      <div class="identity-name">MTV NAIL SPA CORPUS CHRISTI</div>
                      <div class="identity-phone" aria-label="Phone">
                        <span class="identity-phone-icon" aria-hidden="true">📞</span>
                        <span class="identity-phone-text">(361) 986-1555</span>
                      </div>
                      <div class="identity-hours">
                        <div class="identity-hours-label">Hours</div>
                        <div class="identity-hour-row">
                          <span class="identity-hour-day">Mon–Sat</span>
                          <span class="identity-hour-time">10:00 AM – 9:00 PM</span>
                        </div>
                        <div class="identity-hour-row">
                          <span class="identity-hour-day">Sun</span>
                          <span class="identity-hour-time">11:00 AM – 7:00 PM</span>
                        </div>
                      </div>
                    </div>
                    <div class="loyalty-box glass-card" aria-label="Loyalty teaser">
                      <div class="loyalty-title">LOYALTY</div>
                      <div class="loyalty-value">
                        300 points = $5 off
                        <span class="loyalty-emoji" aria-hidden="true">💵</span>
                      </div>
                    </div>
                    <div class="consent-block glass-card kiosk-opt-in" aria-label="Consent notice">
                      <p>
                        By entering your phone number and clicking Next, you give SalonFlow express
                        written consent to contact you at the number provided for appointment
                        reminders and notifications. Message frequency varies. Reply STOP to opt out.
                        Reply HELP for help. Consent is not required to check in or make a purchase.
                        You also agree to our
                        <a href="/terms" target="_blank" rel="noopener" class="link">Terms of Service</a>
                        and
                        <a href="/privacy" target="_blank" rel="noopener" class="link">Privacy Policy</a>.
                      </p>
                    </div>
                  </div>
                  <div class="phone-panel kiosk-pane glass-card kiosk-step-panel">
                    <div class="phone-heading">
                      <!-- <p
                        class="text-xs uppercase tracking-wide"
                        :style="{ color: 'var(--kiosk-text-secondary)' }"
                      >
                        Step 1 • Phone
                      </p> -->
                      <p
                        class="text-2xl font-semibold"
                        :style="{ color: 'var(--kiosk-text-primary)' }"
                      >
                        Enter your phone
                      </p>
                    </div>
                    <div class="phone-display" aria-label="Phone number">
                      <div
                        class="text-4xl font-semibold"
                        :style="{ color: 'var(--kiosk-text-primary)' }"
                      >
                        {{ displayPhone }}
                      </div>
                    </div>
                    <div class="keypad kiosk-keypad">
                      <template
                        v-for="(row, rowIndex) in keypad"
                        :key="row.join('-')"
                      >
                        <template v-for="key in row" :key="`${rowIndex}-${key}`">
                          <button
                            v-if="!(key === 'backspace' || key === 'clear') || hasPhoneDigits"
                            :class="[
                              'keypad-key',
                              {
                                action: key === 'backspace' || key === 'clear',
                                secondary: key === 'backspace' || key === 'clear',
                              },
                            ]"
                            @pointerdown="onKeyPointerDown(key, $event)"
                            @pointerup="onKeyPointerUp(key, $event)"
                            @pointercancel="onKeyPointerCancel(key)"
                            @pointerleave="onKeyPointerCancel(key)"
                            @click="onKeyClick(key)"
                          >
                            <span v-if="key === 'backspace'">⌫</span>
                            <span v-else-if="key === 'clear'">Clear</span>
                            <span v-else>{{ key }}</span>
                          </button>
                          <div v-else class="keypad-key keypad-key--spacer" aria-hidden="true"></div>
                        </template>
                      </template>
                    </div>
                    <div
                      class="keypad-actions kiosk-footer flex flex-wrap gap-4 justify-end"
                    >
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
                        v-if="canAdvanceFromPhone"
                        class="kiosk-next-btn"
                        @click="proceedFromPhone"
                      >
                        Next
                      </ElButton>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else-if="step === 'name'" class="space-y-5">
                <div class="kiosk-heading">
                  <div>
                    <p
                      class="text-xl font-semibold"
                      :style="{ color: 'var(--kiosk-text-primary)' }"
                    >
                      Your name & email
                    </p>
                    <p
                      class="text-sm"
                      :style="{ color: 'var(--kiosk-text-secondary)' }"
                    >
                      We’ll use this to call you when it’s your turn and send receipts if needed.
                    </p>
                  </div>
                </div>

                <div class="kiosk-pane glass-card space-y-4 name-input-wrap">
                  <label class="kiosk-label"> Name </label>
                  <ElInput
                    v-model="name"
                    size="large"
                    placeholder="Your name"
                  />
                  <div class="email-inline">
                    <label class="kiosk-label"> Email (optional) </label>
                    <ElInput
                      v-model="email"
                      size="large"
                      placeholder="Email (optional)"
                      type="email"
                    />
                    <div class="email-domains">
                      <button
                        v-for="domain in emailDomains"
                        :key="domain"
                        type="button"
                        class="email-domain-pill"
                        @click="applyEmailDomain(domain)"
                      >
                        {{ domain }}
                      </button>
                    </div>
                  </div>
                  <div
                    v-if="lookupResult?.customer?.name"
                    class="text-xs"
                    :style="{ color: 'var(--kiosk-text-secondary)' }"
                  >
                    Loaded from your profile. You can edit it if needed.
                  </div>
                </div>

                <div class="flex justify-end gap-3">
                  <ElButton size="large" @click="step = 'phone'">Back</ElButton>
                  <ElButton
                    type="primary"
                    size="large"
                    :disabled="!canAdvanceFromName"
                    @click="proceedFromName"
                  >
                    Next
                  </ElButton>
                </div>
              </div>

              <div v-else-if="step === 'services'" class="space-y-5">
                <div class="kiosk-heading">
                  <div>
                    <p
                      class="text-xl font-semibold"
                      :style="{ color: 'var(--kiosk-text-primary)' }"
                    >
                      Select services
                    </p>
                    <p
                      class="text-sm"
                      :style="{ color: 'var(--kiosk-text-secondary)' }"
                    >
                      {{
                        allowMultiService
                          ? "Tap all that apply."
                          : "Choose one service."
                      }}
                    </p>
                  </div>
                </div>

                <div v-if="serviceSections.length" class="service-section-grid">
                  <div
                    v-for="category in serviceSections"
                    :key="category.categoryId || 'uncategorized'"
                    class="service-section glass-card"
                  >
                    <div class="section-header">
                      <div class="section-icon">
                        {{ category.categoryIcon || "💅" }}
                      </div>
                      <div>
                        <div class="section-title">
                          {{ category.categoryName || "Other services" }}
                        </div>
                        <div class="section-sub">
                          {{ category.services.length }} options
                        </div>
                      </div>
                    </div>
                    <div v-if="category.services.length" class="service-list">
                      <label
                        v-for="service in category.services"
                        :key="service.id"
                        class="service-row"
                        :class="{
                          active: selectedServiceIds.includes(service.id),
                        }"
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
                            <span v-if="service.durationMinutes"
                              >{{ service.durationMinutes }} min</span
                            >
                            <span
                              v-if="
                                service.priceCents !== undefined &&
                                service.priceCents !== null
                              "
                              class="inline-flex items-center gap-1"
                            >
                              <span aria-hidden="true">•</span>
                              {{
                                Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency:
                                    service.currency ||
                                    settings?.currency ||
                                    "USD",
                                  minimumFractionDigits: 0,
                                }).format((service.priceCents || 0) / 100)
                              }}
                            </span>
                          </div>
                        </div>
                        <span
                          class="service-chip"
                          v-if="selectedServiceIds.includes(service.id)"
                          >Selected</span
                        >
                      </label>
                    </div>
                    <div v-else class="service-empty">
                      No services in this category yet.
                    </div>
                  </div>
                </div>
                <div
                  v-else
                  class="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  :style="{ color: 'var(--kiosk-text-secondary)' }"
                >
                  No services published yet.
                </div>

                <div class="service-actions">
                  <ElButton size="large" @click="step = 'name'">Back</ElButton>
                  <ElButton
                    v-if="allowServiceSkip"
                    size="large"
                    plain
                    @click="skipServiceSelection"
                  >
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

              <div
                v-else-if="step === 'staff' && showStaffStep"
                class="space-y-5"
              >
                <div class="kiosk-heading">
                  <div>
                    <p
                      class="text-xl font-semibold"
                      :style="{ color: 'var(--kiosk-text-primary)' }"
                    >
                      Choose a staff member
                    </p>
                    <p
                      class="text-sm"
                      :style="{ color: 'var(--kiosk-text-secondary)' }"
                    >
                      {{
                        enforceStaffAvailability
                          ? "Available staff shown based on today’s schedule."
                          : "Pick anyone or continue without preference."
                      }}
                    </p>
                  </div>
                </div>

                <div
                  v-if="staffError"
                  class="rounded-xl border border-amber-300 bg-amber-100/20 px-4 py-3 text-amber-800"
                >
                  {{ staffError }}
                </div>

                <div
                  v-if="staffLoading"
                  class="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  :style="{ color: 'var(--kiosk-text-secondary)' }"
                >
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
                      <div class="service-chip" v-if="selectedStaffId === null">
                        Selected
                      </div>
                    </div>
                    <div
                      class="text-lg font-semibold"
                      :style="{ color: 'var(--kiosk-text-primary)' }"
                    >
                      No preference
                    </div>
                    <div
                      class="text-sm"
                      :style="{ color: 'var(--kiosk-text-secondary)' }"
                    >
                      We will assign the best available staff.
                    </div>
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
                      <div
                        class="service-chip"
                        v-if="selectedStaffId === staff.id"
                      >
                        Selected
                      </div>
                    </div>
                    <div
                      class="text-lg font-semibold"
                      :style="{ color: 'var(--kiosk-text-primary)' }"
                    >
                      {{ staff.name }}
                      <span
                        v-if="staff.nickname"
                        :style="{ color: 'var(--kiosk-text-secondary)' }"
                        >({{ staff.nickname }})</span
                      >
                    </div>
                    <div
                      class="text-sm"
                      :style="{ color: 'var(--kiosk-text-secondary)' }"
                    >
                      {{ staff.active ? "Available" : "Unavailable" }}
                    </div>
                  </button>
                </div>

                <div
                  v-if="!staffList.length && !staffLoading"
                  class="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  :style="{ color: 'var(--kiosk-text-secondary)' }"
                >
                  No staff available right now — we'll assign for you.
                </div>

                <div class="service-actions">
                  <ElButton size="large" @click="step = 'services'"
                    >Back</ElButton
                  >
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
                    Complete check-in
                  </ElButton>
                </div>
              </div>

              <div v-else-if="step === 'done'" class="done-card glass-card">
                <div class="done-header">
                  <div class="done-check">✔</div>
                  <h1>Checked in</h1>
                  <p class="done-name">Thanks, {{ successName }}.</p>
                  <p class="done-sub">
                    You’re all set — we’ll take it from here.
                  </p>
                </div>

                <div
                  v-if="showPoints && lookupResult?.customer?.pointsBalance !== null && lookupResult?.customer?.pointsBalance !== undefined"
                  class="done-rewards"
                >
                  <div class="rewards-header">
                    <span class="rewards-icon" aria-hidden="true">💎</span>
                    <div
                      class="text-xl font-semibold"
                      :style="{ color: 'var(--kiosk-text-primary)' }"
                    >
                      {{ lookupResult?.customer?.pointsBalance ?? 0 }} points balance
                    </div>
                  </div>
                  <div class="text-sm" :style="{ color: 'var(--kiosk-text-secondary)' }">
                    Points update after your visit is processed.
                  </div>
                </div>

                <div class="final-services">
                  <p class="label">
                    <span class="label-icon" aria-hidden="true">📋</span>
                    <span>You’re checked in for</span>
                  </p>
                  <div
                    v-if="successServices.length"
                    class="flex flex-wrap justify-center gap-2"
                  >
                    <div
                      v-for="svc in successServices"
                      :key="svc"
                      class="service-chip-card"
                    >
                      <span class="text-lg">💅</span>
                      <span
                        class="text-sm font-semibold"
                        :style="{ color: 'var(--kiosk-text-primary)' }"
                        >{{ svc }}</span
                      >
                    </div>
                  </div>
                  <div
                    v-else
                    class="text-sm text-center"
                    :style="{ color: 'var(--kiosk-text-secondary)' }"
                  >
                    Services will be confirmed at the counter.
                  </div>
                </div>

                <div
                  v-if="estimatedTotal.totalCents > 0"
                  class="estimated-total text-center"
                >
                  <div
                    class="text-sm"
                    :style="{ color: 'var(--kiosk-text-secondary)' }"
                  >
                    Estimated total
                  </div>
                  <div
                    class="text-lg font-semibold"
                    :style="{ color: 'var(--kiosk-text-primary)' }"
                  >
                    {{ estimatedTotal.formatted }}
                  </div>
                  <div
                    class="text-xs"
                    :style="{ color: 'var(--kiosk-text-secondary)' }"
                  >
                    Final amount confirmed at checkout.
                  </div>
                </div>

                <div class="mt-5 flex flex-col items-center gap-2">
                  <div
                    class="text-sm"
                    :style="{ color: 'var(--kiosk-text-secondary)' }"
                  >
                    Restarting for next guest in
                    {{ doneCountdown ?? autoResetSeconds }}s
                  </div>
                  <ElButton
                    class="mt-1"
                    type="primary"
                    size="large"
                    @click="resetFlow"
                  >
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
  padding: 32px 12px max(40px, env(safe-area-inset-bottom, 18px));
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
:root[data-glass="off"] .kiosk-shell {
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
  background: color-mix(
    in srgb,
    var(--kiosk-surface) 96%,
    rgba(255, 255, 255, 0.04) 4%
  );
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
.kiosk-inline-error {
  margin: 8px 0 6px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 68, 68, 0.08);
  color: #ffb4b4;
  font-weight: 600;
  font-size: 14px;
}
.welcome-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  align-items: center;
  gap: 16px;
  border-radius: 18px;
  padding: 28px 32px;
  background: linear-gradient(
    135deg,
    var(--kiosk-primary),
    #18b46d 45%,
    var(--kiosk-accent)
  );
  cursor: pointer;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
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
  background: color-mix(
    in srgb,
    var(--kiosk-surface) 94%,
    rgba(255, 255, 255, 0.06) 6%
  );
  backdrop-filter: blur(var(--kiosk-blur));
  -webkit-backdrop-filter: blur(var(--kiosk-blur));
  padding: 16px;
}
.name-input-wrap {
  width: 60%;
  min-width: 320px;
  max-width: 820px;
  margin: 0 auto;
}
.email-inline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.email-domains {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.email-domain-pill {
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(255, 255, 255, 0.85);
  border-radius: 9999px;
  padding: 6px 10px;
  font-size: 13px;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.2s ease;
}
.email-domain-pill:hover {
  background: #f8fafc;
  border-color: rgba(59, 130, 246, 0.4);
}
.kiosk-pane :deep(.el-input__wrapper) {
  min-height: 56px;
  padding: 10px 14px;
}
.kiosk-pane :deep(.el-input__inner) {
  font-size: 18px;
}
.phone-display {
  border-radius: 12px;
  border: 1px solid var(--kiosk-border);
  background: color-mix(
    in srgb,
    var(--kiosk-surface) 92%,
    rgba(255, 255, 255, 0.08) 8%
  );
  backdrop-filter: blur(var(--kiosk-blur));
  -webkit-backdrop-filter: blur(var(--kiosk-blur));
  padding: 12px;
}
.keypad {
  /* Kiosk keypad grid: adjust spacing here */
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 0.3fr));
  row-gap: 8px;
  column-gap: 6px;
  justify-items: center;
  align-content: start;
  flex: 1;
}
.keypad-key {
  /* Kiosk keypad keys: size/shape/feel */
  width: 108px;
  height: 108px;
  border-radius: 50%;
  background:
    radial-gradient(
      circle at 30% 30%,
      rgba(255, 255, 255, 0.12),
      transparent 40%
    ),
    var(--kiosk-primary);
  color: var(--kiosk-key-text, var(--kiosk-text-primary));
  font-size: 26px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.3);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform 0.12s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}
.keypad-key--spacer {
  visibility: hidden;
  width: 108px;
  height: 108px;
}
.keypad-key.action {
  background: rgba(255, 255, 255, 0.14);
  color: #f8fafc;
}
.keypad-key.secondary {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
}
.keypad-key:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.35);
}
.keypad-key:active {
  transform: scale(0.94);
  background: color-mix(in srgb, var(--kiosk-primary) 82%, #000 18%);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45), 0 0 0 6px rgba(255, 255, 255, 0.05);
}
.keypad-actions {
  margin-top: auto;
  padding: 12px 0 10px;
}
.kiosk-footer {
  position: sticky;
  bottom: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    color-mix(in srgb, var(--kiosk-surface) 70%, transparent) 45%,
    var(--kiosk-surface) 100%
  );
  backdrop-filter: blur(var(--kiosk-blur));
  -webkit-backdrop-filter: blur(var(--kiosk-blur));
  z-index: 2;
  flex-shrink: 0;
}
.kiosk-opt-in {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(
    in srgb,
    var(--kiosk-surface, #0f1119) 85%,
    rgba(255, 255, 255, 0.05) 15%
  );
  color: var(--kiosk-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.kiosk-opt-in .link {
  color: var(--kiosk-primary);
  text-decoration: underline;
}
.kiosk-label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 6px;
}
.consent-block {
  font-size: 12px;
  line-height: 1.5;
  color: var(--kiosk-text-secondary);
}
.phone-hero {
  align-items: stretch;
}
.left-stack,
.kiosk-left-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.identity-box {
  padding: 20px 18px;
  background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--kiosk-primary) 18%, transparent) 0%,
      color-mix(in srgb, var(--kiosk-accent) 10%, transparent) 28%,
      transparent 60%
    ),
    var(--kiosk-surface);
  border: 1px solid color-mix(in srgb, var(--kiosk-border) 80%, #ffffff 20%);
}
.identity-name {
  font-family: 'Montserrat', 'Space Grotesk', 'Inter', system-ui, sans-serif;
  font-size: clamp(24px, 2.3vw + 10px, 34px);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.1;
  color: var(--kiosk-text-primary);
}
.identity-phone {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  font-weight: 800;
  font-size: 20px;
  color: var(--kiosk-text-primary);
  white-space: nowrap;
}
.identity-phone-icon {
  font-size: 22px;
  line-height: 1;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.18));
}
.identity-phone-text {
  letter-spacing: 0.02em;
}
.identity-hours {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--kiosk-border) 80%, transparent);
  display: grid;
  gap: 8px;
}
.identity-hours-label {
  font-size: 13px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 800;
  color: var(--kiosk-text-secondary);
}
.identity-hour-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--kiosk-text-secondary);
}
.identity-hour-day {
  color: var(--kiosk-text-primary);
}
.identity-hour-time {
  white-space: nowrap;
  color: var(--kiosk-text-secondary);
  font-weight: 700;
}
.loyalty-box {
  padding: 18px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid color-mix(in srgb, var(--kiosk-border) 90%, #ffffff 10%);
  background: color-mix(
    in srgb,
    var(--kiosk-surface) 92%,
    color-mix(in srgb, var(--kiosk-primary) 12%, transparent) 8%
  );
}
.loyalty-title {
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 800;
  color: var(--kiosk-text-secondary);
}
.loyalty-value {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: var(--kiosk-text-primary);
}
.loyalty-emoji {
  font-size: 28px;
  line-height: 1;
}
.phone-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100%;
}
.kiosk-step-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
}
.phone-bottom {
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.03),
    rgba(255, 255, 255, 0.08)
  );
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
  transition:
    transform 0.12s ease,
    border 0.12s ease,
    background 0.12s ease;
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
  transition:
    border 0.12s ease,
    transform 0.12s ease,
    background 0.12s ease;
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
  content: "✓";
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
  transition:
    transform 0.12s ease,
    border 0.12s ease,
    background 0.12s ease;
}
.service-card.active {
  border-color: rgba(99, 102, 241, 0.8);
  background: color-mix(
    in srgb,
    var(--kiosk-primary) 12%,
    rgba(255, 255, 255, 0.1) 88%
  );
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
  background: color-mix(
    in srgb,
    var(--kiosk-glass-bg) 94%,
    rgba(255, 255, 255, 0.06) 6%
  );
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
  background: color-mix(
    in srgb,
    var(--kiosk-glass-bg) 92%,
    rgba(255, 255, 255, 0.08) 8%
  );
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
.estimated-total {
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--kiosk-border);
  background: color-mix(
    in srgb,
    var(--kiosk-surface) 94%,
    rgba(255, 255, 255, 0.06) 6%
  );
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
  .identity-name {
    font-size: 24px;
  }
  .identity-phone {
    font-size: 18px;
  }
  .loyalty-value {
    font-size: 22px;
  }
}

@media (max-height: 880px) {
  .kiosk-shell {
    padding-top: 24px;
  }
  .phone-panel {
    max-height: calc(100vh - 180px);
    gap: 10px;
  }
  .keypad {
    margin-top: 12px;
    row-gap: 6px;
    column-gap: 6px;
  }
  .keypad-key {
    width: 78px;
    height: 78px;
    font-size: 22px;
  }
  .kiosk-opt-in {
    font-size: 11px;
  }
}

@media (min-width: 1024px) {
  .review-block {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
