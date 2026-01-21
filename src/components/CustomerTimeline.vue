<script setup lang="ts">
import { computed } from 'vue';
import type { CustomerTimeline } from '../api/customers';
import { formatInBusinessTz } from '../utils/dates';
import { formatPhone } from '../utils/format';

const props = defineProps<{
  timeline: CustomerTimeline | null;
}>();

const visits = computed(() => props.timeline?.visits ?? []);
const customer = computed(() => props.timeline?.customer);

const formatDate = (iso: string | null) => formatInBusinessTz(iso, 'MMM D, YYYY');

const formatAmount = (val: number | null) => {
  if (val === null || typeof val === 'undefined') return '—';
  return `$${val.toFixed(2)}`;
};
</script>

<template>
  <div class="space-y-4">
    <div v-if="customer" class="space-y-1">
      <div class="text-lg font-semibold text-slate-900">{{ customer.name }}</div>
      <div class="text-sm text-slate-600">{{ formatPhone(customer.phoneE164) }}</div>
      <div class="text-sm text-slate-700">Points: {{ customer.pointsBalance ?? 0 }}</div>
    </div>

    <div v-if="visits.length === 0" class="text-sm text-slate-500">
      No completed visits yet.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(visit, idx) in visits"
        :key="idx"
        class="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1"
      >
        <div class="text-sm font-semibold text-slate-900">
          {{ formatDate(visit.paidAt) }}
        </div>
        <div class="text-sm text-slate-700">
          Amount: {{ formatAmount(visit.amountPaid) }}
        </div>
        <div class="text-sm text-slate-700">
          Served by: {{ visit.servedByName || 'Not recorded' }}
        </div>
        <div class="text-sm text-slate-700">
          Review sent:
          <span :class="visit.reviewSent ? 'text-emerald-600' : 'text-slate-500'">
            {{ visit.reviewSent ? 'Yes' : 'No' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
