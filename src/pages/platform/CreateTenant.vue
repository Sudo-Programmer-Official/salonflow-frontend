<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { createTenant, type CreateTenantPayload } from '../../api/superadmin';

const router = useRouter();

const name = ref('');
const subdomain = ref('');
const ownerName = ref('');
const ownerEmail = ref('');
const tempPassword = ref('');
const loading = ref(false);
const error = ref('');
const success = ref<{
  businessId: string;
  ownerEmail: string;
  tempPassword: string;
  onboardingProjectId?: string;
} | null>(null);

const loginUrl = computed(() =>
  subdomain.value ? `https://${subdomain.value}.salonflow.studio/app/login` : '',
);
const checkInUrl = computed(() =>
  subdomain.value ? `https://${subdomain.value}.salonflow.studio/check-in` : '',
);
const onboardingUrl = computed(() =>
  success.value?.onboardingProjectId ? '/platform/onboarding' : '',
);

const deploymentChecklist = [
  { label: 'Tenant created', detail: 'Business row and owner account are provisioned' },
  { label: 'Default website generated', detail: 'Core tenant defaults are ready for the salon' },
  { label: 'Booking page generated', detail: 'Public booking path is available' },
  { label: 'Homepage published', detail: 'The first public experience is live' },
  { label: 'DNS verified', detail: 'Squarespace or registrar CNAME is configured' },
  { label: 'SSL active', detail: 'The site is reachable over HTTPS' },
  { label: 'Owner login works', detail: 'Temporary password or magic link can be used' },
  { label: 'Dashboard loads', detail: 'Salon admin can enter the product immediately' },
];

const generatePassword = () => {
  const rand = Math.random().toString(36).slice(2, 8);
  const num = Math.floor(Math.random() * 900 + 100);
  tempPassword.value = `Sf-${rand}-${num}`;
};

const normalizeSubdomain = () => {
  subdomain.value = subdomain.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
};

const submit = async () => {
  error.value = '';
  success.value = null;
  loading.value = true;
  try {
    normalizeSubdomain();
    const payload: CreateTenantPayload = {
      name: name.value.trim(),
      subdomain: subdomain.value,
      ownerName: ownerName.value.trim(),
      ownerEmail: ownerEmail.value.trim(),
    };
    if (tempPassword.value.trim()) {
      payload.tempPassword = tempPassword.value.trim();
    }
    success.value = await createTenant(payload);
  } catch (err: any) {
    error.value = err?.message || 'Failed to create tenant';
  } finally {
    loading.value = false;
  }
};

const openOnboarding = () => {
  if (!onboardingUrl.value) return;
  router.push(onboardingUrl.value);
};
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-10">
    <div class="flex items-center gap-2">
      <div class="h-2 w-2 rounded-full bg-sky-500" />
      <h1 class="text-2xl font-semibold text-slate-900">Onboard Salon</h1>
    </div>
    <p class="mt-2 max-w-3xl text-slate-600">
      Provision a new salon tenant, create the owner account, and kick off the onboarding project in one place.
    </p>

    <div class="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr,0.85fr]">
      <div class="space-y-6">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="md:col-span-2">
              <label class="text-sm font-medium text-slate-800">Business name</label>
              <input
                v-model="name"
                type="text"
                class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
                placeholder="MTV Nails"
              />
            </div>
            <div class="md:col-span-2">
              <label class="text-sm font-medium text-slate-800">Subdomain</label>
              <div class="mt-1 flex items-center gap-2">
                <input
                  v-model="subdomain"
                  type="text"
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
                  placeholder="mtvnails"
                  @blur="normalizeSubdomain"
                />
                <span class="text-sm text-slate-500">.salonflow.studio</span>
              </div>
              <p v-if="subdomain" class="mt-1 text-xs text-slate-500">
                Login: https://{{ subdomain }}.salonflow.studio/app/login
              </p>
            </div>
            <div>
              <label class="text-sm font-medium text-slate-800">Owner name</label>
              <input
                v-model="ownerName"
                type="text"
                class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
                placeholder="MTV Nails Owner"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-slate-800">Owner email</label>
              <input
                v-model="ownerEmail"
                type="email"
                class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
                placeholder="owner@mtvnails.com"
              />
            </div>
            <div class="md:col-span-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-slate-800">Temp password (optional)</label>
                <button
                  type="button"
                  class="text-sm font-semibold text-sky-600 hover:text-sky-700"
                  @click="generatePassword"
                >
                  Generate
                </button>
              </div>
              <input
                v-model="tempPassword"
                type="text"
                class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
                placeholder="Autogenerate or paste"
              />
            </div>
          </div>

          <div class="mt-6 flex items-center gap-3">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
              :disabled="loading"
              @click="submit"
            >
              {{ loading ? 'Creating...' : 'Create tenant' }}
            </button>
            <p class="text-xs text-slate-500">Owner credentials are shown once after create.</p>
          </div>

          <p v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>
        </div>

        <div v-if="success" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-emerald-950">Tenant created</h2>
              <p class="mt-1 text-sm text-emerald-900/80">The onboarding project is ready to track deployment and validation.</p>
            </div>
            <button
              v-if="success.onboardingProjectId"
              type="button"
              class="rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
              @click="openOnboarding"
            >
              Open onboarding
            </button>
          </div>

          <div class="mt-5 grid gap-3 md:grid-cols-2">
            <div class="rounded-xl border border-emerald-200 bg-white px-4 py-3">
              <div class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Owner</div>
              <div class="mt-1 text-sm text-slate-900">{{ success.ownerEmail }}</div>
            </div>
            <div class="rounded-xl border border-emerald-200 bg-white px-4 py-3">
              <div class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Temporary password</div>
              <div class="mt-1 font-mono text-sm text-slate-900">{{ success.tempPassword }}</div>
            </div>
            <div class="rounded-xl border border-emerald-200 bg-white px-4 py-3">
              <div class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Business ID</div>
              <div class="mt-1 font-mono text-xs text-slate-700">{{ success.businessId }}</div>
            </div>
            <div class="rounded-xl border border-emerald-200 bg-white px-4 py-3">
              <div class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Onboarding project</div>
              <div class="mt-1 font-mono text-xs text-slate-700">
                {{ success.onboardingProjectId || 'Pending' }}
              </div>
            </div>
          </div>

          <div class="mt-4 flex flex-col gap-2 text-sm text-slate-700">
            <a v-if="loginUrl" :href="loginUrl" target="_blank" class="text-sky-600 hover:text-sky-700">Open login</a>
            <a v-if="checkInUrl" :href="checkInUrl" target="_blank" class="text-sky-600 hover:text-sky-700">Open check-in</a>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <h3 class="text-sm font-semibold text-slate-900">Deployment checklist</h3>
          <p class="mt-1 text-sm text-slate-600">Track what still needs to be completed before the salon is live.</p>
          <div class="mt-4 space-y-3">
            <div
              v-for="item in deploymentChecklist"
              :key="item.label"
              class="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div class="text-sm font-semibold text-slate-900">{{ item.label }}</div>
              <div class="mt-1 text-xs leading-5 text-slate-500">{{ item.detail }}</div>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 class="text-sm font-semibold text-slate-900">What gets created</h3>
          <ul class="mt-3 space-y-2 text-sm text-slate-700">
            <li>Business record</li>
            <li>Owner account</li>
            <li>Default website and booking path</li>
            <li>Initial onboarding project</li>
            <li>Lifecycle state for the platform dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
