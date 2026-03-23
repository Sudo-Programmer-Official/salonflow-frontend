<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElAlert, ElButton, ElEmpty, ElOption, ElSelect, ElSkeleton } from 'element-plus';
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
type ChartGuide = { y: number; value: number };
type ChartPoint = CheckinsTrendPoint & { x: number; y: number; label: string };

const rangeKey = ref<RangeKey>('7d');
const loading = ref(true);
const error = ref('');
const loadedAt = ref('');

const summary = ref<Awaited<ReturnType<typeof fetchAnalyticsSummary>> | null>(null);
const trend = ref<CheckinsTrendPoint[]>([]);
const services = ref<{ serviceName: string; categoryName: string; count: number }[]>([]);
const categories = ref<{ categoryName: string; count: number }[]>([]);
const peakHours = ref<{ hour: number; count: number }[]>([]);
const staff = ref<Array<{ staffId: string; staffName: string; checkouts: number; customers: number }>>([]);
const customerSnapshot = ref<Awaited<ReturnType<typeof fetchCustomerAnalytics>> | null>(null);

const numberFormatter = new Intl.NumberFormat('en-US');
const compactFormatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

const formatNumber = (value: number) => numberFormatter.format(Number.isFinite(value) ? value : 0);
const formatCompact = (value: number) => compactFormatter.format(Number.isFinite(value) ? value : 0);
const formatPercent = (value: number) => `${Math.round(value)}%`;

const formatHour = (hour: number) => {
  const normalized = ((hour % 24) + 24) % 24;
  const suffix = normalized >= 12 ? 'PM' : 'AM';
  const display = normalized % 12 || 12;
  return `${display}:00 ${suffix}`;
};

const formatTrendLabel = (date: string) => {
  if (rangeKey.value === 'today') return dayjs(date).format('h A');
  if (rangeKey.value === '30d') return dayjs(date).format('MMM D');
  return dayjs(date).format('ddd');
};

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'SF';

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

const rangeLabel = computed(() => {
  if (rangeKey.value === 'today') return 'Today';
  if (rangeKey.value === '30d') return 'Last 30 days';
  return 'Last 7 days';
});

const rangeSummary = computed(() => {
  const { from, to } = rangeDates.value;
  return `${dayjs(from).format('MMM D')} - ${dayjs(to).format('MMM D, YYYY')}`;
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
    loadedAt.value = dayjs().format('MMM D, YYYY h:mm A');
  } catch (err: any) {
    error.value = err?.message || 'Failed to load analytics';
  } finally {
    loading.value = false;
  }
};

onMounted(loadAll);

const changeRange = async (val: RangeKey) => {
  rangeKey.value = val;
  await loadAll();
};

const maxTrend = computed(() => Math.max(...trend.value.map((point) => point.total || 0), 1));
const maxServices = computed(() => Math.max(...services.value.map((item) => item.count), 1));
const maxCategories = computed(() => Math.max(...categories.value.map((item) => item.count), 1));
const maxPeak = computed(() => Math.max(...peakHours.value.map((item) => item.count), 1));

const totalNew = computed(() => trend.value.reduce((sum, point) => sum + point.new, 0));
const totalReturning = computed(() => trend.value.reduce((sum, point) => sum + point.returning, 0));
const avgDailyCheckins = computed(() => (trend.value.length ? (summary.value?.checkins ?? 0) / trend.value.length : 0));
const returningShare = computed(() => {
  const total = summary.value?.checkins ?? 0;
  return total > 0 ? (totalReturning.value / total) * 100 : 0;
});

const busiestDay = computed(() =>
  trend.value.reduce<CheckinsTrendPoint | null>((best, point) => {
    if (!best || point.total > best.total) return point;
    return best;
  }, null),
);

const busiestHour = computed(() =>
  peakHours.value.reduce<{ hour: number; count: number } | null>((best, point) => {
    if (!best || point.count > best.count) return point;
    return best;
  }, null),
);

const topService = computed(() => services.value[0] ?? null);
const topCategory = computed(() => categories.value[0] ?? null);

