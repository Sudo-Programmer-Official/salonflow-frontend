<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import {
  ElAlert,
  ElButton,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElOptionGroup,
  ElSelect,
  ElTimeSelect,
} from 'element-plus';
import { useRoute } from 'vue-router';
import { fetchGroupedServices, type ServiceOption } from '../../api/checkins';
import { fetchPublicAvailableStaff, type StaffMember } from '../../api/staff';
import { createPublicAppointment } from '../../api/appointments';
import { fetchPublicSettings, type BusinessSettings } from '../../api/settings';
import { refreshBusinessDayClock } from '../../composables/useBusinessDayClock';
import { applyThemeFromSettings } from '../../utils/theme';
import { isPlatformHost } from '../../api/client';
import { dayjs, formatInBusinessTz, getBusinessTimezone, setBusinessTimezone } from '../../utils/dates';
import { maintenanceActive } from '../../api/maintenance';
import { useWebsite } from '../../composables/useWebsite';
import PublicWebsiteLayout from '../../layouts/PublicWebsiteLayout.vue';

type ServiceGroup = {
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  services: Array<ServiceOption & { durationMinutes?: number; priceCents?: number; currency?: string }>;
};

const route = useRoute();
const { data: websiteData, fetchSite: fetchWebsite } = useWebsite('en');
const useWebsiteShell = computed(() => typeof window !== 'undefined' && !isPlatformHost());
const pageToPath = (page: string) => {
  switch (page) {
    case 'services':
      return '/services';
    case 'about':
      return '/about';
    case 'contact':
      return '/contact';
    case 'home':
    default:
      return '/';
  }
};

const toTitleCase = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const domainToLabel = (value: string | null | undefined) => {
  if (!value) return '';
  const withoutProtocol = value.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  const hostOnly = withoutProtocol.split('/')[0] ?? '';
  const cleaned = hostOnly.split(':')[0] ?? '';
  const withoutTld = cleaned.replace(/\.[a-z]{2,}$/i, '');
  const withSpaces = withoutTld
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
  return withSpaces ? toTitleCase(withSpaces) : cleaned;
};
const websiteNav = computed(() => {
  const raw = Array.isArray(websiteData.value?.nav) ? websiteData.value?.nav : [];
  const items = raw
    .filter((n: any) => n && n.visible !== false)
    .map((n: any) => ({
      label: String(n.label ?? ''),
      path: String(n.path ?? '/'),
      position: Number.isFinite(n.position) ? n.position : 0,
    }))
    .sort((a: any, b: any) => a.position - b.position);

  const fallbackNav = Array.isArray(websiteData.value?.layout?.header?.nav)
    ? websiteData.value?.layout?.header?.nav.map((n: any, idx: number) => ({
        label: String(n.label || ''),
        path: pageToPath(n.page),
        position: idx,
      }))
    : [];

  const merged = items.length ? items : fallbackNav;
  const seen = new Set<string>();
  return merged.filter((i) => {
    if (seen.has(i.path)) return false;
    seen.add(i.path);
    return Boolean(i.label && i.path);
  });
});
const websiteHeader = computed(() => {
  const headerCfg = websiteData.value?.layout?.header;
  if (!headerCfg) return null;
  return {
    enabled: headerCfg.enabled !== false,
    brand:
      settings.value?.businessName?.trim() ||
      domainToLabel(websiteData.value?.site?.primary_domain || websiteData.value?.site?.default_domain) ||
      'Book',
    brandSubtitle:
      [
        websiteData.value?.layout?.footer?.location?.city,
        websiteData.value?.layout?.footer?.location?.state,
      ]
        .filter(Boolean)
        .join(', ') || 'Book online',
    nav: websiteNav.value,
    ctas: {
      call: { enabled: headerCfg.ctas?.call?.enabled !== false, phone: settings.value?.businessPhone || null },
      book: { enabled: headerCfg.ctas?.book?.enabled !== false, url: '/check-in/book' },
    },
  };
});
const websiteFooter = computed(() => {
  const footer = websiteData.value?.layout?.footer;
  return footer ? { ...footer, fallbackHoursText: footer?.contact?.hours || null } : null;
});

const initialTenant = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : undefined;
  if (host && host.split('.').length >= 3 && host.endsWith('salonflow.studio')) {
    return host.split('.')[0];
  }
  return (
    (route.query.tenant as string | undefined) ||
    (import.meta.env.VITE_TENANT_ID as string | undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantSubdomain') ?? undefined : undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? undefined : undefined) ||
    undefined
  );
};

