<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  ElAlert,
  ElButton,
  ElCard,
  ElEmpty,
  ElOption,
  ElSelect,
  ElSkeleton,
  ElTable,
  ElTableColumn,
} from 'element-plus';
import dayjs from 'dayjs';
import {
  fetchAnalyticsSummary,
  fetchCheckinsTrend,
  fetchServicesAnalytics,
  fetchPeakHours,
  fetchStaffAnalytics,
  fetchCustomerAnalytics,
  type CheckinsTrendPoint,
} from '../../api/analytics';

type RangeKey = 'today' | '7d' | '30d';

const rangeKey = ref<RangeKey>('7d');
const loading = ref(true);
const error = ref('');

const summary = ref<Awaited<ReturnType<typeof fetchAnalyticsSummary>> | null>(null);
const trend = ref<CheckinsTrendPoint[]>([]);
const services = ref<{ serviceName: string; categoryName: string; count: number }[]>([]);
const categories = ref<{ categoryName: string; count: number }[]>([]);
const peakHours = ref<{ hour: number; count: number }[]>([]);
const staff = ref<Array<{ staffId: string; staffName: string; checkouts: number; customers: number }>>([]);
const customerSnapshot = ref<Awaited<ReturnType<typeof fetchCustomerAnalytics>> | null>(null);

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

const loadAll = async () => {
  loading.value = true;
  error.value = '';
  try {
    const params = rangeDates.value;
    const [sum, tr, svc, peak, stf, cust] = await Promise.all([
      fetchAnalyticsSummary(params),
      fetchCheckinsTrend(params),
      fetchServicesAnalytics(params),
      fetchPeakHours(params),
      fetchStaffAnalytics(params),
      fetchCustomerAnalytics(params),
    ]);
    summary.value = sum;
    trend.value = tr.points;
    services.value = svc.services;
    categories.value = svc.categories;
    peakHours.value = peak.points;
    staff.value = stf.staff;
    customerSnapshot.value = cust;
  } catch (err: any) {
    error.value = err?.message || 'Failed to load analytics';
  } finally {
    loading.value = false;
  }
};

onMounted(loadAll);

const changeRange = (val: RangeKey) => {
  rangeKey.value = val;
  loadAll();
};

const maxTrend = computed(() => Math.max(...trend.value.map((p) => p.total || 0), 0));
const maxServices = computed(() => Math.max(...services.value.map((s) => s.count), 0));
const maxCategories = computed(() => Math.max(...categories.value.map((s) => s.count), 0));
const maxPeak = computed(() => Math.max(...peakHours.value.map((p) => p.count), 0));

