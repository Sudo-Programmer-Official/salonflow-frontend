<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../api/auth';

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const router = useRouter();

const redirectByRole = (role: string) => {
  if (role === 'SUPER_ADMIN') {
    router.push({ name: 'platform-dashboard' });
    return;
  }
  if (role === 'OWNER') {
    router.push({ name: 'admin-dashboard' });
    return;
  }
  if (role === 'STAFF') {
    router.push({ name: 'staff-queue' });
    return;
  }
  router.push({ name: 'check-in' });
};

const handleSubmit = async () => {
  error.value = '';
  loading.value = true;
  try {
    const result = await login({
      email: email.value.trim(),
      password: password.value,
    });
    localStorage.setItem('token', result.token);
    localStorage.setItem('role', result.user.role);
    if (result.user.email) {
      localStorage.setItem('email', result.user.email);
    }
    redirectByRole(result.user.role);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Login failed. Please try again.';
    error.value = message;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
    <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div class="mb-6 text-center">
        <div class="mx-auto mb-3 h-12 w-12 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow" />
        <h1 class="text-2xl font-semibold text-slate-900">Sign in to SalonFlow</h1>
        <p class="mt-2 text-sm text-slate-600">
          Use your owner, staff, or super admin credentials.
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
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
          <label class="text-sm font-medium text-slate-700">Password</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            placeholder="••••••••"
          />
        </div>

        <div v-if="error" class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <span v-if="loading">Signing in…</span>
          <span v-else>Sign in</span>
        </button>
      </form>
    </div>
  </div>
</template>
