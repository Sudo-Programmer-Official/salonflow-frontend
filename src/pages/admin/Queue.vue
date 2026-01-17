<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { ElCard, ElButton, ElTag, ElMessage, ElDialog, ElSelect, ElOption, ElInput } from 'element-plus';
import {
  fetchQueue,
  startCheckIn,
  checkoutCheckIn,
  callCheckIn,
  markNoShow,
  type QueueItem,
} from '../../api/queue';
import { fetchStaff, type StaffMember } from '../../api/staff';
import {
  fetchTodayAppointments,
  type TodayAppointment,
  type TodayAppointmentsResponse,
} from '../../api/appointments';
import { fetchServices, type ServiceOption, createPublicCheckIn } from '../../api/checkins';

const queue = ref<QueueItem[]>([]);
const queueLocked = ref(false);
const loading = ref(false);
const actionLoading = ref<string | null>(null);
const checkoutOpen = ref(false);
const checkoutAmount = ref<string>('');
const checkoutConsent = ref(true);
const checkoutTarget = ref<string | null>(null);
const checkoutServedBy = ref<string | null>(null);
const checkoutRedeem = ref(false);
const checkoutAmountRef = ref<InstanceType<typeof ElInput> | null>(null);
const currentCheckoutItem = computed(() =>
  checkoutTarget.value ? queue.value.find((q) => q.id === checkoutTarget.value) : null,
);
const canRedeem = computed(() => (currentCheckoutItem.value?.pointsBalance ?? 0) >= 300);
const staff = ref<StaffMember[]>([]);
const loadingStaff = ref(false);
const todayAppointments = ref<TodayAppointment[]>([]);
const todayAppointmentsLocked = ref(false);
const loadingAppointments = ref(false);
const activeTab = ref<'WAITING' | 'IN_SERVICE' | 'COMPLETED'>('WAITING');
const services = ref<ServiceOption[]>([]);
const loadingServices = ref(false);
const checkinOpen = ref(false);
const checkinName = ref('');
const checkinPhone = ref('');
const checkinServiceId = ref('');
const checkinPrefillService = ref('');

const loadQueue = async () => {
  loading.value = true;
  try {
    const res = await fetchQueue();
    queueLocked.value = (res as any).locked === true;
    queue.value = queueLocked.value ? [] : ((res as any).items ?? []);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load queue');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadQueue();
  loadStaff();
  loadAppointments();
  loadServices();
  startPolling();
  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('focus', handleFocus);
});

onBeforeUnmount(() => {
  stopPolling();
  document.removeEventListener('visibilitychange', handleVisibility);
  window.removeEventListener('focus', handleFocus);
});

const handleAction = async (id: string, action: () => Promise<unknown>) => {
  actionLoading.value = id;
  try {
    await action();
    await loadQueue();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Action failed');
  } finally {
    actionLoading.value = null;
  }
};

const statusLabel = (status: QueueItem['status']) => {
  if (status === 'CALLED') return 'Called';
  if (status === 'IN_SERVICE') return 'In Service';
  if (status === 'WAITING') return 'Waiting';
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'NO_SHOW') return 'No Show';
  if (status === 'CANCELED') return 'Canceled';
  return status;
};

const statusType = (status: QueueItem['status']) => {
  if (status === 'CALLED') return 'warning';
  if (status === 'IN_SERVICE') return 'warning';
  if (status === 'WAITING') return 'info';
  if (status === 'COMPLETED') return 'success';
  if (status === 'NO_SHOW') return 'danger';
  if (status === 'CANCELED') return 'danger';
  return 'info';
};

const tabFilters: Record<typeof activeTab.value, QueueItem['status'][]> = {
  WAITING: ['WAITING', 'CALLED'],
  IN_SERVICE: ['IN_SERVICE'],
  COMPLETED: ['COMPLETED', 'NO_SHOW', 'CANCELED'],
};

const filteredQueue = computed(() =>
  queue.value
    .filter((item) => tabFilters[activeTab.value].includes(item.status))
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
);

