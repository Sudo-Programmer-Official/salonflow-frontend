<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElButton, ElCard, ElInput, ElAlert } from 'element-plus';
import { fetchGroupedServices, createPublicCheckIn, publicLookup } from '../../api/checkins';
import { apiUrl, buildHeaders } from '../../api/client';
import { fetchPublicSettings, type BusinessSettings } from '../../api/settings';

type Step = 'welcome' | 'categories' | 'services' | 'review' | 'done';

const tenant = ref<string>('');
const businessName = ref<string>('SalonFlow');
const loading = ref(false);
const error = ref('');
const step = ref<Step>('welcome');
const settings = ref<BusinessSettings | null>(null);
const settingsError = ref('');
const grouped = ref<{
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  services: Array<{ id: string; name: string; icon?: string; durationMinutes?: number; priceCents?: number; currency?: string }>;
}[]>([]);

const form = reactive({
  name: '',
  phoneE164: '',
});
const selectedCategoryId = ref<string | null>(null);
const selectedServices = ref<Set<string>>(new Set());
const lookupResult = ref<{ exists: boolean; customer?: { id: string; name: string; pointsBalance: number | null } } | null>(null);
const submitting = ref(false);
const resetTimer = ref<number | null>(null);

const defaultSettings: BusinessSettings = {
  businessId: '',
  businessName: '',
  timezone: null,
  currency: 'USD',
  kioskEnabled: true,
  publicCheckInEnabled: true,
  requirePhone: true,
  showPointsOnKiosk: false,
  allowMultiService: false,
  requireService: false,
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

const kioskEnabled = computed(() => (settings.value ? settings.value.kioskEnabled !== false : true));
const phoneRequired = computed(() => (settings.value ? settings.value.requirePhone !== false : true));
const serviceRequired = computed(() => (settings.value ? settings.value.requireService === true : false));
const allowMultiService = computed(() => (settings.value ? settings.value.allowMultiService === true : true));
const autoResetMs = computed(() => {
  const seconds = settings.value?.kioskAutoResetSeconds;
  if (seconds === null) return null;
  const fallback = seconds === undefined ? 10 : seconds;
  return Math.max(5, fallback) * 1000;
});

const filteredCategories = computed(() => grouped.value);
const servicesForCategory = computed(() => {
  if (!selectedCategoryId.value) return [];
  const cat = grouped.value.find((c) => c.categoryId === selectedCategoryId.value);
  return cat?.services ?? [];
});

const loadTenant = async () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const queryTenant = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('tenant') || undefined;
  const envTenant = import.meta.env.VITE_TENANT_ID as string | undefined;
  const storedTenant = (typeof window !== 'undefined' ? localStorage.getItem('tenantSubdomain') ?? undefined : undefined) || (typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? undefined : undefined);
  const hostSub = hostname.split('.')[0] || '';
  const chosen = queryTenant || envTenant || storedTenant || hostSub || 'demo';
  tenant.value = chosen;
  localStorage.setItem('tenantSubdomain', chosen);
  localStorage.setItem('tenantId', chosen);
  try {
    const res = await fetch(apiUrl(`/public/tenant?tenant=${encodeURIComponent(chosen)}`), {
      headers: buildHeaders({ tenant: true }),
    });
    if (res.ok) {
      const data = await res.json();
      businessName.value = data.name || 'Salon';
      document.title = `${businessName.value} — Check-in`;
    }
  } catch {
    // ignore
  }
};

const loadServices = async () => {
  loading.value = true;
  error.value = '';
  try {
    grouped.value = await fetchGroupedServices();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load services';
  } finally {
    loading.value = false;
  }
};

const loadSettings = async () => {
  try {
    settings.value = await fetchPublicSettings();
  } catch (err: any) {
    settings.value = defaultSettings;
    settingsError.value = err?.message || 'Unable to load settings.';
  }
};

onMounted(async () => {
  await loadTenant();
  await loadSettings();
  await loadServices();
});

const normalizePhone = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return trimmed;
};

const goTo = (next: Step) => {
  if (next === 'categories' && !grouped.value.length && serviceRequired.value) return;
  if (next === 'services' && serviceRequired.value && !selectedCategoryId.value) return;
  if (next === 'review' && serviceRequired.value && !selectedServices.value.size) return;
  step.value = next;
};

const selectCategory = (id: string | null) => {
  selectedCategoryId.value = id;
  selectedServices.value = new Set();
  goTo('services');
};