const summaryCards = computed(() => {
  if (!summary.value) return [];
  return [
    {
      label: 'Total Customers',
      value: formatNumber(summary.value.customersTotal),
      note: `${formatNumber(summary.value.customersNew)} new in ${rangeLabel.value.toLowerCase()}`,
      icon: 'customers',
      accent: '#2563eb',
      soft: 'rgba(219, 234, 254, 0.92)',
    },
    {
      label: 'New Customers',
      value: formatNumber(summary.value.customersNew),
      note: 'Fresh guests entering the salon',
      icon: 'spark',
      accent: '#10b981',
      soft: 'rgba(209, 250, 229, 0.9)',
    },
    {
      label: 'Check-ins',
      value: formatNumber(summary.value.checkins),
      note: `${avgDailyCheckins.value.toFixed(1)} average per tracked day`,
      icon: 'checkin',
      accent: '#7c3aed',
      soft: 'rgba(237, 233, 254, 0.92)',
    },
    {
      label: 'Services Selected',
      value: formatNumber(summary.value.servicesSelected),
      note: topService.value ? `${topService.value.serviceName} leads demand` : 'Waiting for service activity',
      icon: 'service',
      accent: '#f59e0b',
      soft: 'rgba(254, 243, 199, 0.92)',
    },
    {
      label: 'Points Issued',
      value: formatNumber(summary.value.pointsIssued),
      note: 'Loyalty activity recorded in the range',
      icon: 'loyalty',
      accent: '#ec4899',
      soft: 'rgba(252, 231, 243, 0.92)',
    },
    {
      label: 'Active Staff',
      value: formatNumber(summary.value.activeStaff),
      note: `${formatNumber(staff.value.length)} team members in the snapshot`,
      icon: 'team',
      accent: '#0f172a',
      soft: 'rgba(226, 232, 240, 0.92)',
    },
  ];
});

const heroInsights = computed(() => [
  {
    label: 'Busiest day',
    value: busiestDay.value ? dayjs(busiestDay.value.date).format('ddd, MMM D') : 'No data yet',
    detail: busiestDay.value
      ? `${formatNumber(busiestDay.value.total)} check-ins with ${formatNumber(busiestDay.value.returning)} returning guests`
      : 'Check-in history will surface the strongest day here.',
  },
  {
    label: 'Peak hour',
    value: busiestHour.value ? formatHour(busiestHour.value.hour) : 'No data yet',
    detail: busiestHour.value
      ? `${formatNumber(busiestHour.value.count)} check-ins landed in the busiest hour`
      : 'Peak demand appears once hourly check-ins are recorded.',
  },
  {
    label: 'Top service',
    value: topService.value ? topService.value.serviceName : 'No data yet',
    detail: topService.value
      ? `${formatNumber(topService.value.count)} selections in ${topService.value.categoryName}`
      : 'Service demand will populate after more check-ins.',
  },
]);

const trendChart = computed(() => {
  const width = 700;
  const height = 260;
  const top = 18;
  const left = 16;
  const right = 16;
  const bottom = 28;
  const baseline = height - bottom;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  if (!trend.value.length) {
    return {
      width,
      height,
      baseline,
      guides: [] as ChartGuide[],
      points: [] as ChartPoint[],
      linePath: '',
      areaPath: '',
    };
  }

  const points: ChartPoint[] = trend.value.map((point, index) => {
    const x = trend.value.length === 1 ? left + plotWidth / 2 : left + (index * plotWidth) / (trend.value.length - 1);
    const y = baseline - (point.total / maxTrend.value) * plotHeight;
    return {
      ...point,
      x,
      y,
      label: formatTrendLabel(point.date),
    };
  });

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const firstPoint = points[0]!;
  const lastPoint = points[points.length - 1]!;
  const areaPath = `${linePath} L ${lastPoint.x} ${baseline} L ${firstPoint.x} ${baseline} Z`;

  const guides: ChartGuide[] = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    return {
      y: top + ratio * plotHeight,
      value: Math.round(maxTrend.value * (1 - ratio)),
    };
  });

  return { width, height, baseline, guides, points, linePath, areaPath };
});

