<script setup lang="ts">
import { onMounted, ref } from 'vue';
import DemoFunnel from '../components/marketing/DemoFunnel.vue';
import LeadAssistant from '../components/marketing/LeadAssistant.vue';
import { trackMarketingEvent } from '@/api/marketing';
import { getDemoAccessConfig } from '@/api/demoAccess';

const demoAccessEnabled = ref(false);
const configLoaded = ref(false);

onMounted(async () => {
  const config = await getDemoAccessConfig().catch(() => ({ enabled: false }));
  demoAccessEnabled.value = config.enabled;
  configLoaded.value = true;
  void trackMarketingEvent({
    eventType: 'page_view',
    sourcePage: demoAccessEnabled.value ? 'marketing-demo-funnel' : 'marketing-lead-assistant',
    path: '/start',
    referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    payload: { page: demoAccessEnabled.value ? 'guided-demo-funnel' : 'lead-assistant-fallback' },
  });
});
</script>

<template>
  <DemoFunnel v-if="configLoaded && demoAccessEnabled" />
  <main v-else-if="configLoaded" class="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
    <LeadAssistant source="marketing-lead-assistant" :persist-drafts="false" />
  </main>
  <main
    v-else
    class="flex min-h-[60vh] items-center justify-center bg-slate-50 px-6 py-16"
    aria-live="polite"
    aria-busy="true"
  >
    <div class="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 shadow-sm">
      <span class="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" aria-hidden="true"></span>
      Loading your demo…
    </div>
  </main>
</template>