const toggleService = (id: string) => {
  if (!allowMultiService.value) {
    selectedServices.value = new Set([id]);
    return;
  }
  const copy = new Set(selectedServices.value);
  if (copy.has(id)) copy.delete(id);
  else copy.add(id);
  selectedServices.value = copy;
};

const reviewItems = computed(() => {
  const items: Array<{ id: string; name: string; priceCents?: number; currency?: string }> = [];
  grouped.value.forEach((cat) => {
    cat.services.forEach((svc) => {
      if (selectedServices.value.has(svc.id)) {
        items.push({ id: svc.id, name: svc.name, priceCents: svc.priceCents, currency: svc.currency });
      }
    });
  });
  return items;
});

const totalPrice = computed(() => {
  const cents = reviewItems.value.reduce((sum, svc) => sum + (svc.priceCents ?? 0), 0);
  return cents / 100;
});

const formatPrice = (priceCents?: number, currency = 'USD') => {
  const value = (priceCents ?? 0) / 100;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
};

const onLookup = async () => {
  if (!form.phoneE164.trim()) {
    lookupResult.value = null;
    return;
  }
  try {
    const normalizedPhone = normalizePhone(form.phoneE164);
    lookupResult.value = await publicLookup(normalizedPhone);
    if (lookupResult.value.exists && lookupResult.value.customer?.name) {
      form.name = lookupResult.value.customer.name;
    }
  } catch {
    lookupResult.value = null;
  }
};