const tenant = ref<string | undefined>(initialTenant());

const form = reactive({
  name: '',
  phone: '',
  email: '',
  serviceId: '',
  staffId: '',
  date: '',
  time: '',
  notes: '',
});

const groupedServices = ref<ServiceGroup[]>([]);
const loadingServices = ref(false);
const settings = ref<BusinessSettings | null>(null);
const settingsError = ref('');
const businessName = ref('Book a visit');
const staffList = ref<StaffMember[]>([]);
const staffLoading = ref(false);
const staffError = ref('');
const submitting = ref(false);
const success = ref(false);
const successDetail = ref('');
const successDialog = ref(false);
const errorMessage = ref('');
const successTitle = computed(() => {
  const detail = successDetail.value ? ` ${successDetail.value}` : '';
  return `Appointment request sent.${detail ? ' ' + detail : ''}`;
});
const successDescription = 'We’ll confirm your appointment by text or email once the salon approves it.';
const timezone = computed(() => settings.value?.timezone || getBusinessTimezone());
const allowStaffSelection = computed(() => settings.value?.allowStaffSelection === true);
const requireStaffSelection = computed(
  () => allowStaffSelection.value && settings.value?.requireStaffSelection === true,
);
const minNoticeMinutes = computed(() => settings.value?.defaultBookingRules?.min_notice_minutes ?? 0);
const phoneExample = '(555) 123-4567';

const serviceMap = computed(() => {
  const map = new Map<string, ServiceGroup['services'][number]>();
  groupedServices.value.forEach((group) =>
    group.services.forEach((svc) => map.set(svc.id, svc)),
  );
  return map;
});

const selectedService = computed(() => serviceMap.value.get(form.serviceId) || null);
const selectedStaff = computed(() => staffList.value.find((s) => s.id === form.staffId) || null);
const serviceLabel = computed(() => selectedService.value?.name || 'Service to be decided in salon');
const serviceDuration = computed(() =>
  selectedService.value?.durationMinutes ? `${selectedService.value.durationMinutes} min` : '30 min (default)',
);
const servicePrice = computed(() => {
  if (selectedService.value?.priceCents !== undefined) {
    return formatMoney(selectedService.value.priceCents, selectedService.value.currency || 'USD');
  }
  return 'TBD';
});
const staffLabel = computed(() => selectedStaff.value?.nickname || selectedStaff.value?.name || 'Any available');