const elapsed = (item: QueueItem) => {
  const start = item.calledAt || item.createdAt;
  if (!start) return '';
  const diffMs = Date.now() - new Date(start).getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes <= 0) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return `${hours}h ${rem}m ago`;
};

const openCheckout = (id: string) => {
  checkoutTarget.value = id;
  checkoutAmount.value = '';
  checkoutConsent.value = true;
  checkoutServedBy.value = null;
  checkoutRedeem.value = false;
  checkoutOpen.value = true;
};

const loadStaff = async () => {
  loadingStaff.value = true;
  try {
    staff.value = await fetchStaff();
  } catch {
    staff.value = [];
  } finally {
    loadingStaff.value = false;
  }
};

const activeStaffNames = computed(() =>
  staff.value.filter((s) => s.status === 'active').map((s) => s.name),
);

const loadAppointments = async () => {
  loadingAppointments.value = true;
  try {
    const res = await fetchTodayAppointments();
    todayAppointmentsLocked.value = (res as TodayAppointmentsResponse).locked === true;
    todayAppointments.value = todayAppointmentsLocked.value ? [] : ((res as any).items ?? []);
  } catch {
    todayAppointments.value = [];
    todayAppointmentsLocked.value = false;
  } finally {
    loadingAppointments.value = false;
  }
};

const loadServices = async () => {
  loadingServices.value = true;
  try {
    services.value = await fetchServices();
  } catch {
    services.value = [];
  } finally {
    loadingServices.value = false;
  }
};

const openCheckinModal = (appt?: TodayAppointment) => {
  checkinName.value = appt?.customerName || '';
  checkinPhone.value = appt?.phoneE164 || '';
  checkinServiceId.value = appt?.serviceName
    ? services.value.find((s) => s.name === appt.serviceName)?.id || ''
    : '';
  checkinPrefillService.value = appt?.serviceName || '';
  checkinOpen.value = true;
};

const submitCheckin = async () => {
  if (!checkinName.value.trim() || !checkinPhone.value.trim()) {
    ElMessage.warning('Name and phone are required');
    return;
  }
  try {
    await createPublicCheckIn({
      name: checkinName.value.trim(),
      phoneE164: checkinPhone.value.trim(),
      serviceId: checkinServiceId.value || undefined,
    });
    checkinOpen.value = false;
    checkinServiceId.value = '';
    checkinPrefillService.value = '';
    await Promise.all([loadQueue(), loadAppointments()]);
    ElMessage.success('Checked in');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to check in');
  }
};

const submitCheckout = async () => {
  if (!checkoutTarget.value) return;
  actionLoading.value = checkoutTarget.value;
  try {
    const rawAmount = checkoutAmount.value;
    const normalized =
      typeof rawAmount === 'string' ? rawAmount.trim() : rawAmount ?? '';
    const amount =
      normalized === '' ? null : Number(normalized);
    if (amount === null) {
      throw new Error('Amount is required');
    }
    if (Number.isNaN(amount)) {
      throw new Error('Amount must be a number');
    }
    await checkoutCheckIn(checkoutTarget.value, {
      amountPaid: amount,
      reviewSmsConsent: checkoutConsent.value,
      servedByName: checkoutServedBy.value || null,
      redeemPoints: checkoutRedeem.value,
    });
    checkoutOpen.value = false;
    await loadQueue();
    ElMessage.success('Checkout completed');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Checkout failed');
  } finally {
    actionLoading.value = null;
  }
};

const pollId = ref<number | null>(null);

const startPolling = () => {
  if (pollId.value !== null) return;
  pollId.value = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadQueue();
      loadAppointments();
    }
  }, 5000);
};

const stopPolling = () => {
  if (pollId.value !== null) {
    clearInterval(pollId.value);
    pollId.value = null;
  }
};

const handleVisibility = () => {
  if (document.visibilityState === 'visible') {
    loadQueue();
    loadAppointments();
  }
};

const handleFocus = () => {
  loadQueue();
  loadAppointments();
};

