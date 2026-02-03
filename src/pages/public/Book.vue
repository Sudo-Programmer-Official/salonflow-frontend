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
import { applyThemeFromSettings } from '../../utils/theme';
import { apiUrl, buildHeaders, isPlatformHost } from '../../api/client';
import { dayjs, getBusinessTimezone, setBusinessTimezone } from '../../utils/dates';
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
    brand: websiteData.value?.site?.primary_domain || websiteData.value?.site?.default_domain || 'Book',
    nav: websiteNav.value,
    ctas: {
      call: { enabled: headerCfg.ctas?.call?.enabled !== false, phone: null },
      book: { enabled: headerCfg.ctas?.book?.enabled !== false, url: '/check-in/book' },
    },
  };
});
const websiteFooter = computed(() => {
  const footer = websiteData.value?.layout?.footer;
  return footer ? { ...footer, fallbackHoursText: footer?.contact?.hours || null } : null;
});

const initialTenant = () =>
  (route.query.tenant as string | undefined) ||
  (import.meta.env.VITE_TENANT_ID as string | undefined) ||
  (typeof window !== 'undefined' ? localStorage.getItem('tenantSubdomain') ?? undefined : undefined) ||
  (typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? undefined : undefined) ||
  undefined;

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
const errorMessage = ref('');
const successTitle = computed(() => {
  const detail = successDetail.value ? ` ${successDetail.value}` : '';
  return `Booking received.${detail ? ' ' + detail : ''}`;
});
const successDescription = 'We’ll confirm your appointment by text or email once the salon approves it.';
const timezone = computed(() => settings.value?.timezone || getBusinessTimezone());
const allowStaffSelection = computed(() => settings.value?.allowStaffSelection === true);
const requireStaffSelection = computed(
  () => allowStaffSelection.value && settings.value?.requireStaffSelection === true,
);
const minNoticeMinutes = computed(() => settings.value?.defaultBookingRules?.min_notice_minutes ?? 0);

const serviceMap = computed(() => {
  const map = new Map<string, ServiceGroup['services'][number]>();
  groupedServices.value.forEach((group) =>
    group.services.forEach((svc) => map.set(svc.id, svc)),
  );
  return map;
});

const selectedService = computed(() => serviceMap.value.get(form.serviceId) || null);

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

const normalizePhone = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  const core = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (core.length !== 10) {
    throw new Error('Enter a valid 10-digit phone number');
  }
  return `+1${core}`;
};

const formatDisplayPhone = (raw: string | undefined | null): string => {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 10);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
};

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
    if (settings.value.timezone) setBusinessTimezone(settings.value.timezone);
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

const loadBusiness = async () => {
  try {
    const res = await fetch(
      apiUrl(tenant.value ? `/public/tenant?tenant=${encodeURIComponent(tenant.value)}` : '/public/tenant'),
      { headers: buildHeaders({ tenant: true }) },
    );
    if (res.ok) {
      const data = await res.json();
      businessName.value = data.name || 'Book a visit';
      localStorage.setItem('businessName', data.name);
      document.title = `${data.name} – Book`;
    }
  } catch {
    // ignore
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
  await loadSettings();
  await loadBusiness();
  await loadServices();
  await loadStaff();
  await nextTick();
});

