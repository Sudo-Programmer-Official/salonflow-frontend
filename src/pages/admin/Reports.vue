<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import dayjs from 'dayjs';
import { ElAlert, ElButton, ElCard, ElOption, ElSelect, ElSkeleton } from 'element-plus';
import { fetchSalesReport, type ReportSource, type SalesReportResponse } from '../../api/reports';
import { fetchSettings, type BusinessSettings } from '../../api/settings';

type RangeKey = 'today' | '7d' | '30d';

const rangeKey = ref<RangeKey>('7d');
const source = ref<ReportSource>('all');
const loading = ref(true);
const error = ref('');
const loadedAt = ref('');
const report = ref<SalesReportResponse | null>(null);
const settings = ref<BusinessSettings | null>(null);

const rangeDates = computed(() => {
  const now = dayjs();
  if (rangeKey.value === 'today') {
    return { from: now.startOf('day').toISOString(), to: now.endOf('day').toISOString() };
  }
  if (rangeKey.value === '30d') {
    return { from: now.subtract(30, 'day').toISOString(), to: now.toISOString() };
  }
  return { from: now.subtract(7, 'day').toISOString(), to: now.toISOString() };
});

const sourceLabel = computed(() => {
  if (source.value === 'admin_checkout') return 'Admin Checkout';
  if (source.value === 'pos') return 'POS';
  return 'All Sources';
});

const money = (value: number) =>
  Intl.NumberFormat('en-US', { style: 'currency', currency: settings.value?.currency || 'USD' }).format(value || 0);

