<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { checkTenantExists } from '../api/tenantsPublic';

const tenantInput = ref('');
const error = ref('');
const lastTenant = ref<string | null>(null);
const lastTenantName = ref<string | null>(null);
const lastTenantCity = ref<string | null>(null);
const loading = ref(false);
const showContinue = ref(false);

const storageKeys = {
  lastTenant: 'salonflow:lastTenant',
  lastLoginAt: 'salonflow:lastLoginAt',
  lastTenantUrl: 'salonflow:lastTenantUrl',
  lastTenantName: 'salonflow:lastTenantName',
  lastTenantCity: 'salonflow:lastTenantCity',
};

const normalizeTenant = (raw: string): string | null => {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;
  value = value.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  if (value.includes('.')) {
    value = value.split('.')[0] || value;
  }
  value = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return value || null;
};

const getTenantLoginUrl = (tenant: string) => {
  const { protocol, hostname, port } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  if (isLocal) {
    const portPart = port ? `:${port}` : '';
    return `${protocol}//${hostname}${portPart}/app/login`;
  }
  const parts = hostname.split('.');
  const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : hostname;
  return `${protocol}//${tenant}.${baseDomain}/app/login`;
};

const setTenantAndGo = (tenant: string, name?: string | null, city?: string | null) => {
  localStorage.setItem(storageKeys.lastTenant, tenant);
  localStorage.setItem(storageKeys.lastLoginAt, String(Date.now()));
  localStorage.setItem(storageKeys.lastTenantUrl, `${tenant}.salonflow.studio`);
  if (name) localStorage.setItem(storageKeys.lastTenantName, name);
  if (city) localStorage.setItem(storageKeys.lastTenantCity, city);
  localStorage.setItem('tenantSubdomain', tenant);
  localStorage.setItem('tenantId', tenant);
  window.location.href = getTenantLoginUrl(tenant);
};

const handleContinue = async () => {
  error.value = '';
  loading.value = true;
  const tenant = normalizeTenant(tenantInput.value);
  if (!tenant) {
    loading.value = false;
    error.value = 'Enter your salon subdomain or name.';
    return;
  }
  try {
    const result = await checkTenantExists(tenant);
    if (!result.exists) {
      error.value = "We couldn't find a salon with that name. Please try again.";
      loading.value = false;
      return;
    }
    setTenantAndGo(tenant, result.name, result.city);
  } catch (err: any) {
    error.value = err?.message || 'Something went wrong. Please try again.';
  } finally {
    loading.value = false;
  }
};

const handleContinueLast = async () => {
  if (!lastTenant.value) return;
  error.value = '';
  loading.value = true;
  try {
    const result = await checkTenantExists(lastTenant.value);
    if (!result.exists) {
      handleSwitch();
      error.value = "We couldn't find your last salon. Please enter it again.";
      return;
    }
    lastTenantName.value = result.name;
    lastTenantCity.value = result.city;
    setTenantAndGo(lastTenant.value, result.name, result.city);
  } catch (err: any) {
    error.value = err?.message || 'Something went wrong. Please try again.';
  } finally {
    loading.value = false;
  }
};

const handleSwitch = () => {
  lastTenant.value = null;
  lastTenantName.value = null;
  lastTenantCity.value = null;
  localStorage.removeItem(storageKeys.lastTenant);
  localStorage.removeItem(storageKeys.lastLoginAt);
  localStorage.removeItem(storageKeys.lastTenantUrl);
  localStorage.removeItem(storageKeys.lastTenantName);
  localStorage.removeItem(storageKeys.lastTenantCity);
  showContinue.value = false;
};

onMounted(() => {
  lastTenant.value = localStorage.getItem(storageKeys.lastTenant);
  lastTenantName.value = localStorage.getItem(storageKeys.lastTenantName);
  lastTenantCity.value = localStorage.getItem(storageKeys.lastTenantCity);
  const lastLoginRaw = localStorage.getItem(storageKeys.lastLoginAt);
  const lastLoginAt = lastLoginRaw ? Number(lastLoginRaw) : null;
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  showContinue.value =
    Boolean(lastTenant.value) && !!lastLoginAt && Date.now() - lastLoginAt < THIRTY_DAYS_MS;
});
</script>

<template>
  <div class="bg-gradient-to-br from-slate-50 via-white to-indigo-50 min-h-screen py-12 px-4">
    <div class="mx-auto flex max-w-3xl flex-col gap-6">
      <div class="flex items-center justify-between">
        <div class="text-sm font-semibold text-slate-600">
          Already using SalonFlow? Log in to your salon.
        </div>
        <router-link
          to="/start"
          class="text-sm font-semibold text-sky-700 hover:text-sky-800"
        >
          New? Get started →
        </router-link>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <div class="text-sm font-semibold uppercase tracking-wide text-slate-500">Salon login</div>
            <h1 class="text-2xl font-bold text-slate-900">Find your salon</h1>
            <p class="text-sm text-slate-600">Enter your salon name or link, we’ll remember it.</p>
          </div>
          <div
            v-if="showContinue && lastTenant"
            class="flex items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800"
          >
            <div>
              <div class="font-semibold">Continue to {{ lastTenantName || lastTenant }}</div>
              <div class="text-xs text-sky-700">
                <span v-if="lastTenantCity">{{ lastTenantCity }} · </span>We remembered your salon.
              </div>
            </div>
            <div class="flex gap-2">
              <button
                class="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700"
                @click="handleContinueLast"
              >
                Continue
              </button>
              <button
                class="rounded-md border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
                @click="handleSwitch"
              >
                Switch
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <label class="text-sm font-semibold text-slate-700">Salon subdomain or name</label>
          <input
            v-model="tenantInput"
            type="text"
            class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            placeholder="mtvnailsdemo or mtvnailsdemo.salonflow.studio"
            @keyup.enter="handleContinue"
          />
          <div class="text-xs text-slate-600">
            Hint: mtvnailsdemo.salonflow.studio
          </div>
          <div
            v-if="error"
            class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            {{ error }}
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              :disabled="loading"
              @click="handleContinue"
            >
              <span v-if="loading">Checking salon…</span>
              <span v-else>Continue</span>
            </button>
            <router-link
              to="/start"
              class="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Get started instead
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
