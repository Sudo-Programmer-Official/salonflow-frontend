<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { exchangeDemoAccess } from '../api/demoAccess';
import { defaultRouteForRole } from '../utils/navigation';
import { scrubDemoAccessUrl } from '../utils/demoAccess';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  const rawToken = typeof route.params.token === 'string' ? route.params.token : '';
  if (!rawToken) {
    error.value = 'Missing demo access token.';
    loading.value = false;
    return;
  }

  try {
    // Keep the raw token only in this local call and remove it from browser
    // history before the exchange request starts. It is never persisted. The
    // exchange is performed on the gateway host so the internal tenant slug
    // never appears in the prospect-facing URL.
    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, document.title, scrubDemoAccessUrl(window.location.href));
    }
    const result = await exchangeDemoAccess(rawToken);
    localStorage.setItem('token', result.token);
    localStorage.setItem('role', result.user.role);
    localStorage.setItem('tenantId', result.user.businessId);
    localStorage.setItem('tenantSubdomain', result.tenantSubdomain);
    localStorage.setItem('client', result.user.client || 'salonflow_admin');
    localStorage.setItem('demoAccessSession', 'true');
    if (result.demoContext?.prospectName) {
      localStorage.setItem('demoProspectName', result.demoContext.prospectName);
    } else {
      localStorage.removeItem('demoProspectName');
    }
    if (result.demoContext?.businessName) {
      localStorage.setItem('demoProspectBusinessName', result.demoContext.businessName);
    } else {
      localStorage.removeItem('demoProspectBusinessName');
    }
    if (result.demoContext?.templateLabel) {
      localStorage.setItem('demoTemplateLabel', result.demoContext.templateLabel);
    } else {
      localStorage.removeItem('demoTemplateLabel');
    }
    if (result.demoContext?.templateKey) {
      localStorage.setItem('demoTemplateKey', result.demoContext.templateKey);
    } else {
      localStorage.removeItem('demoTemplateKey');
    }
    // Demo visitors should get the product overview first. Live tenant owners
    // keep their existing queue-first behavior through the normal login flow.
    await router.replace(defaultRouteForRole(result.user.role));
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'This demo access link is no longer available.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
    <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl text-blue-600">↗</div>
      <h1 class="text-2xl font-semibold text-slate-900">Opening your SalonFlow demo</h1>
      <p v-if="loading" class="mt-3 text-sm text-slate-600">Verifying your private access link…</p>
      <div v-else-if="error" class="mt-5 rounded-lg border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-700">
        {{ error }}
      </div>
      <p v-else class="mt-3 text-sm text-slate-600">Redirecting…</p>
    </div>
  </div>
</template>