watch(checkoutOpen, async (open) => {
  if (open) {
    await nextTick();
    checkoutAmountRef.value?.focus();
  }
});
</script>

<template>
  <div class="space-y-4">
    <div class="mb-2">
      <h1 class="text-xl font-semibold text-slate-900">Today’s Queue</h1>
      <p class="text-sm text-slate-600">Live queue with quick actions. Staff view is read-only.</p>
    </div>

    <ElCard v-if="queueLocked" class="bg-white border-amber-200">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="text-sm font-semibold text-slate-900">Live queue unlocks after billing is activated.</div>
          <div class="text-xs text-slate-600">Activate billing to track waiting, in-service, and completed visits.</div>
        </div>
        <ElButton type="primary" @click="$router.push({ name: 'admin-billing' })">Go to billing</ElButton>
      </div>
    </ElCard>

    <ElCard class="bg-white" :loading="loadingAppointments">
      <div class="mb-2 flex items-center justify-between">
        <div>
          <div class="text-base font-semibold text-slate-900">Today’s Appointments</div>
          <div class="text-xs text-slate-600">Check in quickly without retyping.</div>
        </div>
      </div>
      <div class="space-y-2">
        <div
          v-for="appt in todayAppointments"
          :key="appt.id"
          class="flex flex-col gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="text-sm text-slate-900">
            <span class="font-semibold">{{ appt.customerName }}</span>
            <span class="text-slate-600"> · {{ appt.phoneE164 }}</span>
            <div class="text-xs text-slate-600">Service: {{ appt.serviceName }}</div>
          </div>
          <div class="flex items-center gap-2">
            <ElTag size="small" effect="light">📅 {{ appt.scheduledAt.slice(11, 16) }}</ElTag>
            <ElButton size="small" type="primary" plain @click="openCheckinModal(appt)">Check in</ElButton>
          </div>
        </div>
        <div v-if="!loadingAppointments && todayAppointments.length === 0" class="text-xs text-slate-500">
          <span v-if="queueLocked || todayAppointmentsLocked">Appointments visible after billing activation.</span>
          <span v-else>No appointments for today.</span>
        </div>
      </div>
    </ElCard>

    <div class="mb-2 flex items-center justify-between">
      <div class="text-base font-semibold text-slate-900">Queue</div>
      <el-tabs v-model="activeTab" class="w-full max-w-md justify-end" stretch>
        <el-tab-pane label="Waiting" name="WAITING" />
        <el-tab-pane label="In Service" name="IN_SERVICE" />
        <el-tab-pane label="Completed" name="COMPLETED" />
      </el-tabs>
    </div>

    <div v-if="queueLocked" class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      Billing required to use queue. Activate to resume live queue.
    </div>

    <div v-else-if="filteredQueue.length === 0" class="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
      No guests in this state.
    </div>

    <div v-else class="grid gap-3 queue-grid">
      <ElCard
        v-for="item in filteredQueue"
        :key="item.id"
        shadow="hover"
        class="border border-slate-100"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
              {{ (item.customerName || '?').charAt(0).toUpperCase() }}
            </div>
            <div class="space-y-1">
              <div class="text-sm font-semibold text-slate-900">
                {{ item.customerName || 'Unknown' }}
              </div>
              <div class="flex items-center gap-1 text-xs text-slate-600">
                <span>📞</span>
                <span>{{ item.customerPhone || '—' }}</span>
              </div>
              <div class="text-xs text-slate-600">
                {{ item.serviceName || 'No service selected' }}
              </div>
              <div class="text-xs text-slate-600">
                Points: {{ item.pointsBalance ?? 0 }}
              </div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1">
            <ElTag :type="statusType(item.status)" effect="light">
              {{ statusLabel(item.status) }}
            </ElTag>
            <ElTag v-if="item.customerType" effect="plain" size="small">
              {{ item.customerType === 'VIP' ? 'VIP' : item.customerType === 'SECOND_TIME' ? '2nd-time' : 'Regular' }}
            </ElTag>
          </div>
        </div>
        <div class="text-xs text-slate-500">
          {{ elapsed(item) }}
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          <ElButton
            v-if="item.status === 'WAITING'"
            size="small"
            type="primary"
            :loading="actionLoading === item.id"
            @click="handleAction(item.id, () => callCheckIn(item.id))"
          >
            Call Next
          </ElButton>
          <template v-else-if="item.status === 'CALLED'">
            <ElButton
              size="small"
              type="success"
              :loading="actionLoading === item.id"
              @click="handleAction(item.id, () => startCheckIn(item.id))"
            >
              Mark In Service
            </ElButton>
            <ElButton
              size="small"
              type="danger"
              plain
              :loading="actionLoading === `${item.id}-no-show`"
              @click="handleAction(`${item.id}-no-show`, () => markNoShow(item.id))"
            >
              No Show
            </ElButton>
          </template>
          <ElButton
            v-else-if="item.status === 'IN_SERVICE'"
            size="small"
            type="primary"
            :loading="actionLoading === item.id"
            @click="openCheckout(item.id)"
          >
            Complete
          </ElButton>
        </div>
      </ElCard>
    </div>

    <div v-if="!loading && queue.length === 0" class="text-center text-sm text-slate-500">
      <span v-if="queueLocked">Queue is locked until billing is activated.</span>
      <span v-else>No active check-ins.</span>
    </div>

    <ElDialog v-model="checkoutOpen" title="Checkout" width="360px">
      <div class="space-y-3">
        <div class="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
          Points available: {{ currentCheckoutItem?.pointsBalance ?? 0 }}
        </div>
        <div>
          <label class="text-sm font-medium text-slate-800">Amount Paid</label>
          <input
            v-model="checkoutAmount"
            type="number"
            min="0"
            class="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
            placeholder="e.g. 75.00"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-800">Served by (optional)</label>
          <ElSelect
            v-model="checkoutServedBy"
            placeholder="Select staff"
            clearable
            filterable
            :loading="loadingStaff"
            class="mt-1 w-full"
          >
            <ElOption
              v-for="name in activeStaffNames"
              :key="name"
              :label="name"
              :value="name"
            />
          </ElSelect>
        </div>
        <label class="flex items-center gap-2 text-sm text-slate-800">
          <input type="checkbox" v-model="checkoutConsent" class="h-4 w-4" />
          Ask for Google review (send SMS)
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-800">
          <input type="checkbox" v-model="checkoutRedeem" class="h-4 w-4" :disabled="!canRedeem" />
          Redeem 300 points on this visit
        </label>
        <div class="flex justify-end gap-2">
          <ElButton @click="checkoutOpen = false">Cancel</ElButton>
          <ElButton type="primary" :loading="actionLoading === checkoutTarget" @click="submitCheckout">
            Complete checkout
          </ElButton>
        </div>
      </div>
    </ElDialog>

    <ElDialog v-model="checkinOpen" title="Check In" width="380px">
      <div class="space-y-3">
        <div>
          <label class="text-sm font-medium text-slate-800">Name</label>
          <ElInput v-model="checkinName" placeholder="Customer name" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-800">Phone</label>
          <ElInput v-model="checkinPhone" placeholder="+1 555 123 4567" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-800">Service (optional)</label>
          <ElSelect
            v-model="checkinServiceId"
            placeholder="Select service"
            clearable
            filterable
            :loading="loadingServices"
          >
            <ElOption v-for="svc in services" :key="svc.id" :label="svc.name" :value="svc.id" />
          </ElSelect>
          <div v-if="checkinPrefillService && !checkinServiceId" class="text-xs text-slate-500 mt-1">
            Prefilled from appointment: {{ checkinPrefillService }}
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <ElButton @click="checkinOpen = false">Cancel</ElButton>
          <ElButton type="primary" @click="submitCheckin">Check in</ElButton>
        </div>
      </div>
    </ElDialog>
  </div>
</template>

<style scoped>
.queue-grid {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}
</style>
