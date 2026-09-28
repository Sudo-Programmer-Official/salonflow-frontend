<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import dayjs from 'dayjs';
import { ElAlert, ElButton, ElCard, ElEmpty, ElInput, ElMessage, ElOption, ElSelect, ElSkeleton } from 'element-plus';
import {
  fetchPayroll,
  fetchPayrollCompensation,
  savePayrollCompensation,
  type PayrollCompensation,
  type PayrollSummaryResponse,
} from '../../api/payroll';
import { fetchSettings, type BusinessSettings } from '../../api/settings';

const from = ref(dayjs().startOf('month').format('YYYY-MM-DD'));
const to = ref(dayjs().format('YYYY-MM-DD'));
const payroll = ref<PayrollSummaryResponse | null>(null);
const compensation = ref<PayrollCompensation[]>([]);
const settings = ref<BusinessSettings | null>(null);
const loading = ref(true);
const error = ref('');
const savingStaffId = ref<string | null>(null);

const money = (value: number) =>
  Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: settings.value?.currency || 'USD',
  }).format(value || 0);

const apiRange = computed(() => ({
  from: dayjs(from.value).startOf('day').toISOString(),
  to: dayjs(to.value).endOf('day').toISOString(),
}));

const staffRows = computed(() => {
  const summaries = new Map((payroll.value?.staff ?? []).map((row) => [row.staffId, row]));
  return compensation.value.map((profile) => ({
    ...profile,
    ...(summaries.get(profile.staffId) ?? {
      serviceCount: 0,
      serviceRevenue: 0,
      serviceEarnings: 0,
      tips: 0,
      adjustments: 0,
      totalPay: 0,
    }),
  }));
});

const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [payrollData, compensationData, settingsData] = await Promise.all([
      fetchPayroll(apiRange.value),
      fetchPayrollCompensation(),
      fetchSettings().catch(() => null),
    ]);
    payroll.value = payrollData;
    compensation.value = compensationData;
    settings.value = settingsData;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load payroll';
  } finally {
    loading.value = false;
  }
};

const saveCompensation = async (row: PayrollCompensation) => {
  savingStaffId.value = row.staffId;
  try {
    const saved = await savePayrollCompensation(row.staffId, {
      commissionType: row.commissionType,
      commissionValue: Number(row.commissionValue) || 0,
    });
    row.commissionType = saved.commissionType;
    row.commissionValue = saved.commissionValue;
    ElMessage.success(`Saved ${row.staffName}'s compensation settings`);
    // New compensation applies to future snapshots only. Refreshing keeps the
    // current period visibly tied to its already captured earning rows.
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to save compensation');
  } finally {
    savingStaffId.value = null;
  }
};

const commissionLabel = (row: PayrollCompensation) => {
  if (row.commissionType === 'percentage') return `${row.commissionValue}%`;
  if (row.commissionType === 'hourly') return `${money(row.commissionValue)}/hr`;
  return `${money(row.commissionValue)}/service`;
};

onMounted(load);
</script>

