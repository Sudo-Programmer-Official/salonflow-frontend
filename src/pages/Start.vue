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
  <main v-else class="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
    <LeadAssistant source="marketing-lead-assistant" :persist-drafts="false" />
  </main>
</template>
