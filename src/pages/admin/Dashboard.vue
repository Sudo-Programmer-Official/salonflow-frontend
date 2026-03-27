<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { ElCard, ElButton, ElAlert, ElSkeleton } from 'element-plus';
import { fetchQueue, fetchQueueSummary, type QueueItem, type QueueResponse } from '../../api/queue';
import {
  fetchAppointments,
  fetchTodayAppointments,
  type Appointment,
  type TodayAppointmentsResponse,
} from '../../api/appointments';
import { fetchOnboardingStatus } from '../../api/onboarding';
import { fetchReviewSmsSettings, type ReviewSettingsResponse } from '../../api/reviewSms';
import { useRouter } from 'vue-router';
import { dayjs, nowInBusinessTz, setBusinessTimezone, DEFAULT_TIMEZONE } from '../../utils/dates';

const router = useRouter();

// State variables
const queue = ref<QueueItem[]>([]);
const queueLocked = ref(false);
const appointments = ref<Appointment[]>([]);
const appointmentsLocked = ref(false);
const onboardingIncomplete = ref(false);
const reviewSmsEnabled = ref(true);
const reviewSmsLocked = ref(false);
const queueSummary = ref<{ waiting: number; inService: number; completed: number; noShow: number }>({
  waiting: 0,
  inService: 0,
  completed: 0,
  noShow: 0,
});

const loading = ref(true);
const error = ref('');
const businessTimezone = ref(DEFAULT_TIMEZONE);

const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [onboardingRes] = await Promise.all([fetchOnboardingStatus(true)]);
    const tz = onboardingRes?.timezone?.trim() || DEFAULT_TIMEZONE;
    businessTimezone.value = tz;
    setBusinessTimezone(tz);

    const start = dayjs().tz(tz).startOf('day');
    const end = start.add(1, 'day');
    const todayRange = { from: start.toDate().toISOString(), to: end.toDate().toISOString() };

    const [queueRes, summaryRes, apptRes, reviewRes] = await Promise.all([
      fetchQueue(),
      fetchQueueSummary(todayRange),
      fetchTodayAppointments(),
      fetchReviewSmsSettings(),
    ]);
    queueLocked.value = (queueRes as QueueResponse).locked === true;
    appointmentsLocked.value = (apptRes as TodayAppointmentsResponse).locked === true;
    queue.value = queueLocked.value ? [] : (queueRes as any).items ?? [];
    appointments.value = appointmentsLocked.value
      ? []
      : await fetchAppointments({ date: start.format('YYYY-MM-DD') });
    queueSummary.value = {
      waiting: Number((summaryRes as any)?.waiting ?? 0),
      inService: Number((summaryRes as any)?.inService ?? 0),
      completed: Number((summaryRes as any)?.completed ?? 0),
      noShow: Number((summaryRes as any)?.noShow ?? 0),
    };
    onboardingIncomplete.value = !(onboardingRes?.completed ?? false);
    reviewSmsLocked.value = (reviewRes as ReviewSettingsResponse).locked === true;
    reviewSmsEnabled.value = reviewSmsLocked.value ? false : reviewRes.enabled;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load dashboard';
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const waitingCount = computed(() =>
  queueLocked.value ? 0 : queueSummary.value.waiting,
);
const inServiceCount = computed(() =>
  queueLocked.value ? 0 : queueSummary.value.inService,
);
const completedCount = computed(() =>
  queueLocked.value ? 0 : queueSummary.value.completed,
);
const appointmentsToday = computed(() => (appointmentsLocked.value ? 0 : appointments.value.length));
const terminalAppointmentStatuses = new Set(['COMPLETED', 'NO_SHOW', 'CANCELED']);

const upcomingAppointments = computed(() => {
  const now = nowInBusinessTz(businessTimezone.value);
  return appointments.value.filter((a) => {
    const time = dayjs(a.scheduledAt).tz(businessTimezone.value);
    return !terminalAppointmentStatuses.has(a.status) && time.isAfter(now);
  });
});

const nextAppointment = computed(() => upcomingAppointments.value[0] ?? null);
const appointmentsSoon = computed(() => {
  const now = nowInBusinessTz(businessTimezone.value);
  return upcomingAppointments.value.filter((appointment) => {
    const time = dayjs(appointment.scheduledAt).tz(businessTimezone.value);
    return time.diff(now, 'minute') <= 30;
  });
});

const billingLocked = computed(
  () => queueLocked.value || appointmentsLocked.value || reviewSmsLocked.value,
);

const navigate = (name: string) => {
  router.push({ name });
};