<template>
  <div class="space-y-6 pb-8 payroll-page">
    <section class="payroll-hero">
      <div>
        <div class="payroll-kicker">Staff Payouts</div>
        <h1 class="payroll-title">Payroll review without the spreadsheet.</h1>
        <p class="payroll-subtitle">
          Review service earnings, tips, compensation snapshots, and unassigned work before you finalize a pay period.
        </p>
      </div>
      <div class="payroll-controls">
        <label>From <input v-model="from" type="date" /></label>
        <label>To <input v-model="to" type="date" /></label>
        <ElButton type="primary" size="large" @click="load">Refresh</ElButton>
      </div>
    </section>

    <ElAlert v-if="error" :title="error" type="error" :closable="false" />
    <ElSkeleton v-if="loading" animated :rows="10" />

    <template v-else-if="payroll">
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ElCard v-for="card in [
          { label: 'Total staff pay', value: payroll.summary.totalPay },
          { label: 'Service revenue', value: payroll.summary.serviceRevenue },
          { label: 'Tips', value: payroll.summary.tips },
          { label: 'Unassigned services', value: payroll.summary.unassignedServiceCount, count: true },
        ]" :key="card.label" class="payroll-metric-card">
          <div class="payroll-metric-label">{{ card.label }}</div>
          <div class="payroll-metric-value">{{ card.count ? card.value : money(card.value) }}</div>
        </ElCard>
      </section>

      <ElAlert
        v-if="payroll.summary.unassignedServiceCount"
        title="Some completed services are not assigned to a staff member. Review them before finalizing this pay period."
        type="warning"
        :closable="false"
      />

      <ElCard class="payroll-surface-card">
        <div class="payroll-section-head">
          <div>
            <div class="payroll-section-title">Staff payroll</div>
            <div class="payroll-section-subtitle">Completed service lines for the selected period.</div>
          </div>
          <span class="payroll-status">Draft review</span>
        </div>

        <div v-if="staffRows.length" class="payroll-table-wrap">
          <table class="payroll-table">
            <thead>
              <tr><th>Staff</th><th>Services</th><th>Revenue</th><th>Commission</th><th>Tips</th><th>Total pay</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in staffRows" :key="row.staffId">
                <td class="font-semibold">{{ row.staffName }}</td>
                <td>{{ row.serviceCount }}</td>
                <td>{{ money(row.serviceRevenue) }}</td>
                <td>{{ money(row.serviceEarnings) }}</td>
                <td>{{ money(row.tips) }}</td>
                <td class="font-semibold">{{ money(row.totalPay) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ElEmpty v-else description="No staff earnings in this period." />
      </ElCard>

      <ElCard class="payroll-surface-card">
        <div class="payroll-section-head">
          <div>
            <div class="payroll-section-title">Compensation settings</div>
            <div class="payroll-section-subtitle">Changes apply to future checkout snapshots, not historical earnings.</div>
          </div>
        </div>
        <div class="payroll-compensation-grid">
          <div v-for="row in compensation" :key="row.staffId" class="payroll-compensation-row">
            <div>
              <div class="font-semibold text-slate-900">{{ row.staffName }}</div>
              <div class="text-xs text-slate-500">{{ commissionLabel(row) }}</div>
            </div>
            <ElSelect v-model="row.commissionType" size="default" class="payroll-type-select">
              <ElOption label="Percentage" value="percentage" />
              <ElOption label="Fixed / service" value="fixed" />
              <ElOption label="Hourly" value="hourly" />
            </ElSelect>
            <ElInput v-model.number="row.commissionValue" type="number" min="0" step="0.01" class="payroll-value-input" />
            <ElButton :loading="savingStaffId === row.staffId" @click="saveCompensation(row)">Save</ElButton>
          </div>
        </div>
        <ElEmpty v-if="!compensation.length" description="Add active staff members to configure compensation." />
      </ElCard>

      <ElCard class="payroll-surface-card">
        <div class="payroll-section-head">
          <div>
            <div class="payroll-section-title">Unassigned services</div>
            <div class="payroll-section-subtitle">Resolve these service lines in Queue before finalizing the period.</div>
          </div>
          <RouterLink class="payroll-queue-link" :to="{ name: 'admin-queue' }">Open Queue →</RouterLink>
        </div>
        <div v-if="payroll.unassigned.length" class="payroll-table-wrap">
          <table class="payroll-table">
            <thead><tr><th>Service</th><th>Performed</th><th>Revenue</th><th>Tips</th></tr></thead>
            <tbody>
              <tr v-for="row in payroll.unassigned" :key="row.id">
                <td class="font-semibold">{{ row.serviceName }}</td>
                <td>{{ dayjs(row.performedAt).format('MMM D, YYYY h:mm A') }}</td>
                <td>{{ money(row.grossAmount) }}</td>
                <td>{{ money(row.tipAmount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ElEmpty v-else description="All service lines are assigned." />
      </ElCard>
    </template>
  </div>
</template>

<style scoped>
.payroll-hero {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  border: 1px solid #e2e8f0;
  border-radius: 28px;
  padding: 1.75rem;
  background: linear-gradient(135deg, #fff 0%, #f8fafc 56%, #eef2ff 100%);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.06);
}
.payroll-kicker { color: #475569; font-size: .72rem; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; }
.payroll-title { margin-top: .75rem; color: #0f172a; font-size: clamp(2rem, 3vw, 3rem); font-weight: 700; line-height: 1.08; }
.payroll-subtitle { max-width: 46rem; margin-top: .75rem; color: #475569; line-height: 1.7; }
.payroll-controls { display: flex; align-items: end; flex-wrap: wrap; gap: .75rem; color: #475569; font-size: .8rem; font-weight: 600; }
.payroll-controls label { display: grid; gap: .35rem; }
.payroll-controls input { border: 1px solid #cbd5e1; border-radius: 10px; padding: .65rem .7rem; color: #0f172a; background: #fff; font-weight: 500; }
.payroll-metric-card, .payroll-surface-card { border-color: #e2e8f0; border-radius: 18px; }
.payroll-metric-label { color: #64748b; font-size: .82rem; font-weight: 600; }
.payroll-metric-value { margin-top: .5rem; color: #0f172a; font-size: 1.8rem; font-weight: 700; }
.payroll-section-head { display: flex; align-items: start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
.payroll-section-title { color: #0f172a; font-size: 1.1rem; font-weight: 700; }
.payroll-section-subtitle { margin-top: .25rem; color: #64748b; font-size: .86rem; }
.payroll-status { border-radius: 999px; padding: .4rem .7rem; background: #eff6ff; color: #2563eb; font-size: .75rem; font-weight: 700; }
.payroll-table-wrap { overflow-x: auto; }
.payroll-table { width: 100%; min-width: 680px; border-collapse: collapse; color: #334155; font-size: .9rem; }
.payroll-table th { padding: .75rem; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: .72rem; letter-spacing: .05em; text-align: left; text-transform: uppercase; }
.payroll-table td { padding: .9rem .75rem; border-bottom: 1px solid #f1f5f9; }
.payroll-table tbody tr:last-child td { border-bottom: 0; }
.payroll-compensation-grid { display: grid; gap: .75rem; }
.payroll-compensation-row { display: grid; grid-template-columns: minmax(0, 1fr) 11rem 8rem auto; align-items: center; gap: .75rem; padding: .85rem 0; border-bottom: 1px solid #f1f5f9; }
.payroll-compensation-row:last-child { border-bottom: 0; }
.payroll-type-select, .payroll-value-input { width: 100%; }
.payroll-queue-link { color: #2563eb; font-size: .86rem; font-weight: 700; text-decoration: none; }
@media (max-width: 760px) { .payroll-compensation-row { grid-template-columns: 1fr 1fr; } .payroll-compensation-row > :first-child { grid-column: 1 / -1; } }
</style>
