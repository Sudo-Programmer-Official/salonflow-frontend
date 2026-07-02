<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import dayjs from 'dayjs';
import { ElAlert, ElButton, ElCard, ElEmpty, ElOption, ElSelect, ElSkeleton } from 'element-plus';
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
    const settingsPromise = fetchSettings().catch(() => null);
    const reportData = await fetchSalesReport({ ...rangeDates.value, source: source.value });
    report.value = reportData;
    loadedAt.value = dayjs().format('MMM D, YYYY h:mm A');
    settings.value = await settingsPromise;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load reports';
  } finally {
    loading.value = false;
  }
};

const summaryCards = computed(() => {
  if (!report.value) return [];
  return [
    { label: 'Gross Sales', value: report.value.summary.grossSales, tone: 'teal' },
    { label: 'Net Sales', value: report.value.summary.netSales, tone: 'slate' },
    { label: 'Tips', value: report.value.summary.tips, tone: 'amber' },
    { label: 'Closed Tickets', value: report.value.summary.closedTickets, tone: 'indigo' },
  ];
});

onMounted(load);
</script>

<template>
  <div class="space-y-6 pb-8">
    <section class="reports-hero">
      <div class="reports-hero__copy">
        <div class="reports-kicker">Reports</div>
        <h1 class="reports-title">Sales, staff, tips, and payment mix.</h1>
        <p class="reports-subtitle">
          See one combined view of closed sales. Use the source filter to split Admin Checkout and POS when you need to compare workflows.
        </p>
        <div class="reports-pills">
          <span class="reports-pill">{{ sourceLabel }}</span>
          <span class="reports-pill">{{ loadedAt ? `Updated ${loadedAt}` : 'Loading snapshot...' }}</span>
        </div>
      </div>

      <div class="reports-controls">
        <ElSelect v-model="source" size="large" class="reports-select" @change="load">
          <ElOption label="All Sources" value="all" />
          <ElOption label="Admin Checkout" value="admin_checkout" />
          <ElOption label="POS" value="pos" />
        </ElSelect>
        <ElSelect v-model="rangeKey" size="large" class="reports-select reports-select--range" @change="load">
          <ElOption label="Today" value="today" />
          <ElOption label="Last 7 days" value="7d" />
          <ElOption label="Last 30 days" value="30d" />
        </ElSelect>
        <ElButton size="large" class="reports-refresh" @click="load">Refresh</ElButton>
      </div>
    </section>

    <ElAlert v-if="error" :title="error" type="error" :closable="false" />

    <ElSkeleton v-if="loading" animated :rows="10" class="reports-skeleton" />

    <template v-else-if="report">
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ElCard v-for="card in summaryCards" :key="card.label" class="reports-metric-card">
          <div class="reports-metric-card__label">{{ card.label }}</div>
          <div class="reports-metric-card__value" :data-tone="card.tone">
            {{ typeof card.value === 'number' && card.label.includes('Sales') ? money(card.value) : card.value }}
          </div>
        </ElCard>
      </section>

      <section class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <ElCard class="reports-surface-card">
          <div class="reports-section-head">
            <div>
              <div class="reports-section-title">Sales Summary</div>
              <div class="reports-section-subtitle">Core revenue and adjustment totals for the selected range.</div>
            </div>
          </div>

          <div class="reports-grid">
            <div class="reports-stat">
              <div class="reports-stat__label">Service revenue</div>
              <div class="reports-stat__value">{{ money(report.summary.serviceRevenue) }}</div>
            </div>
            <div class="reports-stat">
              <div class="reports-stat__label">Product revenue</div>
              <div class="reports-stat__value">{{ money(report.summary.productRevenue) }}</div>
            </div>
            <div class="reports-stat">
              <div class="reports-stat__label">Discounts</div>
              <div class="reports-stat__value">{{ money(report.summary.discounts) }}</div>
            </div>
            <div class="reports-stat">
              <div class="reports-stat__label">Tax</div>
              <div class="reports-stat__value">{{ money(report.summary.tax) }}</div>
            </div>
            <div class="reports-stat">
              <div class="reports-stat__label">Tips</div>
              <div class="reports-stat__value">{{ money(report.summary.tips) }}</div>
            </div>
            <div class="reports-stat">
              <div class="reports-stat__label">Refunds / voids</div>
              <div class="reports-stat__value">{{ money(report.summary.refunds) }}</div>
            </div>
          </div>
        </ElCard>

        <ElCard class="reports-surface-card">
          <div class="reports-section-head">
            <div>
              <div class="reports-section-title">Payment Breakdown</div>
              <div class="reports-section-subtitle">How completed tickets were settled.</div>
            </div>
          </div>

          <div class="reports-list">
            <div v-for="row in [
              { label: 'Cash', value: report.payments.cash },
              { label: 'Card', value: report.payments.card },
              { label: 'Gift card', value: report.payments.giftCard },
              { label: 'Check', value: report.payments.check },
              { label: 'Other', value: report.payments.other },
            ]" :key="row.label" class="reports-list__row">
              <span class="reports-list__label">{{ row.label }}</span>
              <span class="reports-list__value">{{ money(row.value) }}</span>
            </div>
          </div>
        </ElCard>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <ElCard class="reports-surface-card">
          <div class="reports-section-head">
            <div>
              <div class="reports-section-title">Employee Payment Review</div>
              <div class="reports-section-subtitle">Staff revenue and tips for the selected period.</div>
            </div>
            <span class="reports-badge">{{ settings?.enableStaffSelection ? 'Enabled' : 'Disabled' }}</span>
          </div>

          <div v-if="!settings?.enableStaffSelection" class="reports-empty">
            <div class="reports-empty__title">Staff tracking is off.</div>
            <div class="reports-empty__copy">Turn on staff selection in Settings to see employee payouts.</div>
          </div>

          <div v-else class="reports-stack">
            <div v-for="row in report.staff" :key="row.staffId ?? row.staffName" class="reports-person-card">
              <div class="reports-person-card__top">
                <div>
                  <div class="reports-person-card__name">{{ row.staffName }}</div>
                  <div class="reports-person-card__meta">{{ row.ticketCount }} tickets</div>
                </div>
                <div class="reports-person-card__amount">{{ money(row.serviceRevenue) }}</div>
              </div>
              <div class="reports-person-card__footer">Tips {{ money(row.tips) }}</div>
            </div>
          </div>
        </ElCard>

        <ElCard class="reports-surface-card">
          <div class="reports-section-head">
            <div>
              <div class="reports-section-title">Tips To Pay</div>
              <div class="reports-section-subtitle">Tip totals grouped by staff member.</div>
            </div>
          </div>

          <div class="reports-stack" v-if="report.tips.length">
            <div v-for="row in report.tips" :key="row.staffId ?? row.staffName" class="reports-list__row reports-list__row--compact">
              <span class="reports-list__label">{{ row.staffName }}</span>
              <span class="reports-list__value">{{ money(row.tips) }}</span>
            </div>
          </div>

          <ElEmpty v-else description="No tip records for this range." class="reports-empty reports-empty--compact" />
        </ElCard>
      </section>

      <ElCard class="reports-surface-card">
        <div class="reports-section-head">
          <div>
            <div class="reports-section-title">Service Report</div>
            <div class="reports-section-subtitle">Every closed service line item in the selected range.</div>
          </div>
        </div>

        <div class="reports-table-wrap">
          <table class="reports-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Quantity</th>
                <th>Revenue</th>
                <th>Staff</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in report.services" :key="row.serviceName">
                <td>{{ row.serviceName }}</td>
                <td>{{ row.quantity }}</td>
                <td>{{ money(row.revenue) }}</td>
                <td>{{ row.staffName || 'Unassigned' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ElCard>
    </template>
  </div>
</template>

<style scoped>
.reports-hero {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 28px;
  padding: 1.5rem;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94) 48%, rgba(237, 242, 247, 0.9));
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.06);
}