const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [settingsData, reportData] = await Promise.all([
      fetchSettings().catch(() => null),
      fetchSalesReport({ ...rangeDates.value, source: source.value }),
    ]);
    settings.value = settingsData;
    report.value = reportData;
    loadedAt.value = dayjs().format('MMM D, YYYY h:mm A');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load reports';
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div class="space-y-6 pb-8">
    <section class="rounded-[30px] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:px-7">
      <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-300">Reports</div>
          <h1 class="mt-4 text-3xl font-semibold">Sales, staff, tips, and payment mix.</h1>
          <p class="mt-3 max-w-3xl text-base leading-7 text-slate-300">
            See one combined view of closed sales. Use the source filter to split Admin Checkout and POS when you need to compare workflows.
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <span class="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs">{{ sourceLabel }}</span>
            <span class="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs">{{ loadedAt ? `Updated ${loadedAt}` : 'Loading snapshot...' }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ElSelect v-model="source" size="large" style="width: 180px" @change="load">
            <ElOption label="All Sources" value="all" />
            <ElOption label="Admin Checkout" value="admin_checkout" />
            <ElOption label="POS" value="pos" />
          </ElSelect>
          <ElSelect v-model="rangeKey" size="large" style="width: 150px" @change="load">
            <ElOption label="Today" value="today" />
            <ElOption label="Last 7 days" value="7d" />
            <ElOption label="Last 30 days" value="30d" />
          </ElSelect>
          <ElButton size="large" class="!rounded-full !px-5" @click="load">Refresh</ElButton>
        </div>
      </div>
    </section>

    <ElAlert v-if="error" :title="error" type="error" :closable="false" />
    <ElSkeleton v-if="loading" animated :rows="10" />

    <template v-else-if="report">
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ElCard v-for="card in [
          { label: 'Gross Sales', value: report.summary.grossSales },
          { label: 'Net Sales', value: report.summary.netSales },
          { label: 'Closed Tickets', value: report.summary.closedTickets },
          { label: 'Unassigned Sales', value: report.summary.unassignedSales },
        ]" :key="card.label" class="rounded-[24px]">
          <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{{ card.label }}</div>
          <div class="mt-3 text-3xl font-semibold text-slate-950">
            {{ typeof card.value === 'number' && card.label.includes('Sales') ? money(card.value) : card.value }}
          </div>
        </ElCard>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <ElCard class="rounded-[24px]">
          <div class="text-lg font-semibold text-slate-950">Sales Summary</div>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl bg-slate-50 p-4">
              <div class="text-xs uppercase text-slate-500">Service revenue</div>
              <div class="mt-2 text-2xl font-semibold">{{ money(report.summary.serviceRevenue) }}</div>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4">
              <div class="text-xs uppercase text-slate-500">Product revenue</div>
              <div class="mt-2 text-2xl font-semibold">{{ money(report.summary.productRevenue) }}</div>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4">
              <div class="text-xs uppercase text-slate-500">Discounts</div>
              <div class="mt-2 text-2xl font-semibold">{{ money(report.summary.discounts) }}</div>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4">
              <div class="text-xs uppercase text-slate-500">Tax</div>
              <div class="mt-2 text-2xl font-semibold">{{ money(report.summary.tax) }}</div>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4">
              <div class="text-xs uppercase text-slate-500">Tips</div>
              <div class="mt-2 text-2xl font-semibold">{{ money(report.summary.tips) }}</div>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4">
              <div class="text-xs uppercase text-slate-500">Refunds / voids</div>
              <div class="mt-2 text-2xl font-semibold">{{ money(report.summary.refunds) }}</div>
            </div>
          </div>
        </ElCard>

        <ElCard class="rounded-[24px]">
          <div class="text-lg font-semibold text-slate-950">Payment Breakdown</div>
          <div class="mt-4 space-y-3">
            <div v-for="row in [
              { label: 'Cash', value: report.payments.cash },
              { label: 'Card', value: report.payments.card },
              { label: 'Gift card', value: report.payments.giftCard },
              { label: 'Check', value: report.payments.check },
              { label: 'Other', value: report.payments.other },
            ]" :key="row.label" class="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span class="text-sm font-medium text-slate-700">{{ row.label }}</span>
              <span class="text-sm font-semibold text-slate-950">{{ money(row.value) }}</span>
            </div>
          </div>
        </ElCard>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <ElCard class="rounded-[24px]">
          <div class="text-lg font-semibold text-slate-950">Employee Payment Review</div>
          <div v-if="!settings?.enableStaffSelection" class="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Staff tracking is off. Turn on staff selection in Settings to see employee payouts.
          </div>
          <div v-else class="mt-4 space-y-3">
            <div v-for="row in report.staff" :key="row.staffId ?? row.staffName" class="rounded-2xl bg-slate-50 p-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-semibold text-slate-950">{{ row.staffName }}</div>
                  <div class="text-xs text-slate-500">{{ row.ticketCount }} tickets</div>
                </div>
                <div class="text-sm font-semibold text-slate-950">{{ money(row.serviceRevenue) }}</div>
              </div>
              <div class="mt-2 text-xs text-slate-500">Tips {{ money(row.tips) }}</div>
            </div>
          </div>
        </ElCard>

        <ElCard class="rounded-[24px]">
          <div class="text-lg font-semibold text-slate-950">Tips To Pay</div>
          <div class="mt-4 space-y-3">
            <div v-for="row in report.tips" :key="row.staffId ?? row.staffName" class="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span class="text-sm font-medium text-slate-700">{{ row.staffName }}</span>
              <span class="text-sm font-semibold text-slate-950">{{ money(row.tips) }}</span>
            </div>
          </div>
        </ElCard>
      </section>

      <ElCard class="rounded-[24px]">
        <div class="text-lg font-semibold text-slate-950">Service Report</div>
        <div class="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="px-4 py-3">Service</th>
                <th class="px-4 py-3">Quantity</th>
                <th class="px-4 py-3">Revenue</th>
                <th class="px-4 py-3">Staff</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in report.services" :key="row.serviceName" class="border-t border-slate-200">
                <td class="px-4 py-3 font-medium text-slate-950">{{ row.serviceName }}</td>
                <td class="px-4 py-3 text-slate-700">{{ row.quantity }}</td>
                <td class="px-4 py-3 text-slate-700">{{ money(row.revenue) }}</td>
                <td class="px-4 py-3 text-slate-700">{{ row.staffName || 'Unassigned' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ElCard>
    </template>
  </div>
</template>
