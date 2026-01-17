<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElButton, ElAlert } from 'element-plus';
import { useRoute } from 'vue-router';
import { createPublicCheckIn, fetchServices, publicLookup } from '../../api/checkins';
import type { ServiceOption } from '../../api/checkins';
import { apiUrl, buildHeaders } from '../../api/client';
import { startKioskIdleWatchdog } from '../../utils/kioskIdleWatchdog';

const form = reactive({
  name: '',
  phoneE164: '',
  serviceId: '',
});

const services = ref<ServiceOption[]>([]);
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
const route = useRoute();
const tenant = computed(
  () =>
    (route.query.tenant as string | undefined) ||
    (import.meta.env.VITE_TENANT_ID as string | undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantSubdomain') ?? undefined : undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? undefined : undefined) ||
    'demo',
);

onMounted(async () => {
  if (tenant.value) {
    localStorage.setItem('tenantSubdomain', tenant.value);
    localStorage.setItem('tenantId', tenant.value);
  }
  loadingServices.value = true;
  await refreshServices();

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
    services.value = await fetchServices();
  } catch {
    services.value = [];
  } finally {
    loadingServices.value = false;
  }
};

const resetForm = (clearFeedback = false) => {
  form.name = '';
  form.phoneE164 = '';
  form.serviceId = '';
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
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return trimmed;
};

const onSubmit = async () => {
  errorMessage.value = '';
  success.value = false;
  submitting.value = true;
  try {
    const normalizedPhone = normalizePhone(form.phoneE164);
    if (!lookupResult.value && normalizedPhone) {
      await onLookup();
    }
    const nameToUse =
      lookupResult.value?.exists && lookupResult.value.customer?.name
        ? lookupResult.value.customer.name
        : form.name.trim();
    await createPublicCheckIn({
      name: nameToUse,
      phoneE164: normalizedPhone,
      serviceId: form.serviceId || undefined,
      serviceName:
        form.serviceId && services.value.length
          ? services.value.find((s) => s.id === form.serviceId)?.name
          : undefined,
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
  if (!form.phoneE164.trim()) {
    lookupResult.value = null;
    lookupError.value = '';
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
</script>

<template>
  <div class="w-full">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-semibold text-slate-900">{{ businessName }}</h1>
      <p class="mt-2 text-sm text-slate-600">Let us know you're here. We'll call you shortly.</p>
    </div>

    <div class="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <ElForm label-position="top" class="space-y-4" @submit.prevent="onSubmit">

        <ElFormItem label="Phone number" required>
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

        <div class="rounded-lg bg-slate-50 p-3 text-sm text-slate-800" v-if="lookupResult && !lookupLoading">
          <template v-if="lookupResult.exists && lookupResult.customer">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-base font-semibold">👤 Hi, {{ lookupResult.customer.name }}</span>
              <span class="text-sm text-slate-700">
                ⭐ {{ lookupResult.customer.pointsBalance ?? 0 }} points · 💸 {{ rewardText }}
              </span>
            </div>
            <div class="text-xs text-slate-600">Keep earning rewards every visit.</div>
          </template>
          <template v-else>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-base font-semibold">✨ Welcome!</span>
              <span class="text-sm text-slate-700">⭐ Your Points: 0 · Earn rewards on every visit</span>
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

        <ElFormItem label="Service (optional)">
          <ElSelect
            v-model="form.serviceId"
            placeholder="Select a service"
            size="large"
            clearable
            filterable
            :loading="loadingServices"
          >
            <ElOption
              v-for="service in services"
              :key="service.id"
              :label="service.name"
              :value="service.id"
            />
          </ElSelect>
        </ElFormItem>

        <div class="space-y-3">
          <ElButton
            type="primary"
            size="large"
            class="w-full"
            :loading="submitting"
            :disabled="(!form.name && !lookupResult?.exists) || !form.phoneE164 || submitting"
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
            <div class="mt-1 text-sm font-semibold text-emerald-700">
              ⭐ {{ successPoints ?? 0 }} points · 💸 {{ rewardText }}
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