</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Analytics</h1>
        <p class="text-sm text-slate-600">Operational snapshot of check-ins, customers, and services.</p>
      </div>
      <div class="flex items-center gap-2">
        <ElSelect v-model="rangeKey" size="small" style="width: 140px" @change="(val: RangeKey) => changeRange(val)">
          <ElOption label="Today" value="today" />
          <ElOption label="Last 7 days" value="7d" />
          <ElOption label="Last 30 days" value="30d" />
        </ElSelect>
        <ElButton size="small" @click="loadAll">Refresh</ElButton>
      </div>
    </div>

    <ElAlert
      v-if="error"
      type="error"
      :closable="false"
      class="w-full"
      :title="error"
    />

    <ElSkeleton v-if="loading" animated :rows="6" />

    <div v-if="!loading && summary" class="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
      <ElCard v-for="card in [
        { label: 'Total Customers', value: summary.customersTotal },
        { label: 'New Customers', value: summary.customersNew },
        { label: 'Check-ins', value: summary.checkins },
        { label: 'Services Selected', value: summary.servicesSelected },
        { label: 'Points Issued', value: summary.pointsIssued },
        { label: 'Active Staff', value: summary.activeStaff },
      ]" :key="card.label" class="bg-white">
        <div class="text-xs uppercase text-slate-500">{{ card.label }}</div>
        <div class="text-2xl font-semibold text-slate-900">{{ card.value }}</div>
      </ElCard>
    </div>

    <div v-if="!loading" class="grid gap-4 lg:grid-cols-3">
      <ElCard class="bg-white lg:col-span-2">
        <div class="mb-3 flex items-center justify-between">
          <div class="text-base font-semibold text-slate-900">Check-ins (New vs Returning)</div>
        </div>
        <div v-if="trend.length === 0" class="py-6">
          <ElEmpty description="No data for this range" />
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="point in trend"
            :key="point.date"
            class="space-y-1"
          >
            <div class="flex justify-between text-xs text-slate-600">
              <span>{{ point.date }}</span>
              <span class="text-slate-800 font-semibold">{{ point.total }}</span>
            </div>
            <div class="flex h-3 overflow-hidden rounded bg-slate-100">
              <div
                class="bg-emerald-500"
                :style="{ width: maxTrend ? `${(point.new / maxTrend) * 100}%` : '0%' }"
                title="New"
              />
              <div
                class="bg-slate-500"
                :style="{ width: maxTrend ? `${(point.returning / maxTrend) * 100}%` : '0%' }"
                title="Returning"
              />
            </div>
            <div class="flex justify-between text-[11px] text-slate-600">
              <span>New: {{ point.new }}</span>
              <span>Returning: {{ point.returning }}</span>
            </div>
          </div>
        </div>
      </ElCard>

      <ElCard class="bg-white">
        <div class="mb-3 text-base font-semibold text-slate-900">Peak Hours</div>
        <div v-if="peakHours.length === 0" class="py-4"><ElEmpty description="No data" /></div>
        <div v-else class="space-y-2">
          <div v-for="row in peakHours" :key="row.hour" class="space-y-1">
            <div class="flex justify-between text-xs text-slate-600">
              <span>{{ row.hour }}:00</span>
              <span class="text-slate-800 font-semibold">{{ row.count }}</span>
            </div>
            <div class="h-2.5 rounded bg-slate-100">
              <div
                class="h-2.5 rounded bg-indigo-500"
                :style="{ width: maxPeak ? `${(row.count / maxPeak) * 100}%` : '0%' }"
              />
            </div>
          </div>
        </div>
      </ElCard>
    </div>

    <div v-if="!loading" class="grid gap-4 lg:grid-cols-2">
      <ElCard class="bg-white">
        <div class="mb-3 text-base font-semibold text-slate-900">Top Services</div>
        <div v-if="services.length === 0" class="py-4"><ElEmpty description="No data" /></div>
        <div v-else class="space-y-2">
          <div v-for="svc in services.slice(0, 8)" :key="svc.serviceName" class="space-y-1">
            <div class="flex justify-between text-sm text-slate-800">
              <span>{{ svc.serviceName }}</span>
              <span class="font-semibold">{{ svc.count }}</span>
            </div>
            <div class="h-2.5 rounded bg-slate-100">
              <div
                class="h-2.5 rounded bg-emerald-500"
                :style="{ width: maxServices ? `${(svc.count / maxServices) * 100}%` : '0%' }"
              />
            </div>
            <div class="text-[11px] text-slate-500">{{ svc.categoryName }}</div>
          </div>
        </div>
      </ElCard>

      <ElCard class="bg-white">
        <div class="mb-3 text-base font-semibold text-slate-900">Top Categories</div>
        <div v-if="categories.length === 0" class="py-4"><ElEmpty description="No data" /></div>
        <div v-else class="space-y-2">
          <div v-for="cat in categories.slice(0, 8)" :key="cat.categoryName" class="space-y-1">
            <div class="flex justify-between text-sm text-slate-800">
              <span>{{ cat.categoryName }}</span>
              <span class="font-semibold">{{ cat.count }}</span>
            </div>
            <div class="h-2.5 rounded bg-slate-100">
              <div
                class="h-2.5 rounded bg-blue-500"
                :style="{ width: maxCategories ? `${(cat.count / maxCategories) * 100}%` : '0%' }"
              />
            </div>
          </div>
        </div>
      </ElCard>
    </div>

    <div v-if="!loading" class="grid gap-4 lg:grid-cols-2">
      <ElCard class="bg-white">
        <div class="mb-3 text-base font-semibold text-slate-900">Staff Snapshot</div>
        <ElTable :data="staff" v-if="staff.length" size="small" border>
          <ElTableColumn prop="staffName" label="Staff" />
          <ElTableColumn prop="checkouts" label="Checkouts" width="120" />
          <ElTableColumn prop="customers" label="Customers" width="120" />
        </ElTable>
        <ElEmpty v-else description="No staff data" />
      </ElCard>

      <ElCard class="bg-white">
        <div class="mb-3 text-base font-semibold text-slate-900">Customer Health</div>
        <div v-if="customerSnapshot" class="space-y-2 text-sm text-slate-800">
          <div class="flex items-center justify-between">
            <span>Avg visits per customer</span>
            <span class="font-semibold">{{ customerSnapshot.avgVisitsPerCustomer.toFixed(2) }}</span>
          </div>
          <div class="space-y-1">
            <div class="text-xs text-slate-500">Last visit distribution</div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="flex items-center justify-between rounded border border-slate-200 px-2 py-1">
                <span>Today</span><span class="font-semibold">{{ customerSnapshot.lastVisitBuckets.today ?? 0 }}</span>
              </div>
              <div class="flex items-center justify-between rounded border border-slate-200 px-2 py-1">
                <span>Last 7 days</span><span class="font-semibold">{{ customerSnapshot.lastVisitBuckets.last7 ?? 0 }}</span>
              </div>
              <div class="flex items-center justify-between rounded border border-slate-200 px-2 py-1">
                <span>Last 30 days</span><span class="font-semibold">{{ customerSnapshot.lastVisitBuckets.last30 ?? 0 }}</span>
              </div>
              <div class="flex items-center justify-between rounded border border-slate-200 px-2 py-1">
                <span>Last 90</span><span class="font-semibold">{{ customerSnapshot.lastVisitBuckets.last90 ?? 0 }}</span>
              </div>
              <div class="flex items-center justify-between rounded border border-amber-200 bg-amber-50 px-2 py-1">
                <span>Older</span><span class="font-semibold">{{ customerSnapshot.lastVisitBuckets.older ?? 0 }}</span>
              </div>
            </div>
          </div>
        </div>
        <ElEmpty v-else description="No customer data" />
      </ElCard>
    </div>
  </div>
</template>
