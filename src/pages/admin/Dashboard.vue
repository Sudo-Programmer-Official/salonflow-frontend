<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import dayjs from 'dayjs';
import { ElCard, ElButton, ElMessage, ElTag, ElAlert, ElSkeleton } from 'element-plus';
import { fetchQueue, type QueueItem } from '../../api/queue';
import { fetchTodayAppointments, type TodayAppointment } from '../../api/appointments';
import { fetchOnboardingStatus } from '../../api/onboarding';
import { fetchReviewSmsSettings } from '../../api/reviewSms';
import { useRouter } from 'vue-router';

const router = useRouter();

const queue = ref<QueueItem[]>([]);
const appointments = ref<TodayAppointment[]>([]);
const onboardingIncomplete = ref(false);
const reviewSmsEnabled = ref(true);

const loading = ref(true);
const error = ref('');

const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [queueRes, apptRes, onboardingRes, reviewRes] = await Promise.all([
      fetchQueue(),
      fetchTodayAppointments(),
      fetchOnboardingStatus(true),
      fetchReviewSmsSettings(),
    ]);
    queue.value = queueRes;
    appointments.value = apptRes;
    onboardingIncomplete.value = !(onboardingRes?.completed ?? false);
    reviewSmsEnabled.value = reviewRes.enabled;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load dashboard';
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const waitingCount = computed(() => queue.value.filter((q) => q.status === 'WAITING').length);
const inServiceCount = computed(() => queue.value.filter((q) => q.status === 'IN_SERVICE').length);
const completedCount = computed(() => queue.value.filter((q) => q.status === 'COMPLETED').length);
const appointmentsToday = computed(() => appointments.value.length);

const upcomingAppointments = computed(() => {
  const now = dayjs();
  return appointments.value.filter((a) => {
    const time = dayjs(a.scheduledAt);
    return time.isAfter(now) && time.diff(now, 'minute') <= 30;
  });
});

const needsAttention = computed(() => {
  const items: Array<{ title: string; description: string; action: () => void; type: 'danger' | 'warning' | 'info' }> = [];
  if (waitingCount.value > 0) {
    items.push({
      title: `${waitingCount.value} customer${waitingCount.value === 1 ? '' : 's'} waiting`,
      description: 'View and manage the live queue.',
      action: () => navigate('admin-queue'),
      type: 'danger',
    });
  }
  if (upcomingAppointments.value.length > 0) {
    items.push({
      title: `${upcomingAppointments.value.length} appointment${upcomingAppointments.value.length === 1 ? '' : 's'} in next 30 minutes`,
      description: 'Prep and check in quickly.',
      action: () => navigate('admin-appointments'),
      type: 'warning',
    });
  }
  if (!reviewSmsEnabled.value) {
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

    <ElAlert v-if="error" :title="error" type="error" :closable="false" />

    <div v-if="loading" class="space-y-4">
      <ElSkeleton :rows="4" animated />
    </div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <ElCard class="bg-white">
          <div class="text-sm text-slate-500">Appointments today</div>
          <div class="mt-2 text-3xl font-semibold text-slate-900">{{ appointmentsToday }}</div>
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
              <ElButton type="primary" size="small" @click="item.action">Go</ElButton>
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
            <ElButton type="primary" plain @click="navigate('admin-queue')">Check in customer</ElButton>
            <ElButton @click="navigate('admin-appointments')">View appointments</ElButton>
            <ElButton @click="navigate('admin-customers')">View customers</ElButton>
            <ElButton @click="navigate('admin-review-sms')">Review SMS</ElButton>
          </div>
        </div>
      </ElCard>
    </div>
  </div>
</template>