const submitCheckIn = async () => {
  error.value = '';
  if (!kioskEnabled.value) {
    error.value = 'Kiosk check-in is disabled.';
    return;
  }
  submitting.value = true;
  try {
    const normalizedPhone = normalizePhone(form.phoneE164);
    if (phoneRequired.value && !normalizedPhone) {
      throw new Error('Phone number is required');
    }
    const nameToUse = form.name.trim();
    const firstServiceId = reviewItems.value[0]?.id || undefined;
    const serviceNameList = reviewItems.value.map((s) => s.name).join(', ');
    await createPublicCheckIn({
      name: nameToUse,
      phoneE164: phoneRequired.value ? normalizedPhone : normalizedPhone || null,
      serviceId: firstServiceId,
      serviceName: serviceNameList || undefined,
      appointmentId: undefined,
    });
    step.value = 'done';
    // Auto-reset after short delay
    const resetMs = autoResetMs.value;
    if (resetTimer.value) {
      clearTimeout(resetTimer.value);
    }
    if (resetMs && resetMs > 0) {
      resetTimer.value = window.setTimeout(() => {
        resetFlow();
      }, resetMs);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to check in';
  } finally {
    submitting.value = false;
  }
};

const resetFlow = () => {
  form.name = '';
  form.phoneE164 = '';
  selectedCategoryId.value = null;
  selectedServices.value = new Set();
  lookupResult.value = null;
  step.value = 'welcome';
  error.value = '';
  if (resetTimer.value) {
    clearTimeout(resetTimer.value);
    resetTimer.value = null;
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-white flex items-center justify-center py-8">
    <div class="w-full max-w-5xl px-4">
      <div class="mb-6 text-center">
        <h1 class="text-3xl font-semibold">{{ businessName }}</h1>
        <p class="text-slate-300">Touch-friendly check-in</p>
      </div>

      <ElAlert
        v-if="settingsError"
        type="warning"
        :closable="false"
        class="mb-3"
        :title="settingsError"
      />

      <ElAlert
        v-if="!kioskEnabled"
        type="warning"
        :closable="false"
        class="mb-3"
        title="Kiosk mode is disabled. Ask the front desk to enable it."
      />

      <ElAlert v-if="error" type="error" :title="error" class="mb-4" />

      <ElCard class="bg-slate-800 border border-slate-700" :body-style="{ padding: '20px' }">
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between text-sm text-slate-300">
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full" :class="step === 'welcome' ? 'bg-emerald-400' : 'bg-slate-500'" />
              Welcome
            </div>
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full" :class="step === 'categories' ? 'bg-emerald-400' : 'bg-slate-500'" />
              Category
            </div>
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full" :class="step === 'services' ? 'bg-emerald-400' : 'bg-slate-500'" />
              Services
            </div>
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full" :class="step === 'review' ? 'bg-emerald-400' : 'bg-slate-500'" />
              Review
            </div>
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full" :class="step === 'done' ? 'bg-emerald-400' : 'bg-slate-500'" />
              Done
            </div>
          </div>

          <!-- Welcome -->
          <div v-if="step === 'welcome'" class="grid gap-3 md:grid-cols-2">
            <div class="col-span-2 md:col-span-1 space-y-2">
              <label class="text-sm text-slate-300">Mobile number</label>
              <ElInput v-model="form.phoneE164" size="large" placeholder="Enter phone" @blur="onLookup" />
            </div>
            <div class="col-span-2 md:col-span-1 space-y-2">
              <label class="text-sm text-slate-300">Name</label>
              <ElInput v-model="form.name" size="large" placeholder="Enter name" />
            </div>
            <div class="col-span-2 flex justify-end gap-2">
              <ElButton
                size="large"
                type="primary"
                @click="goTo('categories')"
                :disabled="loading || (phoneRequired && !form.phoneE164) || !form.name || !kioskEnabled"
              >
                Next
              </ElButton>
            </div>
          </div>

          <!-- Categories -->
          <div v-else-if="step === 'categories'" class="space-y-4">
            <div class="grid gap-3 md:grid-cols-3">
              <button
                v-for="cat in filteredCategories"
                :key="cat.categoryId || cat.categoryName"
                class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-left hover:border-emerald-400 focus:outline-none"
                @click="selectCategory(cat.categoryId)
              ">
                <div class="text-2xl">{{ cat.categoryIcon }}</div>
                <div class="text-lg font-semibold text-white">{{ cat.categoryName }}</div>
                <div class="text-xs text-slate-400">Tap to select</div>
              </button>
            </div>
            <div class="flex justify-between">
              <ElButton @click="goTo('welcome')">Back</ElButton>
              <ElButton v-if="!serviceRequired" type="primary" @click="goTo('review')">
                Skip selection
              </ElButton>
            </div>
          </div>

          <!-- Services -->
          <div v-else-if="step === 'services'" class="space-y-4">
            <div class="grid gap-3 md:grid-cols-2">
              <button
                v-for="svc in servicesForCategory"
                :key="svc.id"
                class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-left hover:border-emerald-400 focus:outline-none"
                :class="selectedServices.has(svc.id) ? 'border-emerald-400 ring-1 ring-emerald-400' : ''"
                @click="toggleService(svc.id)"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">{{ svc.icon || '✂️' }}</span>
                    <div>
                      <div class="text-lg font-semibold text-white">{{ svc.name }}</div>
                      <div class="text-xs text-slate-400">{{ svc.durationMinutes || 0 }} min</div>
                    </div>
                  </div>
                  <div class="text-sm font-semibold text-emerald-300">{{ formatPrice(svc.priceCents, svc.currency) }}</div>
                </div>
              </button>
            </div>
            <div class="flex justify-between">
              <ElButton @click="goTo('categories')">Back</ElButton>
              <ElButton type="primary" :disabled="serviceRequired && !selectedServices.size" @click="goTo('review')">Next</ElButton>
            </div>
          </div>

          <!-- Review -->
          <div v-else-if="step === 'review'" class="space-y-3">
            <div class="rounded-lg border border-slate-700 bg-slate-800 p-4">
              <div class="text-lg font-semibold text-white">You selected</div>
              <div v-if="reviewItems.length" class="mt-2 space-y-2">
                <div v-for="item in reviewItems" :key="item.id" class="flex justify-between text-slate-200">
                  <span>{{ item.name }}</span>
                  <span class="text-emerald-300">{{ formatPrice(item.priceCents, item.currency) }}</span>
                </div>
              </div>
              <div v-else class="mt-2 text-sm text-slate-300">No services selected.</div>
              <div class="mt-3 flex justify-between text-white font-semibold">
                <span>Total</span>
                <span>{{ formatPrice(Math.round(totalPrice * 100), settings?.currency || 'USD') }}</span>
              </div>
            </div>
            <div class="flex justify-between">
              <ElButton @click="goTo('services')">Back</ElButton>
              <ElButton type="primary" :loading="submitting" @click="submitCheckIn">Confirm</ElButton>
            </div>
          </div>

          <!-- Done -->
          <div v-else-if="step === 'done'" class="space-y-3 text-center">
            <div class="text-3xl font-semibold text-emerald-300">Checked in!</div>
            <div class="text-slate-300">You're all set.</div>
            <ElButton type="primary" @click="resetFlow">Start over</ElButton>
          </div>
        </div>
      </ElCard>
    </div>
  </div>
</template>
