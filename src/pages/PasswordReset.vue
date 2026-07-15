<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { requestPasswordReset, resetPassword } from '../api/auth';
import { isPlatformHost } from '../api/client';
import logo from '../assets/images/salonflow-logo.png';

const route = useRoute();
const router = useRouter();

const email = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');
const tenantHint = ref('');
const loading = ref(false);
const error = ref('');
const success = ref('');

const token = computed(() => {
  const raw = route.query.token;
  return typeof raw === 'string' ? raw.trim() : '';
});

const isResetMode = computed(() => Boolean(token.value));

const readBrowserTenantHint = () => {
  if (typeof window === 'undefined') return '';
  const routeTenant = typeof route.query.tenant === 'string' ? route.query.tenant.trim() : '';
  if (routeTenant) return routeTenant;

  const storedTenant = localStorage.getItem('tenantSubdomain')?.trim() || '';
  if (storedTenant) return storedTenant;

  if (!isPlatformHost()) {
    return window.location.host.trim();
  }

  return '';
};

onMounted(() => {
  tenantHint.value = readBrowserTenantHint();
});

const submit = async () => {
  error.value = '';
  success.value = '';
  loading.value = true;

  try {
    if (isResetMode.value) {
      if (newPassword.value !== confirmNewPassword.value) {
        throw new Error('New password and confirmation do not match.');
      }
      await resetPassword({
        token: token.value,
        newPassword: newPassword.value,
        confirmNewPassword: confirmNewPassword.value,
      });
      success.value = 'Your password has been updated. You can sign in now.';
      setTimeout(() => router.replace({ name: 'login' }), 1200);
      return;
    }

    await requestPasswordReset({
      email: email.value.trim(),
      tenantHint: tenantHint.value.trim() || null,
    });
    success.value = 'If an account exists for the supplied information, a password reset link has been sent.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
    <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div class="mb-6 text-center">
        <div class="mx-auto mb-4 flex items-center justify-center">
          <img :src="logo" alt="SalonFlow" class="brand-logo" />
        </div>
        <h1 class="text-2xl font-semibold text-slate-900">
          {{ isResetMode ? 'Set a new password' : 'Reset your password' }}
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          {{ isResetMode ? 'Choose a new secure password for your account.' : 'We will send a reset link to your email.' }}
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <template v-if="!isResetMode">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700">Email</label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              placeholder="you@example.com"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700">Salon subdomain or website URL</label>
            <input
              v-model="tenantHint"
              type="text"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              placeholder="mtvnailsdemo or mtvnails.com"
            />
            <p class="text-xs text-slate-500">
              Required if this page is not already on your salon's domain or subdomain.
            </p>
          </div>
        </template>

        <template v-else>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700">New Password</label>
            <input
              v-model="newPassword"
              type="password"
              required
              minlength="8"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              placeholder="••••••••"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700">Confirm New Password</label>
            <input
              v-model="confirmNewPassword"
              type="password"
              required
              minlength="8"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              placeholder="••••••••"
            />
          </div>
        </template>

        <div v-if="error" class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ error }}
        </div>

        <div v-if="success" class="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {{ success }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <span v-if="loading">Working…</span>
          <span v-else>{{ isResetMode ? 'Update password' : 'Send reset link' }}</span>
        </button>
      </form>

      <div class="mt-6 text-center text-sm text-slate-600">
        <router-link to="/app/login" class="font-semibold text-sky-700 hover:text-sky-800">
          Back to sign in
        </router-link>
      </div>
    </div>
  </div>
</template>
