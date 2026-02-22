<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElOptionGroup, ElButton, ElAlert } from 'element-plus';
import { useRoute } from 'vue-router';
import { createPublicCheckIn, fetchGroupedServices, publicLookup } from '../../api/checkins';
import type { ServiceOption } from '../../api/checkins';
import { fetchPublicAvailableStaff, type StaffMember } from '../../api/staff';
import { apiUrl, buildHeaders } from '../../api/client';
import { startKioskIdleWatchdog } from '../../utils/kioskIdleWatchdog';
import { fetchPublicSettings, type BusinessSettings } from '../../api/settings';
import { applyThemeFromSettings } from '../../utils/theme';
import { maintenanceActive } from '../../api/maintenance';

const form = reactive({
  name: '',
  phoneE164: '',
  serviceId: '',
  staffId: '',
});

const groupedServices = ref<
  Array<{
    categoryId: string | null;
    categoryName: string;
    categoryIcon: string;
    services: ServiceOption[];
  }>
>([]);
const loadingServices = ref(false);
const submitting = ref(false);
const success = ref(false);
const successPoints = ref<number | null>(null);
const successName = ref<string>('');
const errorMessage = ref('');
const lookupError = ref('');
const businessName = ref<string>('Check In');
const phoneInputRef = ref<InstanceType<typeof ElInput> | null>(null);
const resetTimer = ref<number | null>(null);
const stopWatchdog = ref<(() => void) | null>(null);
const lookupLoading = ref(false);
const lookupResult = ref<{ exists: boolean; customer?: { id: string; name: string; pointsBalance: number | null } } | null>(null);
const lookupTimer = ref<number | null>(null);
const rewardText = ref('Get $5 off');
const settings = ref<BusinessSettings | null>(null);
const settingsError = ref('');
const staffList = ref<StaffMember[]>([]);
const staffLoading = ref(false);
const staffError = ref('');
const route = useRoute();
const tenant = computed(
  () =>
    (route.query.tenant as string | undefined) ||
    (import.meta.env.VITE_TENANT_ID as string | undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantSubdomain') ?? undefined : undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? undefined : undefined) ||
    'demo',
);

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
  kiosk: {
    showStepperHeader: true,
  },
  kioskAllowSkipService: true,
  kioskAllowSkipStaff: true,
  kioskAutoResetSeconds: null,
  enforceStaffAvailability: false,
  uiFontScale: 1,
  uiGlassEnabled: true,
  uiFontFamily: 'system',
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

const phoneRequired = computed(() => (settings.value ? settings.value.requirePhone !== false : true));
const serviceRequired = computed(() => (settings.value ? settings.value.requireService === true : false));
const showPoints = computed(() => {
  if (!settings.value) return true;
  const flag = settings.value.showPointsPreview ?? settings.value.showPointsOnKiosk;
  return flag !== false;
});
const publicEnabled = computed(() => (settings.value ? settings.value.publicCheckInEnabled !== false : true));
const allowStaffSelection = computed(() => settings.value?.allowStaffSelection === true);
const requireStaffSelection = computed(
  () => allowStaffSelection.value && settings.value?.requireStaffSelection === true,
);

onMounted(async () => {
  if (tenant.value) {
    localStorage.setItem('tenantSubdomain', tenant.value);
    localStorage.setItem('tenantId', tenant.value);
  }
  try {
    settings.value = await fetchPublicSettings();
    applyThemeFromSettings(settings.value);
  } catch (err: any) {
    settings.value = defaultSettings;
    settingsError.value = err?.message || 'Unable to load settings.';
    applyThemeFromSettings(settings.value);
  }
  loadingServices.value = true;
  await refreshServices();
  await loadStaff();

  try {
    const res = await fetch(
      apiUrl(tenant.value ? `/public/tenant?tenant=${encodeURIComponent(tenant.value)}` : '/public/tenant'),
      { headers: buildHeaders({ tenant: true }) },
    );
    if (res.ok) {
      const data = await res.json();
      businessName.value = data.name || 'Check In';
      localStorage.setItem('businessName', data.name);
      document.title = `${data.name} – Check In`;
    }
  } catch {
    // ignore
  }

  await nextTick();
  phoneInputRef.value?.focus();

  stopWatchdog.value = startKioskIdleWatchdog({
    onSoftReset: async () => {
      resetForm(true);
      await refreshServices();
    },
  });
});

onBeforeUnmount(() => {
  if (resetTimer.value !== null) {
    clearTimeout(resetTimer.value);
  }
});

onUnmounted(() => {
  stopWatchdog.value?.();
});

const refreshServices = async () => {
  loadingServices.value = true;
  try {
    groupedServices.value = await fetchGroupedServices();
  } catch {
    groupedServices.value = [];
  } finally {
    loadingServices.value = false;
  }
};

const loadStaff = async (serviceId?: string) => {
  if (!allowStaffSelection.value) return;
  staffLoading.value = true;
  staffError.value = '';
  try {
    const res = await fetchPublicAvailableStaff(serviceId);
    staffList.value = res.staff || [];
    if (serviceId && staffList.value.length === 0 && res.allowStaffSelection) {
      staffError.value = 'No staff available for this service.';
    }
  } catch (err: any) {
    staffList.value = [];
    staffError.value = err?.message || 'Unable to load staff.';
  } finally {
    staffLoading.value = false;
  }
};

const resetForm = (clearFeedback = false) => {
  form.name = '';
  form.phoneE164 = '';
  form.serviceId = '';
  form.staffId = '';
  if (clearFeedback) {
    success.value = false;
    successPoints.value = null;
    successName.value = '';
    errorMessage.value = '';
    lookupError.value = '';
    lookupResult.value = null;
  }
  nextTick().then(() => phoneInputRef.value?.focus());
};

const normalizePhone = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length !== 10) {
    throw new Error('Enter a valid 10-digit phone number');
  }
  return `+1${digits}`;
};

