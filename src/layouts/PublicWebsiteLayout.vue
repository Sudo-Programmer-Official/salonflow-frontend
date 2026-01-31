<script setup lang="ts">
import WebsiteHeader from '../components/website/WebsiteHeader.vue';
import WebsiteFooter from '../components/website/WebsiteFooter.vue';

defineProps<{
  header?: {
    enabled?: boolean;
    brand?: string;
    nav?: Array<{ label: string; path: string }>;
    ctas?: {
      call?: { enabled?: boolean; phone?: string | null };
      book?: { enabled?: boolean; url?: string | null };
    };
  } | null;
  footer?: any;
  activePath?: string;
}>();
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[var(--sf-bg,#f8fafc)] text-[var(--sf-text,#0f172a)]">
    <WebsiteHeader
      v-if="header?.enabled !== false"
      :brand="header?.brand"
      :nav="header?.nav"
      :ctas="header?.ctas"
      :active-path="activePath"
    />

    <main class="flex-1">
      <slot />
    </main>

    <WebsiteFooter v-if="footer" :footer="footer" :fallback-hours-text="footer?.fallbackHoursText" />
  </div>
</template>
