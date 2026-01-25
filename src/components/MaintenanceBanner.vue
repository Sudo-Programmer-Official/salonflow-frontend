<template>
  <div
    :class="[
      mode === 'fullscreen'
        ? 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900 text-slate-50'
        : 'w-full rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 shadow-sm',
    ]"
  >
    <div class="flex items-start gap-3 max-w-3xl">
      <div
        class="flex h-10 w-10 flex-none items-center justify-center rounded-full"
        :class="mode === 'fullscreen' ? 'bg-white/10 text-amber-200' : 'bg-amber-100 text-amber-700'"
      >
        <span class="text-xl">🛠️</span>
      </div>
      <div class="space-y-1">
        <div class="text-base font-semibold" :class="mode === 'fullscreen' ? 'text-white' : 'text-amber-900'">
          Maintenance in progress
        </div>
        <div class="text-sm" :class="mode === 'fullscreen' ? 'text-amber-100' : 'text-amber-800'">
          {{ message || fallback }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  message?: string | null;
  mode?: 'banner' | 'fullscreen';
}>();

const fallback = "We're performing quick maintenance. Please check back shortly.";
const mode = props.mode ?? 'banner';
</script>