const needsAttention = computed(() => {
  const items: Array<{
    title: string;
    description: string;
    action: () => void;
    actionLabel: string;
    tone: 'danger' | 'warning' | 'info';
  }> = [];
  if (!queueLocked.value && waitingCount.value > 0) {
    items.push({
      title: `${waitingCount.value} customer${waitingCount.value === 1 ? '' : 's'} waiting`,
      description: 'View and manage the live queue.',
      action: () => navigate('admin-queue'),
      actionLabel: 'Fix queue',
      tone: 'danger',
    });
  }
  if (!appointmentsLocked.value && appointmentsSoon.value.length > 0) {
    items.push({
      title: `${appointmentsSoon.value.length} appointment${appointmentsSoon.value.length === 1 ? '' : 's'} in next 30 minutes`,
      description: 'Prep and check in quickly.',
      action: () => navigate('admin-appointments'),
      actionLabel: 'Open schedule',
      tone: 'warning',
    });
  }
  if (!reviewSmsLocked.value && !reviewSmsEnabled.value) {
    items.push({
      title: 'Review SMS is disabled',
      description: 'Turn on review requests after checkout.',
      action: () => navigate('admin-review-sms'),
      actionLabel: 'Enable',
      tone: 'info',
    });
  }
  if (onboardingIncomplete.value) {
    items.push({
      title: 'Finish setup',
      description: 'Complete remaining onboarding steps.',
      action: () => navigate('admin-onboarding'),
      actionLabel: 'Complete',
      tone: 'info',
    });
  }
  return items;
});

const quickActions = [
  {
    title: 'Check in customer',
    label: 'Queue',
    action: () => navigate('admin-queue'),
  },
  {
    title: 'View appointments',
    label: 'Schedule',
    action: () => navigate('admin-appointments'),
  },
  {
    title: 'View customers',
    label: 'CRM',
    action: () => navigate('admin-customers'),
  },
  {
    title: 'Review SMS',
    label: 'Retention',
    action: () => navigate('admin-review-sms'),
  },
] as const;

const attentionToneClass = (tone: 'danger' | 'warning' | 'info') => {
  switch (tone) {
    case 'danger':
      return 'dashboard-attention-card__pill dashboard-attention-card__pill--danger';
    case 'warning':
      return 'dashboard-attention-card__pill dashboard-attention-card__pill--warning';
    default:
      return 'dashboard-attention-card__pill dashboard-attention-card__pill--info';
  }
};
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Today</h1>
      <p class="mt-1 text-sm text-slate-600">One-glance view of what needs attention.</p>
    </div>

    <ElAlert v-if="billingLocked" type="warning" :closable="false">
      <template #title>
        Your trial has ended — activate billing to unlock live queue, SMS, and reminders.
      </template>
      <template #default>
        <div class="flex flex-wrap gap-2">
          <ElButton size="small" type="primary" @click="navigate('admin-billing')">Go to billing</ElButton>
          <ElButton size="small" plain @click="navigate('admin-onboarding')">Complete setup</ElButton>
        </div>
      </template>
    </ElAlert>

    <ElAlert v-if="error" :title="error" type="error" :closable="false" />

    <div v-if="loading" class="space-y-3">
      <ElSkeleton :rows="4" animated />
    </div>

    <div v-else class="space-y-5">
      <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ElCard class="dashboard-surface-card dashboard-hover-card dashboard-stat-card">
          <div class="dashboard-stat-card__label">Appointments today</div>
          <div class="dashboard-stat-card__value">
            {{ appointmentsToday }}
            <span v-if="appointmentsLocked" class="ml-1 text-sm text-slate-400">🔒</span>
          </div>
          <div v-if="appointmentsLocked" class="dashboard-stat-card__meta">
            Activate billing to enable live tracking.
          </div>
        </ElCard>
        <ElCard class="dashboard-surface-card dashboard-hover-card dashboard-stat-card">
          <div class="dashboard-stat-card__label">Checked in</div>
          <div class="dashboard-stat-card__value">
            {{ waitingCount + inServiceCount + completedCount }}
          </div>
        </ElCard>
        <ElCard class="dashboard-surface-card dashboard-hover-card dashboard-stat-card">
          <div class="dashboard-stat-card__label">Waiting</div>
          <div class="dashboard-stat-card__value">{{ waitingCount }}</div>
        </ElCard>
        <ElCard class="dashboard-surface-card dashboard-hover-card dashboard-stat-card">
          <div class="dashboard-stat-card__label">Completed</div>
          <div class="dashboard-stat-card__value">{{ completedCount }}</div>
        </ElCard>
      </div>

      <ElCard v-if="nextAppointment" class="dashboard-surface-card dashboard-hover-card dashboard-next-card">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="space-y-1">
            <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
              Next Appointment
            </div>
            <div class="text-2xl font-semibold text-slate-900">{{ nextAppointment.customerName }}</div>
            <div class="text-sm text-slate-600">
              {{ dayjs(nextAppointment.scheduledAt).tz(businessTimezone).format('MMM D, YYYY h:mm A') }}
              <span class="mx-2 text-slate-300">•</span>
              {{ nextAppointment.serviceName }}
            </div>
          </div>
          <ElButton class="sf-btn" type="primary" @click="navigate('admin-appointments')">
            View appointments
          </ElButton>
        </div>
      </ElCard>

      <div class="space-y-2">
        <div class="text-base font-semibold text-slate-900">Needs attention</div>
        <div
          v-if="needsAttention.length === 0"
          class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
        >
          All clear. You’re ready for the day.
        </div>
        <div v-else class="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ElCard
            v-for="(item, idx) in needsAttention"
            :key="idx"
            class="dashboard-surface-card dashboard-hover-card dashboard-attention-card"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1 pr-2">
                <div class="text-sm font-semibold text-slate-900">{{ item.title }}</div>
                <div class="text-[13px] leading-5 text-slate-600">{{ item.description }}</div>
              </div>
              <span :class="attentionToneClass(item.tone)">Now</span>
            </div>
            <div class="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <span class="text-xs uppercase tracking-[0.16em] text-slate-400">Action</span>
              <button type="button" class="dashboard-inline-action" @click="item.action">
                <span>{{ item.actionLabel }}</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </ElCard>
        </div>
      </div>

      <div class="space-y-2">
        <div>
          <div class="text-base font-semibold text-slate-900">Quick actions</div>
          <div class="text-sm text-slate-600">Jump to common tasks.</div>
        </div>
        <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <button
            v-for="item in quickActions"
            :key="item.title"
            type="button"
            class="dashboard-action-card dashboard-hover-card"
            @click="item.action"
          >
            <div class="dashboard-action-card__label">{{ item.label }}</div>
            <div class="dashboard-action-card__title">{{ item.title }}</div>
            <div class="dashboard-action-card__footer">
              <span>Open</span>
              <span aria-hidden="true">→</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-surface-card,