const trendRows = computed(() =>
  trend.value.map((point) => ({
    ...point,
    label: dayjs(point.date).format('MMM D'),
    totalWidth: `${(point.total / maxTrend.value) * 100}%`,
    newWidth: point.total ? `${(point.new / point.total) * 100}%` : '0%',
    returningWidth: point.total ? `${(point.returning / point.total) * 100}%` : '0%',
  })),
);

const peakLeaders = computed(() =>
  [...peakHours.value]
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((point) => ({
      ...point,
      width: `${(point.count / maxPeak.value) * 100}%`,
    })),
);

const peakTimeline = computed(() =>
  [...peakHours.value]
    .sort((a, b) => a.hour - b.hour)
    .map((point) => ({
      ...point,
      intensity: maxPeak.value ? Math.max(0.18, point.count / maxPeak.value) : 0.18,
    })),
);

const customerBuckets = computed(() => {
  if (!customerSnapshot.value) return [];
  return [
    { key: 'today', label: 'Today', value: customerSnapshot.value.lastVisitBuckets.today ?? 0, tone: 'emerald' },
    { key: 'last7', label: 'Last 7 days', value: customerSnapshot.value.lastVisitBuckets.last7 ?? 0, tone: 'sky' },
    { key: 'last30', label: 'Last 30 days', value: customerSnapshot.value.lastVisitBuckets.last30 ?? 0, tone: 'violet' },
    { key: 'last90', label: 'Last 90 days', value: customerSnapshot.value.lastVisitBuckets.last90 ?? 0, tone: 'indigo' },
    { key: 'older', label: 'Older', value: customerSnapshot.value.lastVisitBuckets.older ?? 0, tone: 'amber' },
  ];
});

const customerBucketMax = computed(() => Math.max(...customerBuckets.value.map((bucket) => bucket.value), 1));
const dormantCustomers = computed(() => customerBuckets.value.find((bucket) => bucket.key === 'older')?.value ?? 0);

const serviceTotal = computed(() => services.value.reduce((sum, item) => sum + item.count, 0));
const serviceRows = computed(() =>
  services.value.slice(0, 6).map((item) => ({
    ...item,
    width: `${(item.count / maxServices.value) * 100}%`,
    share: serviceTotal.value ? (item.count / serviceTotal.value) * 100 : 0,
  })),
);

const categoryTotal = computed(() => categories.value.reduce((sum, item) => sum + item.count, 0));
const categoryRows = computed(() =>
  categories.value.slice(0, 6).map((item) => ({
    ...item,
    width: `${(item.count / maxCategories.value) * 100}%`,
    share: categoryTotal.value ? (item.count / categoryTotal.value) * 100 : 0,
  })),
);

const staffRows = computed(() => {
  const ranked = staff.value
    .map((row) => ({
      ...row,
      activity: row.checkouts + row.customers,
      initials: getInitials(row.staffName),
    }))
    .sort((a, b) => b.activity - a.activity)
    .slice(0, 6);
  const maxActivity = Math.max(...ranked.map((row) => row.activity), 1);
  return ranked.map((row) => ({
    ...row,
    width: `${(row.activity / maxActivity) * 100}%`,
  }));
});
</script>