watch(
  () => form.serviceId,
  (val) => {
    loadStaff(val || undefined);
    if (allowStaffSelection.value && !val) {
      form.staffId = '';
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
  if (!form.serviceId) {
    errorMessage.value = 'Please select a service.';
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
      serviceId: form.serviceId,
      staffId: allowStaffSelection.value ? form.staffId || null : null,
      scheduledAt,
      notes: form.notes.trim() || undefined,
    });
    const whenLocal = dayjs(scheduledAt).tz(timezone.value).format('ddd, MMM D · h:mm A');
    successDetail.value = `${whenLocal} ${timezone.value}`;
    success.value = true;
    resetForm();
    await nextTick();
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to book';
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <component
    :is="useWebsiteShell ? PublicWebsiteLayout : 'div'"
    v-bind="useWebsiteShell ? { header: websiteHeader, footer: websiteFooter, activePath: route.path } : {}"
  >
    <div class="sf-container sf-section space-y-8">
    <div class="text-center">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Book online</p>
      <h1 class="mt-2 text-3xl font-semibold text-text">{{ businessName }}</h1>
      <p class="mt-2 text-sm text-muted">
        Choose a service, pick a time, and we’ll confirm with reminders.
      </p>
    </div>

    <ElAlert
      v-if="settingsError"
      type="warning"
      :closable="false"
      class="w-full"
      :title="settingsError"
    />

    <div class="grid gap-6 lg:grid-cols-[1.45fr,0.95fr]">
      <div class="glass rounded-2xl bg-surface p-6 shadow-sm">
        <ElForm label-position="top" class="space-y-4" @submit.prevent="onSubmit">
          <ElFormItem label="Name" required>
            <ElInput v-model="form.name" placeholder="Your name" size="large" autocomplete="name" />
          </ElFormItem>

          <div class="grid gap-4 md:grid-cols-2">
            <ElFormItem label="Phone number" required>
              <ElInput
                v-model="form.phone"
                placeholder="555 123 4567"
                size="large"
                autocomplete="tel"
                inputmode="tel"
                @input="(val: any) => (form.phone = formatDisplayPhone(val))"
              />
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

          <ElFormItem label="Service" required>
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
            :label="requireStaffSelection ? 'Staff (required)' : 'Staff (optional)'"
            :required="requireStaffSelection"
          >
            <ElSelect
              v-model="form.staffId"
              placeholder="Choose staff"
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

          <div class="grid gap-4 md:grid-cols-2">
            <ElFormItem label="Date" required>
              <ElDatePicker
                v-model="form.date"
                type="date"
                placeholder="Select date"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                :disabled-date="disablePastDates"
              />
            </ElFormItem>

            <ElFormItem label="Time" required>
              <ElTimeSelect
                v-model="form.time"
                start="08:00"
                step="00:15"
                end="20:00"
                placeholder="Select time"
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

          <div class="space-y-3">
            <ElButton
              type="primary"
              size="large"
              class="w-full"
              :loading="submitting"
              :disabled="
                submitting ||
                !form.name ||
                !form.phone ||
                !form.serviceId ||
                !form.date ||
                !form.time ||
                (requireStaffSelection && !form.staffId) ||
                maintenanceActive
              "
              @click="onSubmit"
            >
              Book appointment
            </ElButton>

            <ElAlert
              v-if="success"
              type="success"
              :closable="false"
              class="w-full"
              :title="successTitle"
              :description="successDescription"
            />
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

      <div class="space-y-4">
        <div class="glass-card rounded-2xl bg-surface p-5 shadow-sm">
          <div class="flex items-center gap-2 text-sm font-semibold text-text">
            <span>📅</span>
            <span>Your selection</span>
          </div>
          <div class="mt-3 space-y-2 text-xs text-muted">
            <div class="flex items-center justify-between">
              <span>Service</span>
              <span class="font-semibold text-text">
                {{ selectedService?.name || 'Pick a service' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span>Duration</span>
              <span class="text-muted">
                {{ selectedService?.durationMinutes ? `${selectedService.durationMinutes} min` : '—' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span>Price</span>
              <span class="text-muted">
                {{
                  selectedService?.priceCents !== undefined
                    ? formatMoney(selectedService.priceCents, selectedService.currency || 'USD')
                    : '—'
                }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span>When</span>
              <span class="text-muted">
                <template v-if="form.date && form.time">
                  {{ form.date }} · {{ form.time }}
                </template>
                <template v-else>Choose date & time</template>
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span>Contact</span>
              <span class="text-muted">
                {{ form.phone || 'Phone required to confirm' }}
              </span>
            </div>
          </div>
        </div>

        <div class="glass-card rounded-2xl bg-surface p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold text-muted">Service lineup</div>
              <div class="text-xs text-muted">Tap a service to see price & time.</div>
            </div>
            <span class="text-base">💅</span>
          </div>
          <div class="mt-3 space-y-3 max-h-[360px] overflow-y-auto pr-1">
            <div
              v-for="group in groupedServices"
              :key="group.categoryId || group.categoryName"
              class="rounded-xl border border-border bg-surface p-3"
            >
              <div class="flex items-center justify-between text-sm font-semibold text-text">
                <span>{{ group.categoryIcon || '📋' }} {{ group.categoryName }}</span>
              </div>
              <div class="mt-2 space-y-2">
                <div
                  v-for="svc in group.services"
                  :key="svc.id"
                  class="flex items-start justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm text-muted"
                >
                  <div>
                    <div class="font-semibold text-text">{{ svc.name }}</div>
                    <div class="text-xs text-muted flex items-center gap-1">
                      <span v-if="svc.durationMinutes">{{ svc.durationMinutes }} min</span>
                      <span v-if="svc.priceCents !== undefined">
                        • {{ formatMoney(svc.priceCents, svc.currency || 'USD') }}
                      </span>
                    </div>
                  </div>
                  <div class="text-xs text-muted">Tap to select</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card rounded-2xl bg-surface p-5 shadow-sm">
          <div class="flex items-center gap-2 text-sm font-semibold text-text">
            <span>⏰</span>
            <span>Need a different time?</span>
          </div>
          <p class="mt-2 text-xs text-muted leading-relaxed">
            Pick your best time; we’ll confirm or propose the nearest available slot. You’ll get a text reminder before the visit.
          </p>
          <p class="mt-2 text-xs text-muted leading-relaxed">
            Reminder window respects our notice period ({{ minNoticeMinutes }} min). Same-day is allowed when the window is met.
          </p>
        </div>

        <div class="glass-card rounded-2xl bg-surface p-5 shadow-sm">
          <div class="flex items-center gap-2 text-sm font-semibold text-text">
            <span>🔔</span>
            <span>What happens next</span>
          </div>
          <ul class="mt-2 space-y-1 text-xs text-muted">
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
