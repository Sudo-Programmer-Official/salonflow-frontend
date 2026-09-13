<template>
  <div
    v-if="isStaging"
    class="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-xs font-bold tracking-[0.16em] text-amber-950"
    role="status"
  >
    STAGING · TEST DATA ONLY
  </div>
</template>

<script setup lang="ts">
import { isStagingEnvironment } from '../utils/tenantDomains';

const isStaging = isStagingEnvironment();
</script>
