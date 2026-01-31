<template>
  <footer class="border-t border-slate-200 bg-white">
    <div
      class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="text-center sm:text-left">
        © {{ new Date().getFullYear() }} SalonFlow. A product of Sudo Programmer Inc.
      </div>
      <div class="flex flex-wrap items-center justify-center gap-4 text-center sm:justify-end">
        <RouterLink class="hover:text-slate-900 transition-colors" to="/privacy">Privacy Policy</RouterLink>
        <RouterLink class="hover:text-slate-900 transition-colors" to="/terms">Terms of Service</RouterLink>
        <RouterLink class="hover:text-slate-900 transition-colors" to="/data-deletion">Data Deletion</RouterLink>
      </div>
    </div>
  </footer>
</template>
