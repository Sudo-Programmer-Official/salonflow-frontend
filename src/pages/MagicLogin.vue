<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { magicLogin } from '../api/auth';
import { defaultRouteForRole } from '../utils/navigation';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref('');

const redirectByRole = (role: string) => {
  router.replace(defaultRouteForRole(role));
};

onMounted(async () => {
  const token = route.query.token;
  if (!token || typeof token !== 'string') {
    error.value = 'Missing magic link token.';
    loading.value = false;
    return;
  }

  try {
    const result = await magicLogin(token);
    localStorage.setItem('token', result.token);
    localStorage.setItem('role', result.user.role);
    localStorage.setItem('tenantId', result.user.businessId);
    if (result.user.email) {
      localStorage.setItem('email', result.user.email);
    }
    ElMessage.success('Logged in.');
    redirectByRole(result.user.role);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Magic login failed.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
    <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div class="mb-6 text-center">
        <div class="mx-auto mb-3 h-12 w-12 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow" />
        <h1 class="text-2xl font-semibold text-slate-900">Magic Login</h1>
        <p class="mt-2 text-sm text-slate-600">
          Verifying your one-time link.
        </p>
      </div>

      <div v-if="loading" class="text-center text-sm text-slate-600">
        Checking token…
      </div>

      <div v-else-if="error" class="space-y-3">
        <div class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ error }}
        </div>
        <div class="text-sm text-slate-600">
          If the link expired, ask your admin for a new one.
        </div>
      </div>

      <div v-else class="text-center text-sm text-slate-600">
        Redirecting…
      </div>
    </div>
  </div>
</template>