<template>
  <div class="space-y-6 pb-8">
    <section class="analytics-hero isolate rounded-[32px] border border-slate-200/80 px-6 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)] sm:px-7">
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute -left-12 top-12 h-40 w-40 rounded-full bg-sky-200/35 blur-3xl" />
        <div class="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl" />
      </div>

      <div class="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-sm">
            Salon intelligence
          </div>
          <h1 class="mt-5 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
            Analytics that make daily decisions easier.
          </h1>
          <p class="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            See demand, customer behavior, service mix, and team activity in a clearer view so owners can spot what is growing, what is slowing down,
            and where the salon should focus next.
          </p>

          <div class="mt-5 flex flex-wrap gap-2">
            <span class="analytics-pill">{{ rangeLabel }}</span>
            <span class="analytics-pill">{{ rangeSummary }}</span>
            <span class="analytics-pill">{{ loadedAt ? `Updated ${loadedAt}` : 'Loading snapshot...' }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ElSelect
            v-model="rangeKey"
            size="large"
            style="width: 150px"
            @change="(val: RangeKey) => changeRange(val)"
          >
            <ElOption label="Today" value="today" />
            <ElOption label="Last 7 days" value="7d" />
            <ElOption label="Last 30 days" value="30d" />
          </ElSelect>
          <ElButton size="large" class="!rounded-full !px-5" @click="loadAll">Refresh</ElButton>
        </div>
      </div>

      <div class="relative z-10 mt-8 grid gap-4 lg:grid-cols-3">
        <div
          v-for="insight in heroInsights"
          :key="insight.label"
          class="rounded-[24px] border border-white/80 bg-white/88 p-5 shadow-sm backdrop-blur"
        >
          <div class="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
            {{ insight.label }}
          </div>
          <div class="mt-3 text-2xl font-semibold text-slate-950">
            {{ insight.value }}
          </div>
          <p class="mt-2 text-sm leading-6 text-slate-600">
            {{ insight.detail }}
          </p>
        </div>
      </div>
    </section>

    <ElAlert v-if="error" type="error" :closable="false" class="w-full" :title="error" />

    <ElSkeleton v-if="loading" animated :rows="12" />

    <template v-if="!loading">
      <section v-if="summary" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <article
          v-for="card in summaryCards"
          :key="card.label"
          class="summary-card"
          :style="{ '--accent': card.accent, '--accent-soft': card.soft }"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="metric-orb">
              <svg
                v-if="card.icon === 'customers'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                <circle cx="9.5" cy="7" r="3.5" />
                <path d="M18 8a3 3 0 0 1 0 6" />
                <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
              </svg>
              <svg
                v-else-if="card.icon === 'spark'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M4 12h5l2-6 3 12 2-6h4" />
              </svg>
              <svg
                v-else-if="card.icon === 'checkin'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-5 w-5"
                aria-hidden="true"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
              <svg
                v-else-if="card.icon === 'service'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M4 7h16" />
                <path d="M7 4v6" />
                <path d="M17 4v6" />
                <path d="M6 19h12" />
                <path d="M8 15h8" />
              </svg>
              <svg
                v-else-if="card.icon === 'loyalty'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M12 3l2.6 5.27 5.82.85-4.21 4.1.99 5.78L12 16.9l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85L12 3Z" />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M12 20V10" />
                <path d="M7 15l5-5 5 5" />
                <path d="M5 4h14" />
              </svg>
            </div>
            <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              {{ card.label }}
            </div>
          </div>
          <div class="mt-5 text-3xl font-semibold text-slate-950">
            {{ card.value }}
          </div>
          <p class="mt-3 text-sm leading-6 text-slate-600">
            {{ card.note }}
          </p>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-[1.45fr,0.95fr]">
        <article class="premium-card p-6">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div class="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Check-in momentum</div>
              <h2 class="mt-2 text-2xl font-semibold text-slate-950">New vs returning guests</h2>
              <p class="mt-2 text-sm leading-7 text-slate-600">
                Spot demand shifts quickly and see how much of your activity is being driven by fresh customers versus repeat visits.
              </p>
            </div>
            <div class="rounded-[22px] border border-slate-200 bg-slate-50/90 px-4 py-3 text-right">
              <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Returning share</div>
              <div class="mt-1 text-2xl font-semibold text-slate-950">{{ formatPercent(returningShare) }}</div>
            </div>
          </div>

          <div v-if="trend.length === 0" class="py-10">
            <ElEmpty description="No trend data for this range" />
          </div>

          <template v-else>
            <div class="chart-surface mt-6 rounded-[26px] border border-slate-200/80 bg-white/92 p-4">
              <svg :viewBox="`0 0 ${trendChart.width} ${trendChart.height}`" class="h-[260px] w-full">
                <defs>
                  <linearGradient id="analyticsTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.28" />
                    <stop offset="100%" stop-color="#14b8a6" stop-opacity="0.03" />
                  </linearGradient>
                </defs>

                <g v-for="guide in trendChart.guides" :key="guide.y">
                  <line
                    x1="16"
                    :y1="guide.y"
                    :x2="trendChart.width - 16"
                    :y2="guide.y"
                    stroke="rgba(148, 163, 184, 0.22)"
                    stroke-dasharray="4 8"
                  />
                  <text
                    x="12"
                    :y="guide.y - 6"
                    fill="#94a3b8"
                    font-size="11"
                  >
                    {{ formatCompact(guide.value) }}
                  </text>
                </g>

                <path :d="trendChart.areaPath" fill="url(#analyticsTrendFill)" />
                <path
                  :d="trendChart.linePath"
                  fill="none"
                  stroke="#0f172a"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />

                <g v-for="point in trendChart.points" :key="point.date">
                  <circle :cx="point.x" :cy="point.y" r="5.5" fill="#ffffff" stroke="#0f172a" stroke-width="3" />
                  <text
                    :x="point.x"
                    :y="trendChart.height - 6"
                    text-anchor="middle"
                    fill="#64748b"
                    font-size="11"
                    font-weight="600"
                  >
                    {{ point.label }}
                  </text>
                </g>
              </svg>
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-3">
              <div class="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4">
                <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">New guests</div>
                <div class="mt-2 text-2xl font-semibold text-slate-950">{{ formatNumber(totalNew) }}</div>
              </div>
              <div class="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Returning guests</div>
                <div class="mt-2 text-2xl font-semibold text-slate-950">{{ formatNumber(totalReturning) }}</div>
              </div>
              <div class="rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-4">
                <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Average pace</div>
                <div class="mt-2 text-2xl font-semibold text-slate-950">{{ avgDailyCheckins.toFixed(1) }}/day</div>
              </div>
            </div>

            <div class="mt-5 space-y-3">
              <div
                v-for="point in trendRows"
                :key="point.date"
                class="rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-3"
              >
                <div class="flex items-center justify-between gap-3 text-sm">
                  <div class="font-medium text-slate-700">{{ point.label }}</div>
                  <div class="font-semibold text-slate-950">{{ formatNumber(point.total) }}</div>
                </div>
                <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200/70">
                  <div class="flex h-full rounded-full" :style="{ width: point.totalWidth }">
                    <div class="h-full bg-emerald-500" :style="{ width: point.newWidth }" />
                    <div class="h-full bg-slate-500" :style="{ width: point.returningWidth }" />
                  </div>
                </div>
                <div class="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>New {{ formatNumber(point.new) }}</span>
                  <span>Returning {{ formatNumber(point.returning) }}</span>
                </div>
              </div>
            </div>
          </template>
        </article>

        <div class="space-y-4">
          <article class="premium-card p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Peak demand</div>
                <h2 class="mt-2 text-2xl font-semibold text-slate-950">When the salon gets busiest</h2>
              </div>
              <div class="rounded-[22px] border border-indigo-200 bg-indigo-50 px-4 py-3 text-right">
                <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-700">Top hour</div>
                <div class="mt-1 text-xl font-semibold text-slate-950">
                  {{ busiestHour ? formatHour(busiestHour.hour) : 'No data' }}
                </div>
              </div>
            </div>

            <div v-if="peakHours.length === 0" class="py-8">
              <ElEmpty description="No hourly demand data yet" />
            </div>

            <template v-else>
              <div class="mt-5 space-y-3">
                <div
                  v-for="row in peakLeaders"
                  :key="row.hour"
                  class="rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-3"
                >
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-medium text-slate-700">{{ formatHour(row.hour) }}</span>
                    <span class="font-semibold text-slate-950">{{ formatNumber(row.count) }}</span>
                  </div>
                  <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200/70">
                    <div class="h-full rounded-full bg-[linear-gradient(90deg,#6366f1,#818cf8)]" :style="{ width: row.width }" />
                  </div>
                </div>
              </div>

              <div class="mt-5">
                <div class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Hourly map</div>
                <div class="mt-3 flex gap-2 overflow-x-auto pb-2">
                  <div
                    v-for="cell in peakTimeline"
                    :key="cell.hour"
                    class="heat-cell rounded-[20px] border border-slate-200 bg-white px-3 py-3 shadow-sm"
                    :style="{ background: `linear-gradient(180deg, rgba(99,102,241,${cell.intensity}), rgba(255,255,255,0.96))` }"
                  >
                    <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {{ formatHour(cell.hour) }}
                    </div>
                    <div class="mt-2 text-xl font-semibold text-slate-950">{{ formatNumber(cell.count) }}</div>
                  </div>
                </div>
              </div>
            </template>
          </article>

          <article class="premium-card p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Customer health</div>
                <h2 class="mt-2 text-2xl font-semibold text-slate-950">Recency and repeat behavior</h2>
              </div>
              <div class="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-right">
                <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Avg visits</div>
                <div class="mt-1 text-2xl font-semibold text-slate-950">
                  {{ customerSnapshot ? customerSnapshot.avgVisitsPerCustomer.toFixed(2) : '0.00' }}
                </div>
              </div>
            </div>

            <div v-if="!customerSnapshot" class="py-8">
              <ElEmpty description="No customer health data yet" />
            </div>

            <template v-else>
              <div class="mt-5 grid gap-3 sm:grid-cols-2">
                <div class="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Tracked customers</div>
                  <div class="mt-2 text-2xl font-semibold text-slate-950">{{ formatNumber(customerSnapshot.totalCustomers) }}</div>
                </div>
                <div class="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">Needs reactivation</div>
                  <div class="mt-2 text-2xl font-semibold text-slate-950">{{ formatNumber(dormantCustomers) }}</div>
                </div>
              </div>

              <div class="mt-5 space-y-3">
                <div
                  v-for="bucket in customerBuckets"
                  :key="bucket.key"
                  class="rounded-[22px] border border-slate-200/80 bg-white/90 px-4 py-3"
                >
                  <div class="flex items-center justify-between gap-3 text-sm">
                    <span class="font-medium text-slate-700">{{ bucket.label }}</span>
                    <span class="font-semibold text-slate-950">{{ formatNumber(bucket.value) }}</span>
                  </div>
                  <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200/70">
                    <div
                      class="h-full rounded-full"
                      :class="
                        bucket.tone === 'emerald'
                          ? 'bg-[linear-gradient(90deg,#10b981,#34d399)]'
                          : bucket.tone === 'sky'
                            ? 'bg-[linear-gradient(90deg,#0ea5e9,#38bdf8)]'
                            : bucket.tone === 'violet'
                              ? 'bg-[linear-gradient(90deg,#8b5cf6,#a78bfa)]'
                              : bucket.tone === 'indigo'
                                ? 'bg-[linear-gradient(90deg,#6366f1,#818cf8)]'
                                : 'bg-[linear-gradient(90deg,#f59e0b,#fbbf24)]'
                      "
                      :style="{ width: `${(bucket.value / customerBucketMax) * 100}%` }"
                    />
                  </div>
                </div>
              </div>
            </template>
          </article>
        </div>
      </section>

      <section class="grid gap-4 xl:grid-cols-[1.1fr,1.1fr,0.95fr]">
        <article class="premium-card p-6">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Top services</div>
              <h2 class="mt-2 text-2xl font-semibold text-slate-950">What guests are choosing most</h2>
            </div>
            <div class="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-right">
              <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Leader</div>
              <div class="mt-1 text-lg font-semibold text-slate-950">{{ topService?.serviceName ?? 'No data' }}</div>
            </div>
          </div>

          <div v-if="serviceRows.length === 0" class="py-8">
            <ElEmpty description="No service data in this range" />
          </div>

          <div v-else class="mt-5 space-y-3">
            <div
              v-for="row in serviceRows"
              :key="`${row.serviceName}-${row.categoryName}`"
              class="rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-lg font-semibold text-slate-900">{{ row.serviceName }}</div>
                  <div class="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{{ row.categoryName }}</div>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-semibold text-slate-950">{{ formatNumber(row.count) }}</div>
                  <div class="text-xs text-slate-500">{{ formatPercent(row.share) }} of tracked service demand</div>
                </div>
              </div>
              <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200/70">
                <div class="h-full rounded-full bg-[linear-gradient(90deg,#10b981,#34d399)]" :style="{ width: row.width }" />
              </div>
            </div>
          </div>
        </article>

        <article class="premium-card p-6">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Top categories</div>
              <h2 class="mt-2 text-2xl font-semibold text-slate-950">Where demand clusters</h2>
            </div>
            <div class="rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-3 text-right">
              <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Category lead</div>
              <div class="mt-1 text-lg font-semibold text-slate-950">{{ topCategory?.categoryName ?? 'No data' }}</div>
            </div>
          </div>

          <div v-if="categoryRows.length === 0" class="py-8">
            <ElEmpty description="No category data in this range" />
          </div>

          <div v-else class="mt-5 space-y-3">
            <div
              v-for="row in categoryRows"
              :key="row.categoryName"
              class="rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-4"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="text-lg font-semibold text-slate-900">{{ row.categoryName }}</div>
                <div class="text-right">
                  <div class="text-2xl font-semibold text-slate-950">{{ formatNumber(row.count) }}</div>
                  <div class="text-xs text-slate-500">{{ formatPercent(row.share) }} of category demand</div>
                </div>
              </div>
              <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200/70">
                <div class="h-full rounded-full bg-[linear-gradient(90deg,#3b82f6,#60a5fa)]" :style="{ width: row.width }" />
              </div>
            </div>
          </div>
        </article>

        <article class="premium-card p-6">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Staff snapshot</div>
              <h2 class="mt-2 text-2xl font-semibold text-slate-950">Who is carrying activity</h2>
            </div>
            <div class="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-right">
              <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Reported staff</div>
              <div class="mt-1 text-2xl font-semibold text-slate-950">{{ formatNumber(staff.length) }}</div>
            </div>
          </div>

          <div v-if="staffRows.length === 0" class="py-8">
            <ElEmpty description="No staff activity in this range" />
          </div>

          <div v-else class="mt-5 space-y-3">
            <div
              v-for="row in staffRows"
              :key="row.staffId || row.staffName"
              class="rounded-[22px] border border-slate-200/80 bg-white/90 px-4 py-4"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                  {{ row.initials }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-base font-semibold text-slate-900">{{ row.staffName || 'Unassigned staff' }}</div>
                  <div class="mt-1 text-xs text-slate-500">
                    {{ formatNumber(row.checkouts) }} checkouts · {{ formatNumber(row.customers) }} customers
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-xl font-semibold text-slate-950">{{ formatNumber(row.activity) }}</div>
                  <div class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Activity</div>
                </div>
              </div>
              <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200/70">
                <div class="h-full rounded-full bg-[linear-gradient(90deg,#0f172a,#334155)]" :style="{ width: row.width }" />
              </div>
            </div>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<style scoped>
.analytics-hero {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94) 52%, rgba(236, 253, 245, 0.84));
}

.analytics-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.85);
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05);
}

.premium-card {
  border-radius: 30px;
  border: 1px solid rgba(226, 232, 240, 0.88);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.07);
  backdrop-filter: blur(18px);
}

.summary-card {
  position: relative;
  overflow: hidden;
  border-radius: 26px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.92));
  padding: 20px;
  box-shadow: 0 16px 45px rgba(15, 23, 42, 0.06);
}

.summary-card::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent), transparent 78%);
}

.metric-orb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  width: 44px;
  border-radius: 16px;
  background: var(--accent-soft);
  color: var(--accent);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.65);
}

.chart-surface {
  background-image:
    linear-gradient(to right, rgba(226, 232, 240, 0.18) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(226, 232, 240, 0.18) 1px, transparent 1px);
  background-size: 54px 54px;
}

.heat-cell {
  min-width: 86px;
}
</style>
