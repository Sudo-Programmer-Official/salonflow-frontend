<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen flex flex-col bg-white text-slate-900">
    <header class="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
      <div class="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <slot name="brand" />
        <nav class="flex items-center gap-4 text-sm font-semibold text-slate-700">
          <slot name="nav" />
        </nav>
      </div>
    </header>
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