.reports-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.12), transparent 28%),
    radial-gradient(circle at bottom left, rgba(99, 102, 241, 0.08), transparent 24%);
  pointer-events: none;
}

.reports-hero__copy,
.reports-controls {
  position: relative;
  z-index: 1;
}

.reports-kicker {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border-radius: 9999px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.9);
  padding: 0.45rem 0.8rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #475569;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.04);
}

.reports-title {
  margin-top: 0.9rem;
  max-width: 50rem;
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1.06;
  font-weight: 700;
  color: #0f172a;
}

.reports-subtitle {
  margin-top: 0.8rem;
  max-width: 46rem;
  font-size: 1rem;
  line-height: 1.75;
  color: #475569;
}

.reports-pills {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.reports-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.9);
  padding: 0.45rem 0.8rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
}

.reports-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: flex-start;
}

.reports-select {
  width: 11.5rem;
}

.reports-select--range {
  width: 10.25rem;
}

.reports-refresh {
  border-radius: 9999px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  color: #0f172a;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.reports-metric-card,
.reports-surface-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.94);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95));
  box-shadow: 0 16px 42px rgba(15, 23, 42, 0.06);
}

.reports-metric-card::before,
.reports-surface-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.22) 48%, rgba(255, 255, 255, 0));
  pointer-events: none;
}