const onSubmit = async () => {
  errorMessage.value = '';
  success.value = false;
  if (maintenanceActive.value) {
    errorMessage.value = 'Maintenance in progress. Please try again later.';
    return;
  }
  if (!publicEnabled.value) {
    errorMessage.value = 'Public check-in is disabled right now.';
    return;
  }
  if (serviceRequired.value && !form.serviceId) {
    errorMessage.value = 'Please select a service to continue.';
    return;
  }
  if (allowStaffSelection.value && requireStaffSelection.value && !form.staffId) {
    errorMessage.value = 'Please select a staff member.';
    return;
  }
  submitting.value = true;
  try {
    const normalizedPhone = normalizePhone(form.phoneE164);
    if (!lookupResult.value && normalizedPhone) {
      await onLookup();
    }
    if (phoneRequired.value && !normalizedPhone) {
      throw new Error('Phone number is required');
    }
    const nameToUse =
      lookupResult.value?.exists && lookupResult.value.customer?.name
        ? lookupResult.value.customer.name
        : form.name.trim();
    const serviceName = form.serviceId
      ? groupedServices.value.flatMap((g) => g.services).find((s) => s.id === form.serviceId)?.name
      : undefined;
    await createPublicCheckIn({
      name: nameToUse,
      phoneE164: phoneRequired.value ? normalizedPhone : normalizedPhone || null,
      serviceId: form.serviceId || undefined,
      serviceName,
      staffId: allowStaffSelection.value ? form.staffId || undefined : undefined,
    });
    success.value = true;
    successName.value = nameToUse;
    successPoints.value = lookupResult.value?.customer?.pointsBalance ?? 0;
    resetForm();
    if (resetTimer.value !== null) clearTimeout(resetTimer.value);
    resetTimer.value = window.setTimeout(() => {
      success.value = false;
      successPoints.value = null;
      successName.value = '';
      nextTick().then(() => phoneInputRef.value?.focus());
    }, 6000);
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to check in';
  } finally {
    submitting.value = false;
  }
};

const onLookup = async () => {
  const digits = form.phoneE164.replace(/\D/g, '');
  if (!digits) {
    lookupResult.value = null;
    lookupError.value = '';
    return;
  }
  if (digits.length !== 10) {
    lookupResult.value = null;
    lookupError.value = 'Enter a valid 10-digit phone number';
    return;
  }
  lookupLoading.value = true;
  try {
    const normalizedPhone = normalizePhone(form.phoneE164);
    const res = await publicLookup(normalizedPhone);
    lookupResult.value = res;
    lookupError.value = '';
    if (res.exists && res.customer?.name) {
      form.name = res.customer.name;
    }
  } catch (err) {
    lookupResult.value = null;
    lookupError.value = 'Could not load points right now. You can still check in.';
  } finally {
    lookupLoading.value = false;
  }
};

watch(
  () => form.phoneE164,
  () => {
    if (lookupTimer.value) {
      clearTimeout(lookupTimer.value);
    }
    if (!form.phoneE164.trim()) {
      lookupResult.value = null;
      lookupError.value = '';
      return;
    }
    lookupTimer.value = window.setTimeout(() => {
      onLookup();
    }, 400);
  },
);

watch(
  () => form.serviceId,
  (val) => {
    loadStaff(val || undefined);
    if (allowStaffSelection.value && val === '') {
      form.staffId = '';
    }
  },
);

watch(
  allowStaffSelection,
  (allowed) => {
    if (allowed) {
      loadStaff(form.serviceId || undefined);
    } else {
      form.staffId = '';
      staffList.value = [];
    }
  },
);
</script>