.dashboard-action-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 1rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.dashboard-surface-card::before,
.dashboard-action-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.3) 42%, rgba(255, 255, 255, 0));
  pointer-events: none;
}

.dashboard-surface-card :deep(.el-card__body) {
  position: relative;
  z-index: 1;
}

.dashboard-hover-card {
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.dashboard-hover-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.1);
}

.dashboard-stat-card :deep(.el-card__body) {
  padding: 0.95rem 1rem;
}

.dashboard-stat-card__label {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
}

.dashboard-stat-card__value {
  margin-top: 0.45rem;
  font-size: 2rem;
  line-height: 1;
  font-weight: 700;
  color: #0f172a;
}

.dashboard-stat-card__meta {
  margin-top: 0.45rem;
  font-size: 0.76rem;
  line-height: 1.35;
  color: #64748b;
}

.dashboard-next-card :deep(.el-card__body) {
  padding: 1rem 1.1rem;
}

.dashboard-attention-card :deep(.el-card__body) {
  padding: 0.9rem 1rem;
}

.dashboard-attention-card__pill {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 700;
}

.dashboard-attention-card__pill--danger {
  background: #fee2e2;
  color: #b91c1c;
}

.dashboard-attention-card__pill--warning {
  background: #fef3c7;
  color: #b45309;
}

.dashboard-attention-card__pill--info {
  background: #e0f2fe;
  color: #0369a1;
}

.dashboard-inline-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: #0f766e;
  transition: color 160ms ease, transform 160ms ease;
}

.dashboard-inline-action:hover {
  color: #115e59;
  transform: translateX(2px);
}

.dashboard-action-card {
  display: flex;
  min-height: 7.25rem;
  flex-direction: column;
  justify-content: space-between;
  text-align: left;
  padding: 0.95rem 1rem;
}

.dashboard-action-card__label {
  position: relative;
  z-index: 1;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
}

.dashboard-action-card__title {
  position: relative;
  z-index: 1;
  margin-top: 0.65rem;
  font-size: 1rem;
  line-height: 1.35;
  font-weight: 700;
  color: #0f172a;
}

.dashboard-action-card__footer {
  position: relative;
  z-index: 1;
  margin-top: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: #0f766e;
}

@media (max-width: 767px) {
  .dashboard-stat-card :deep(.el-card__body),
  .dashboard-next-card :deep(.el-card__body),
  .dashboard-attention-card :deep(.el-card__body) {
    padding: 0.9rem;
  }

  .dashboard-stat-card__value {
    font-size: 1.7rem;
  }

  .dashboard-action-card {
    min-height: 6.4rem;
    padding: 0.9rem;
  }
}
</style>
