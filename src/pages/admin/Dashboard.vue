<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { ElCard, ElButton, ElTag, ElAlert, ElSkeleton } from 'element-plus';
import { fetchQueue, fetchQueueSummary, type QueueItem, type QueueResponse } from '../../api/queue';
import {
  fetchTodayAppointments,
  type TodayAppointment,
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
const appointments = ref<TodayAppointment[]>([]);
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
    appointments.value = appointmentsLocked.value ? [] : (apptRes as any).items ?? [];
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

const upcomingAppointments = computed(() => {
  const now = nowInBusinessTz(businessTimezone.value);
  return appointments.value.filter((a) => {
    const time = dayjs(a.scheduledAt).tz(businessTimezone.value);
    return time.isAfter(now) && time.diff(now, 'minute') <= 30;
  });
});

const billingLocked = computed(
  () => queueLocked.value || appointmentsLocked.value || reviewSmsLocked.value,
);

const needsAttention = computed(() => {
  const items: Array<{ title: string; description: string; action: () => void; type: 'danger' | 'warning' | 'info' }> = [];
  if (!queueLocked.value && waitingCount.value > 0) {
    items.push({
      title: `${waitingCount.value} customer${waitingCount.value === 1 ? '' : 's'} waiting`,
      description: 'View and manage the live queue.',
      action: () => navigate('admin-queue'),
      type: 'danger',
    });
  }
  if (!appointmentsLocked.value && upcomingAppointments.value.length > 0) {
    items.push({
      title: `${upcomingAppointments.value.length} appointment${upcomingAppointments.value.length === 1 ? '' : 's'} in next 30 minutes`,
      description: 'Prep and check in quickly.',
      action: () => navigate('admin-appointments'),
      type: 'warning',
    });
  }
  if (!reviewSmsLocked.value && !reviewSmsEnabled.value) {
    items.push({
      title: 'Review SMS is disabled',
      description: 'Turn on review requests after checkout.',
      action: () => navigate('admin-review-sms'),
      type: 'info',
    });
  }
  if (onboardingIncomplete.value) {
    items.push({
      title: 'Finish setup',
      description: 'Complete remaining onboarding steps.',
      action: () => navigate('admin-onboarding'),
      type: 'info',
    });
  }
  return items;
});

const navigate = (name: string) => {
  router.push({ name });
};
</script>

<template>
  <div class="space-y-6">
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

    <div v-if="loading" class="space-y-4">
      <ElSkeleton :rows="4" animated />
    </div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <ElCard class="bg-white">
          <div class="text-sm text-slate-500">Appointments today</div>
          <div class="mt-2 text-3xl font-semibold text-slate-900">
            {{ appointmentsToday }}
            <span v-if="appointmentsLocked" class="ml-1 text-base text-slate-400">🔒</span>
          </div>
          <div v-if="appointmentsLocked" class="text-xs text-slate-500 mt-1">
            Activate billing to enable live tracking.
          </div>
        </ElCard>
        <ElCard class="bg-white">
          <div class="text-sm text-slate-500">Checked in today</div>
          <div class="mt-2 text-3xl font-semibold text-slate-900">
            {{ waitingCount + inServiceCount + completedCount }}
          </div>
        </ElCard>
        <ElCard class="bg-white">
          <div class="text-sm text-slate-500">Waiting now</div>
          <div class="mt-2 text-3xl font-semibold text-slate-900">{{ waitingCount }}</div>
        </ElCard>
        <ElCard class="bg-white">
          <div class="text-sm text-slate-500">Completed today</div>
          <div class="mt-2 text-3xl font-semibold text-slate-900">{{ completedCount }}</div>
        </ElCard>
      </div>

      <div class="space-y-3">
        <div class="text-base font-semibold text-slate-900">Needs attention</div>
        <div v-if="needsAttention.length === 0" class="text-sm text-slate-500">
          All clear. You’re ready for the day.
        </div>
        <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ElCard
            v-for="(item, idx) in needsAttention"
            :key="idx"
            class="bg-white"
            :body-style="{ padding: '12px 14px' }"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="space-y-1">
                <div class="text-sm font-semibold text-slate-900">{{ item.title }}</div>
                <div class="text-xs text-slate-600">{{ item.description }}</div>
              </div>
              <ElTag :type="item.type" effect="light" size="small">Now</ElTag>
            </div>
            <div class="mt-2">
              <ElButton type="primary" class="sf-btn go-btn" @click="item.action">
                <span>Go</span>
                <span aria-hidden="true">→</span>
              </ElButton>
            </div>
          </ElCard>
        </div>
      </div>

      <ElCard class="bg-white">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div class="text-base font-semibold text-slate-900">Quick actions</div>
            <div class="text-sm text-slate-600">Jump to common tasks.</div>
          </div>
          <div class="flex flex-wrap gap-2">
            <ElButton type="primary" class="sf-btn quick-btn" @click="navigate('admin-queue')">
              <span aria-hidden="true">✅</span>
              <span>Check in customer</span>
            </ElButton>
            <ElButton class="sf-btn quick-btn" @click="navigate('admin-appointments')">
              <span aria-hidden="true">📅</span>
              <span>View appointments</span>
            </ElButton>
            <ElButton class="sf-btn quick-btn" @click="navigate('admin-customers')">
              <span aria-hidden="true">👥</span>
              <span>View customers</span>
            </ElButton>
            <ElButton class="sf-btn quick-btn" @click="navigate('admin-review-sms')">
              <span aria-hidden="true">💬</span>
              <span>Review SMS</span>
            </ElButton>
          </div>
        </div>
      </ElCard>
    </div>
  </div>
</template>
