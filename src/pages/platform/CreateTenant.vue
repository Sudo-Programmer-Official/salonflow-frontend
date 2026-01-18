<script setup lang="ts">
import { ref, computed } from 'vue';
import { createTenant, type CreateTenantPayload } from '../../api/superadmin';

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
} | null>(null);

const loginUrl = computed(() =>
  subdomain.value ? `https://${subdomain.value}.salonflow.studio/app/login` : '',
);
const checkInUrl = computed(() =>
  subdomain.value ? `https://${subdomain.value}.salonflow.studio/check-in` : '',
);

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
    const result = await createTenant(payload);
    success.value = result;
  } catch (err: any) {
    error.value = err?.message || 'Failed to create tenant';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-10">
    <div class="flex items-center gap-2">
      <div class="h-2 w-2 rounded-full bg-sky-500" />
      <h1 class="text-2xl font-semibold text-slate-900">Create Tenant</h1>
    </div>
    <p class="mt-2 text-slate-600">Provision a new salon tenant and owner credentials.</p>

    <div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label class="text-sm font-medium text-slate-800">Business name</label>
          <input
            v-model="name"
            type="text"
            class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
            placeholder="MTV Nails"
          />
        </div>
          <div>
            <label class="text-sm font-medium text-slate-800">Subdomain</label>
            <div class="mt-1 flex items-center gap-2">
              <input
                v-model="subdomain"
              @blur="normalizeSubdomain"
              type="text"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
              placeholder="mtvnails"
            />
            <span class="text-sm text-slate-500">.salonflow.studio</span>
          </div>
          <p v-if="subdomain" class="mt-1 text-xs text-slate-500">
            Login: https://{{ subdomain }}.salonflow.studio/app/login
          </p>
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        </div>
        <div>
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
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
            :disabled="loading"
            @click="submit"
          >
            {{ loading ? 'Creating...' : 'Create tenant' }}
          </button>
          <p class="text-xs text-slate-500">Owner will use these credentials to log in.</p>
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      </div>

      <div class="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-800">Next steps</h3>
        <ol class="list-decimal space-y-2 pl-4 text-sm text-slate-700">
          <li>Add DNS: <code>{{ subdomain || 'subdomain' }}.salonflow.studio</code> → <code>cname.vercel-dns.com</code></li>
          <li>In Vercel › Domains, add {{ subdomain || 'subdomain' }}.salonflow.studio to production</li>
          <li>Share login + check-in links with the owner</li>
        </ol>
        <div v-if="success" class="rounded-lg bg-white p-3 text-sm text-slate-700 border border-slate-200">
          <p class="font-semibold text-slate-900">Tenant created</p>
          <p class="mt-1">Owner: {{ success.ownerEmail }}</p>
          <p class="mt-1">Temp password: <span class="font-mono text-slate-900">{{ success.tempPassword }}</span></p>
          <div class="mt-3 space-y-1">
            <a v-if="loginUrl" :href="loginUrl" target="_blank" class="text-sky-600 hover:text-sky-700">Open login</a>
            <br />
            <a v-if="checkInUrl" :href="checkInUrl" target="_blank" class="text-sky-600 hover:text-sky-700">Open check-in</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
