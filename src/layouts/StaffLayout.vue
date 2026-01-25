<template>
  <div class="staff-shell">
    <main class="staff-content mx-auto flex max-w-2xl flex-col px-4 py-6 sm:px-6">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.staff-shell {
  height: 100vh;
  overflow: hidden;
}
.staff-content {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