<template>
  <div class="w-full max-w-xl mx-auto">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-semibold text-slate-900">{{ businessName }}</h1>
      <p class="mt-2 text-sm text-slate-600">Let us know you're here. We'll call you shortly.</p>
    </div>

    <ElAlert
      v-if="settingsError"
      type="warning"
      :closable="false"
      class="mb-3"
      :title="settingsError"
    />

    <div
      v-if="!publicEnabled"
      class="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-slate-800 shadow-sm"
    >
      <div class="text-lg font-semibold">Public check-in is disabled.</div>
      <div class="text-sm text-slate-700">Please see the front desk for help.</div>
    </div>

    <div class="glass rounded-2xl bg-white/85 p-5 sm:p-6">
      <ElForm label-position="top" class="space-y-4" @submit.prevent="onSubmit">

        <ElFormItem label="Phone number" :required="phoneRequired">
          <ElInput
            v-model="form.phoneE164"
            placeholder="+1 555 123 4567"
            size="large"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            ref="phoneInputRef"
            @blur="onLookup"
          />
        </ElFormItem>

        <div
          class="rounded-lg bg-slate-50 p-3 text-sm text-slate-800"
          v-if="lookupResult && !lookupLoading && showPoints"
        >
          <template v-if="lookupResult.exists && lookupResult.customer">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-base font-semibold">👤 Hi, {{ lookupResult.customer.name }}</span>
              <span class="text-sm text-slate-700">
                💎 {{ lookupResult.customer.pointsBalance ?? 0 }} points · 💸 {{ rewardText }}
              </span>
            </div>
            <div class="text-xs text-slate-600">Keep earning rewards every visit.</div>
          </template>
          <template v-else>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-base font-semibold">💎 Earn rewards</span>
              <span class="text-sm text-slate-700">Check in today to start earning points.</span>
            </div>
          </template>
        </div>

        <div v-else-if="lookupLoading" class="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          Looking up your points…
        </div>

        <div v-if="lookupError" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          ⚠️ {{ lookupError }}
        </div>

        <ElFormItem v-if="!(lookupResult?.exists)" label="Name" required>
          <ElInput
            v-model="form.name"
            placeholder="Your name"
            size="large"
            autocomplete="name"
          />
        </ElFormItem>

        <ElFormItem :label="serviceRequired ? 'Service' : 'Service (optional)'" :required="serviceRequired">
          <ElSelect
            v-model="form.serviceId"
            placeholder="Select a service"
            size="large"
            clearable
            filterable
            :loading="loadingServices"
          >
            <template v-for="group in groupedServices" :key="group.categoryId || 'uncategorized'">
              <ElOptionGroup :label="`${group.categoryIcon || '📋'} ${group.categoryName}`">
                <ElOption
                  v-for="service in group.services"
                  :key="service.id"
                  :label="service.name"
                  :value="service.id"
                />
              </ElOptionGroup>
            </template>
          </ElSelect>
        </ElFormItem>

        <ElFormItem
          v-if="allowStaffSelection"
          :label="requireStaffSelection ? 'Staff (required)' : 'Staff (optional)'"
          :required="requireStaffSelection"
        >
          <ElSelect
            v-model="form.staffId"
            placeholder="Select staff"
            size="large"
            clearable
            filterable
            :loading="staffLoading"
          >
            <ElOption
              v-for="member in staffList"
              :key="member.id"
              :label="member.nickname || member.name"
              :value="member.id"
            />
          </ElSelect>
          <div v-if="staffError" class="text-xs text-amber-700 mt-1">{{ staffError }}</div>
        </ElFormItem>

        <div class="space-y-3">
          <div
            v-if="showPoints"
            class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
          >
            <div class="flex items-center gap-2">
              <span class="text-base font-semibold">💎 Loyalty</span>
              <span class="text-slate-600">
                <template v-if="lookupResult?.exists && lookupResult.customer">
                  {{ lookupResult.customer.pointsBalance ?? 0 }} points
                </template>
                <template v-else>
                  Earn rewards after this visit
                </template>
              </span>
            </div>
          </div>
          <ElButton
            type="primary"
            size="large"
            class="w-full"
            :loading="submitting"
            :disabled="
              (!form.name && !lookupResult?.exists) ||
              (phoneRequired && !form.phoneE164) ||
              (serviceRequired && !form.serviceId) ||
              (allowStaffSelection && requireStaffSelection && !form.staffId) ||
              submitting ||
              !publicEnabled ||
              maintenanceActive
            "
            @click="onSubmit"
          >
            Check In
          </ElButton>

          <div
            v-if="success"
            class="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-slate-800 shadow-sm"
          >
            <div class="text-lg font-semibold">✅ Thank you, {{ successName || form.name || 'Guest' }}!</div>
            <div class="text-sm text-slate-700">You are checked in.</div>
            <div class="mt-1 text-sm font-semibold text-emerald-700" v-if="showPoints">
              💎
              <template v-if="successPoints !== null && successPoints !== undefined">
                {{ successPoints ?? 0 }} points
              </template>
              <template v-else>
                Earn rewards on every visit
              </template>
            </div>
          </div>
          <ElAlert
            v-if="errorMessage"
            type="error"
            :closable="false"
            :title="errorMessage"
            class="w-full"
          />
        </div>
      </ElForm>
    </div>
  </div>
</template>