watch(
  () => successDialog.value,
  async (open) => {
    if (open) {
      await nextTick();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },
);

const disablePastDates = (date: Date) => {
  const today = dayjs().tz(timezone.value).startOf('day');
  return dayjs(date).tz(timezone.value).isBefore(today, 'day');
};

const formatMoney = (cents?: number | null, currency = 'USD') => {
  if (cents === null || cents === undefined) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(cents / 100);
};

const phoneDigits = (raw: string) => raw.replace(/\D/g, '');

const phoneCore = (raw: string) => {
  const digits = phoneDigits(raw);
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
};

const validatePhoneInput = (raw: string) => {
  const digits = phoneDigits(raw);
  if (!digits) return '';
  if (digits.length < 10) {
    return 'Enter all 10 digits so the salon can confirm your booking.';
  }
  if (digits.length > 11 || (digits.length === 11 && !digits.startsWith('1'))) {
    return `Use a valid 10-digit US mobile number, like ${phoneExample}.`;
  }
  const core = phoneCore(raw);
  if (core.length !== 10 || !/^[2-9]\d{2}[2-9]\d{6}$/.test(core)) {
    return `That number looks invalid. Use a real mobile number, like ${phoneExample}.`;
  }
  return '';
};

const normalizePhone = (raw: string) => {
  const validation = validatePhoneInput(raw);
  if (validation) {
    throw new Error(validation);
  }
  return `+1${phoneCore(raw)}`;
};

const formatDisplayPhone = (raw: string | undefined | null): string => {
  const digits = phoneDigits(raw || '');
  const core = digits.startsWith('1') && digits.length > 10 ? digits.slice(1, 11) : digits.slice(0, 10);
  if (!core) return '';
  if (core.length <= 3) return core;
  if (core.length <= 6) return `(${core.slice(0, 3)}) ${core.slice(3)}`;
  return `(${core.slice(0, 3)}) ${core.slice(3, 6)}-${core.slice(6)}`;
};

const phoneValidationMessage = computed(() => validatePhoneInput(form.phone));
const phoneLooksValid = computed(() => Boolean(form.phone.trim()) && !phoneValidationMessage.value);
const phoneConfirmationText = computed(() =>
  phoneLooksValid.value
    ? `We’ll text the salon confirmation to ${formatDisplayPhone(form.phone)}.`
    : 'Use a mobile number that can receive the salon confirmation text.',
);
const contactSummary = computed(() => {
  if (!form.phone.trim()) return 'Phone required to confirm';
  if (phoneValidationMessage.value) return 'Check phone number';
  return formatDisplayPhone(form.phone);
});
const compactBusinessName = computed(() => {
  const configured = settings.value?.businessName?.trim();
  if (configured) return configured;
  return domainToLabel(businessName.value) || 'Your salon';
});
const serviceLeadCopy = computed(() =>
  selectedService.value
    ? 'Review price and timing, then tap Select to add it to your booking.'
    : 'Choose a service to preview timing and add it to your booking.',
);

const composeScheduledAt = () => {
  if (!form.date || !form.time) return null;
  const zoned = dayjs.tz(`${form.date}T${form.time}:00`, timezone.value);
  return zoned.isValid() ? zoned.toISOString() : null;
};

const validateNoticeWindow = (iso: string) => {
  if (!minNoticeMinutes.value) return true;
  const now = dayjs().tz(timezone.value);
  const earliest = now.add(minNoticeMinutes.value, 'minute');
  return dayjs(iso).isAfter(earliest);
};

const loadSettings = async () => {
  try {
    settings.value = await fetchPublicSettings();
    applyThemeFromSettings(settings.value);
    if (settings.value.timezone) {
      setBusinessTimezone(settings.value.timezone);
      refreshBusinessDayClock();
    }
  } catch (err: any) {
    settings.value = null;
    settingsError.value = err?.message || 'Unable to load settings.';
  }
};

const loadServices = async () => {
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

const loadBusiness = () => {
  const name =
    settings.value?.businessName?.trim() ||
    domainToLabel(websiteData.value?.site?.primary_domain || websiteData.value?.site?.default_domain) ||
    'Book a visit';
  businessName.value = name;
  if (typeof window !== 'undefined') {
    document.title = `${name} – Book`;
  }
};

onMounted(async () => {
  if (useWebsiteShell.value) {
    await fetchWebsite().catch(() => undefined);
    // useWebsite persists default_domain -> tenantSubdomain/tenantId
    const stored = typeof window !== 'undefined' ? localStorage.getItem('tenantSubdomain') ?? undefined : undefined;
    if (stored) tenant.value = stored;
  }
  if (form.phone) {
    form.phone = formatDisplayPhone(form.phone);
  }
  if (tenant.value) {
    localStorage.setItem('tenantSubdomain', tenant.value);
    localStorage.setItem('tenantId', tenant.value);
  }
  loadBusiness();
  await loadSettings();
  await loadServices();
  await loadStaff();
  await nextTick();
});

watch(
  [
    () => settings.value?.businessName,
    () => websiteData.value?.site?.primary_domain,
    () => websiteData.value?.site?.default_domain,
  ],
  () => {
    loadBusiness();
  },
  { immediate: true },
);

watch(
  () => form.serviceId,
  (val) => {
    loadStaff(val || undefined);
    if (allowStaffSelection.value && !val) {
      form.staffId = '';
    }
  },
);

watch(
  () => form.phone,
  (value) => {
    const formatted = formatDisplayPhone(value);
    if (value !== formatted) {
      form.phone = formatted;
    }
  },
);

const resetForm = () => {
  form.name = '';
  form.phone = '';
  form.email = '';
  form.serviceId = '';
  form.staffId = '';
  form.date = '';
  form.time = '';
  form.notes = '';
};

const onSubmit = async () => {
  errorMessage.value = '';
  success.value = false;

  if (maintenanceActive.value) {
    errorMessage.value = 'Maintenance in progress. Please try again later.';
    return;
  }

  if (!form.name.trim()) {
    errorMessage.value = 'Name is required.';
    return;
  }
  if (!form.phone.trim()) {
    errorMessage.value = 'Phone number is required.';
    return;
  }
  if (requireStaffSelection.value && !form.staffId) {
    errorMessage.value = 'Please choose a staff member.';
    return;
  }

  let phoneE164: string;
  try {
    phoneE164 = normalizePhone(form.phone);
  } catch (err: any) {
    errorMessage.value = err?.message || 'Enter a valid phone number.';
    return;
  }

  const scheduledAt = composeScheduledAt();
  if (!scheduledAt) {
    errorMessage.value = 'Please pick a valid date and time.';
    return;
  }
  if (!validateNoticeWindow(scheduledAt)) {
    errorMessage.value = `Please choose a time at least ${minNoticeMinutes.value} minutes from now.`;
    return;
  }

  submitting.value = true;
  try {
    await createPublicAppointment({
      name: form.name.trim(),
      phoneE164,
      email: form.email.trim() || null,
      serviceId: form.serviceId || null,
      staffId: allowStaffSelection.value ? form.staffId || null : null,
      scheduledAt,
      notes: form.notes.trim() || undefined,
    });
    const whenLocal = formatInBusinessTz(
      scheduledAt,
      'ddd, MMM D · h:mm A',
      timezone.value,
    );
    successDetail.value = `${whenLocal} ${timezone.value}`;
    success.value = true;
    successDialog.value = true;
    resetForm();
    await nextTick();
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to book';
  } finally {
    submitting.value = false;
  }
};

const selectService = (serviceId: string) => {
  form.serviceId = serviceId;
};
</script>

<template>
  <component
    :is="useWebsiteShell ? PublicWebsiteLayout : 'div'"
    v-bind="useWebsiteShell ? { header: websiteHeader, footer: websiteFooter, activePath: route.path } : {}"
  >
    <div class="booking-page sf-container sf-section space-y-6">
    <div class="mx-auto max-w-2xl px-4 text-center">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--sf-primary,#0ea5e9)]">
        {{ compactBusinessName }}
      </p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
        Book your appointment
      </h1>
      <p class="mt-2 text-sm text-muted sm:text-base">
        Choose a service, pick a time, and we’ll confirm instantly.
      </p>
    </div>

    <ElAlert
      v-if="settingsError"
      type="warning"
      :closable="false"
      class="w-full"
      :title="settingsError"
    />

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1.05fr),minmax(320px,0.95fr)] xl:items-start">
      <div class="booking-form-panel glass mx-auto w-full max-w-2xl rounded-[28px] bg-surface p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] sm:p-6">
        <ElForm label-position="top" class="booking-form space-y-3.5" @submit.prevent="onSubmit">
          <ElFormItem label="Name" required>
            <ElInput v-model="form.name" placeholder="Your name" size="large" autocomplete="name" />
          </ElFormItem>

          <div class="grid gap-3 sm:grid-cols-2">
            <ElFormItem
              label="Mobile number"
              required
              :error="phoneValidationMessage || undefined"
            >
              <ElInput
                v-model="form.phone"
                placeholder="(361) 444-2937"
                size="large"
                autocomplete="tel-national"
                inputmode="numeric"
                maxlength="14"
                clearable
              />
              <div
                class="mt-1 text-xs"
                :class="phoneLooksValid ? 'text-emerald-700' : 'text-muted'"
              >
                {{ phoneConfirmationText }}
              </div>
            </ElFormItem>
            <ElFormItem label="Email (optional)">
              <ElInput
                v-model="form.email"
                placeholder="name@email.com"
                size="large"
                autocomplete="email"
              />
            </ElFormItem>
          </div>

          <ElFormItem label="Service (optional)">
            <ElSelect
              v-model="form.serviceId"
              placeholder="Select a service (optional)"
              size="large"
              clearable
              filterable
              :loading="loadingServices"
              class="w-full"
            >
              <template v-for="group in groupedServices" :key="group.categoryId || 'uncategorized'">
                <ElOptionGroup :label="`${group.categoryIcon || '📋'} ${group.categoryName}`">
                  <ElOption
                    v-for="service in group.services"
                    :key="service.id"
                    :label="service.name"
                    :value="service.id"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span>{{ service.name }}</span>
                      <span class="text-xs text-muted">
                        <template v-if="service.durationMinutes">
                          {{ service.durationMinutes }} min
                        </template>
                        <template v-if="service.priceCents !== undefined">
                          • {{ formatMoney(service.priceCents, service.currency || 'USD') }}
                        </template>
                      </span>
                    </div>
                  </ElOption>
                </ElOptionGroup>
              </template>
            </ElSelect>
          </ElFormItem>

          <ElFormItem
            v-if="allowStaffSelection"
            label="Preferred staff (optional)"
            :required="requireStaffSelection"
          >
            <ElSelect
              v-model="form.staffId"
              placeholder="Any available technician"
              size="large"
              clearable
              filterable
              :loading="staffLoading"
              class="w-full"
            >
              <ElOption :value="''" label="Any available technician" />
              <ElOption
                v-for="member in staffList"
                :key="member.id"
                :label="member.nickname || member.name"
                :value="member.id"
              />
            </ElSelect>
            <div v-if="staffError" class="text-xs text-amber-700 mt-1">{{ staffError }}</div>
          </ElFormItem>

          <div class="grid gap-3 sm:grid-cols-2">
            <ElFormItem label="Date" required>
              <ElDatePicker
                v-model="form.date"
                type="date"
                placeholder="Select date"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                :disabled-date="disablePastDates"
                class="w-full"
              />
            </ElFormItem>

            <ElFormItem label="Time" required>
              <ElTimeSelect
                v-model="form.time"
                start="08:00"
                step="00:15"
                end="20:00"
                placeholder="Select time"
                class="w-full"
              />
            </ElFormItem>
          </div>

          <ElFormItem label="Notes (optional)">
            <ElInput
              v-model="form.notes"
              type="textarea"
              :rows="3"
              placeholder="Preferences, requests, anything we should know."
            />
          </ElFormItem>

          <div class="space-y-2.5 pt-1">
            <ElButton
              type="primary"
              size="large"
              class="booking-submit w-full h-14 border-0 text-lg font-semibold"
              :loading="submitting"
              :disabled="
                submitting ||
                !form.name ||
                !form.phone ||
                !!phoneValidationMessage ||
                !form.date ||
                !form.time ||
                (requireStaffSelection && !form.staffId) ||
                maintenanceActive
              "
              @click="onSubmit"
            >
              Book appointment
            </ElButton>

    <ElDialog
      v-model="successDialog"
      title="Appointment Request Sent 🎉"
      align-center
      append-to-body
      width="420px"
    >
      <div class="space-y-2">
        <p class="text-base font-semibold">{{ successTitle }}</p>
        <p class="text-sm text-muted">{{ successDescription }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="successDialog = false">OK</ElButton>
        </div>
      </template>
    </ElDialog>
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

      <div class="space-y-3.5">
        <div class="glass-card rounded-[26px] bg-surface p-5 shadow-sm">
          <div class="flex items-center gap-2 text-sm font-semibold text-text">
            <span>📅</span>
            <span>Your selection</span>
          </div>
          <div class="mt-3 grid gap-2 text-[13px] text-muted">
            <div class="flex items-start justify-between gap-4">
              <span>Service</span>
              <span class="text-right font-semibold text-text">
                {{ serviceLabel }}
              </span>
            </div>
            <div class="flex items-start justify-between gap-4">
              <span>Staff</span>
              <span class="text-right text-muted">{{ staffLabel }}</span>
            </div>
            <div class="flex items-start justify-between gap-4">
              <span>Duration</span>
              <span class="text-right text-muted">
                {{ serviceDuration }}
              </span>
            </div>
            <div class="flex items-start justify-between gap-4">
              <span>Price</span>
              <span class="text-right text-muted">
                {{ servicePrice }}
              </span>
            </div>
            <div class="flex items-start justify-between gap-4">
              <span>When</span>
              <span class="text-right text-muted">
                <template v-if="form.date && form.time">
                  {{ form.date }} · {{ form.time }}
                </template>
                <template v-else>Choose date & time</template>
              </span>
            </div>
            <div class="flex items-start justify-between gap-4">
              <span>Contact</span>
              <span class="text-right" :class="phoneValidationMessage ? 'text-rose-600' : 'text-muted'">
                {{ contactSummary }}
              </span>
            </div>
          </div>
        </div>

        <div class="glass-card rounded-[26px] bg-surface p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold text-text">Service lineup</div>
              <div class="text-xs text-muted">{{ serviceLeadCopy }}</div>
            </div>
            <span class="text-base">💅</span>
          </div>
          <div class="mt-3 space-y-3 max-h-[360px] overflow-y-auto pr-1">
            <div
              v-for="group in groupedServices"
              :key="group.categoryId || group.categoryName"
              class="rounded-2xl border border-border bg-surface p-3"
            >
              <div class="flex items-center justify-between text-sm font-semibold text-text">
                <span>{{ group.categoryIcon || '📋' }} {{ group.categoryName }}</span>
              </div>
              <div class="mt-2 space-y-2">
                <div
                  v-for="svc in group.services"
                  :key="svc.id"
                  class="service-option flex items-center justify-between gap-3 rounded-xl border border-transparent bg-surface-muted px-3 py-3 text-sm text-muted transition"
                  :class="{ 'service-option--active': form.serviceId === svc.id }"
                >
                  <div class="min-w-0">
                    <div class="font-semibold leading-tight text-text">{{ svc.name }}</div>
                    <div class="mt-1 flex items-center gap-1 text-xs text-muted">
                      <span v-if="svc.durationMinutes">{{ svc.durationMinutes }} min</span>
                      <span v-if="svc.priceCents !== undefined">
                        • {{ formatMoney(svc.priceCents, svc.currency || 'USD') }}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="service-option__button"
                    :class="{ 'service-option__button--active': form.serviceId === svc.id }"
                    @click="selectService(svc.id)"
                  >
                    {{ form.serviceId === svc.id ? 'Selected' : 'Select' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card rounded-[26px] bg-surface p-5 shadow-sm">
          <div class="flex items-center gap-2 text-sm font-semibold text-text">
            <span>⏰</span>
            <span>Need a different time?</span>
          </div>
          <p class="mt-2 text-xs text-muted leading-relaxed">
            Pick your best time. If it is not available, we’ll suggest the closest slot and text you before the visit.
          </p>
          <p class="mt-2 text-xs text-muted leading-relaxed">Same-day booking is allowed when the notice window is met.</p>
        </div>

        <div class="glass-card rounded-[26px] bg-surface p-5 shadow-sm">
          <div class="flex items-center gap-2 text-sm font-semibold text-text">
            <span>🔔</span>
            <span>What happens next</span>
          </div>
          <ul class="mt-2 space-y-1 text-xs leading-relaxed text-muted">
            <li>• You’ll see a confirmation once we lock your slot.</li>
            <li>• SMS reminders use your phone; email is optional for receipts.</li>
            <li>• Change of plans? Reply to the confirmation to adjust.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  </component>
</template>

<style scoped>
.booking-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.booking-form :deep(.el-form-item__label) {
  font-size: 0.95rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--sf-text, #0f172a) 72%, #fff 28%);
  margin-bottom: 0.45rem;
}

.booking-form :deep(.el-input__wrapper),
.booking-form :deep(.el-select__wrapper),
.booking-form :deep(.el-date-editor.el-input__wrapper),
.booking-form :deep(.el-date-editor .el-input__wrapper),
.booking-form :deep(.el-date-editor .el-select__wrapper) {
  border-radius: 1rem;
  min-height: 3.35rem;
  border: 1px solid color-mix(in srgb, var(--sf-border, #dbe4ef) 92%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
  padding-inline: 0.85rem;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.booking-form :deep(.el-textarea__inner) {
  min-height: 7.5rem;
  border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--sf-border, #dbe4ef) 92%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
  padding: 0.9rem 1rem;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.booking-form :deep(.el-input__wrapper.is-focus),
.booking-form :deep(.el-select__wrapper.is-focused),
.booking-form :deep(.el-textarea__inner:focus) {
  border-color: color-mix(in srgb, var(--sf-primary, #0ea5e9) 72%, white 28%);
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--sf-primary, #0ea5e9) 12%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.booking-submit {
  border-radius: 1rem;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--sf-primary, #0ea5e9) 90%, white 10%),
    color-mix(in srgb, var(--sf-primary, #0284c7) 78%, #0f172a 22%)
  );
  box-shadow: 0 18px 40px color-mix(in srgb, var(--sf-primary, #0ea5e9) 22%, transparent);
}

.booking-submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 22px 44px color-mix(in srgb, var(--sf-primary, #0ea5e9) 26%, transparent);
}

.booking-submit:active {
  transform: scale(0.985);
}

.service-option:hover {
  border-color: color-mix(in srgb, var(--sf-primary, #0ea5e9) 18%, transparent);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.05);
}

.service-option--active {
  border-color: color-mix(in srgb, var(--sf-primary, #0ea5e9) 28%, transparent);
  background: color-mix(in srgb, var(--sf-primary, #0ea5e9) 6%, var(--sf-surface-muted, #f8fafc));
}

.service-option__button {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: color-mix(in srgb, var(--sf-primary, #0ea5e9) 88%, #0f172a 12%);
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1;
  padding: 0.45rem 0.2rem;
  transition: color 160ms ease, transform 160ms ease;
}

.service-option__button:hover {
  transform: translateY(-1px);
}

.service-option__button--active {
  color: var(--sf-text, #0f172a);
}

@media (max-width: 767px) {
  .booking-page {
    padding-inline: 0.25rem;
  }

  .booking-form-panel {
    border-radius: 1.75rem;
  }
}
</style>