.reports-metric-card :deep(.el-card__body),
.reports-surface-card :deep(.el-card__body) {
  position: relative;
  z-index: 1;
}

.reports-metric-card :deep(.el-card__body) {
  padding: 1rem 1.05rem;
}

.reports-metric-card__label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
}

.reports-metric-card__value {
  margin-top: 0.45rem;
  font-size: 1.9rem;
  line-height: 1;
  font-weight: 700;
  color: #0f172a;
}

.reports-metric-card__value[data-tone='teal'] {
  color: #0f766e;
}

.reports-metric-card__value[data-tone='amber'] {
  color: #b45309;
}

.reports-metric-card__value[data-tone='indigo'] {
  color: #4338ca;
}

.reports-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.reports-section-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
}

.reports-section-subtitle {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #64748b;
}

.reports-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: #ffffff;
  padding: 0.4rem 0.7rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: #475569;
  white-space: nowrap;
}

.reports-grid {
  margin-top: 1rem;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.reports-stat,
.reports-person-card,
.reports-list__row {
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.88);
}

.reports-stat {
  padding: 0.9rem 1rem;
}

.reports-stat__label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
}

.reports-stat__value {
  margin-top: 0.35rem;
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
}

.reports-list {
  margin-top: 1rem;
  display: grid;
  gap: 0.7rem;
}

.reports-list__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
}

.reports-list__row--compact {
  padding: 0.8rem 0.95rem;
}

.reports-list__label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #334155;
}

.reports-list__value {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.reports-stack {
  margin-top: 1rem;
  display: grid;
  gap: 0.7rem;
}

.reports-person-card {
  padding: 0.95rem 1rem;
}

.reports-person-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.reports-person-card__name {
  font-size: 0.98rem;
  font-weight: 700;
  color: #0f172a;
}

.reports-person-card__meta {
  margin-top: 0.2rem;
  font-size: 0.78rem;
  color: #64748b;
}

.reports-person-card__amount {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.reports-person-card__footer {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #64748b;
}

.reports-empty {
  margin-top: 1rem;
  border: 1px dashed rgba(226, 232, 240, 0.95);
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.72);
  padding: 1rem;
  text-align: left;
}

.reports-empty__title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.reports-empty__copy {
  margin-top: 0.35rem;
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.6;
}

.reports-empty--compact {
  margin-top: 1rem;
  padding: 1rem;
}

.reports-table-wrap {
  margin-top: 1rem;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 18px;
}

.reports-table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(255, 255, 255, 0.9);
  text-align: left;
}

.reports-table thead {
  background: rgba(248, 250, 252, 0.95);
}

.reports-table th,
.reports-table td {
  padding: 0.9rem 1rem;
  border-top: 1px solid rgba(226, 232, 240, 0.75);
  color: #334155;
  font-size: 0.92rem;
}

.reports-table th {
  border-top: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
}

.reports-table td:first-child {
  font-weight: 600;
  color: #0f172a;
}

.reports-skeleton {
  border-radius: 24px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.96);
  padding: 1rem;
}

@media (max-width: 900px) {
  .reports-grid {
    grid-template-columns: 1fr;
  }

  .reports-section-head {
    flex-direction: column;
  }

  .reports-select,
  .reports-select--range {
    width: 100%;
  }
}
</style>
