<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import {
  ElCard,
  ElButton,
  ElTag,
  ElMessage,
  ElDialog,
  ElSelect,
  ElOption,
  ElInput,
  ElTooltip,
} from 'element-plus';
import {
  fetchQueue,
  fetchQueueSummary,
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
import { searchCustomers, sendCustomerReminder } from '../../api/customers';

const PAGE_SIZE = 10;

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
const checkoutServices = ref<Array<{ name: string; priceCents: number | null }>>([]);
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
const sendingMap = ref<Record<string, boolean>>({});
const activeTab = ref<'WAITING' | 'IN_SERVICE' | 'COMPLETED'>('WAITING');
const waitingPage = ref(1);
const inServicePage = ref(1);
const completedPage = ref(1);
const isRefreshing = ref(false);
const queueCounts = ref<{ waiting: number; inService: number; completed: number; noShow: number }>({
  waiting: 0,
  inService: 0,
  completed: 0,
  noShow: 0,
});
const dateFilter = ref<'today' | 'yesterday' | 'last7' | 'last30'>(
  (localStorage.getItem('queueCompletedRange') as any) || 'today',
);
const completedItems = ref<QueueItem[]>([]);
const completedCursor = ref<string | null>(null);
const completedHasMore = ref(false);
const completedLoading = ref(false);
const services = ref<ServiceOption[]>([]);
const loadingServices = ref(false);
const checkinOpen = ref(false);
const checkinName = ref('');
const checkinPhone = ref('');
const checkinServiceId = ref('');
const checkinPrefillService = ref('');
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
const activeCheckinAppt = ref<TodayAppointment | null>(null);

const dateRange = computed(() => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  switch (dateFilter.value) {
    case 'yesterday': {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    }
    case 'last7': {
      start.setDate(start.getDate() - 6);
      break;
    }
    case 'last30': {
      start.setDate(start.getDate() - 29);
      break;
    }
    default:
      break;
  }
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
});

const loadQueue = async (opts?: { loadMoreCompleted?: boolean; silent?: boolean }) => {
  const silent = opts?.silent === true;
  if (!silent) {
    loading.value = !opts?.loadMoreCompleted;
    if (activeTab.value === 'COMPLETED' && opts?.loadMoreCompleted) {
      completedLoading.value = true;
    }
  } else {
    isRefreshing.value = true;
  }
  try {
    const params: any = {};
    if (activeTab.value === 'WAITING') {
      params.status = 'WAITING';
      params.limit = 50;
    } else if (activeTab.value === 'IN_SERVICE') {
      params.status = 'IN_SERVICE';
      params.limit = 50;
    } else if (activeTab.value === 'COMPLETED') {
      params.status = 'COMPLETED';
      params.limit = PAGE_SIZE;
      params.cursor = opts?.loadMoreCompleted ? completedCursor.value || deriveCompletedCursor() : null;
      params.from = dateRange.value.from;
      params.to = dateRange.value.to;
    }
    const res = await fetchQueue(params);
    queueLocked.value = (res as any).locked === true;
    if (queueLocked.value) {
      queue.value = [];
      completedItems.value = [];
      completedCursor.value = null;
      completedHasMore.value = false;
      return;
    }
    const items = ((res as any).items ?? []) as QueueItem[];
    if (activeTab.value === 'COMPLETED') {
      if (!opts?.loadMoreCompleted) {
        if (opts?.silent && completedItems.value.length) {
          const incomingIds = new Set(items.map((i) => i.id));
          const preserved = completedItems.value.filter((i) => !incomingIds.has(i.id));
          completedItems.value = [...items, ...preserved];
        } else {
          completedItems.value = items;
          completedPage.value = 1;
        }
      } else {
        const existingIds = new Set(completedItems.value.map((i) => i.id));
        const appended = items.filter((i) => !existingIds.has(i.id));
        completedItems.value = [...completedItems.value, ...appended];
      }
      const next = (res as any).nextCursor ?? deriveCompletedCursor();
      completedCursor.value = next;
      const hasMoreFromResponse = (res as any).hasMore;
      completedHasMore.value =
        hasMoreFromResponse !== undefined
          ? Boolean(hasMoreFromResponse)
          : Boolean(next && items.length >= PAGE_SIZE);
    } else {
      queue.value = items;
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load queue');
  } finally {
    if (!silent) {
      loading.value = false;
      completedLoading.value = false;
    }
    isRefreshing.value = false;
  }
};

const loadCounts = async () => {
  try {
    const summary = await fetchQueueSummary({
      from: dateRange.value.from,
      to: dateRange.value.to,
    });
    queueCounts.value = summary;
  } catch {
    // ignore
  }
};

onMounted(() => {
  loadQueue();
  loadCounts();
  loadStaff();
  loadAppointments();
  loadServices();
  startPolling();
  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
});

onBeforeUnmount(() => {
  stopPolling();
  document.removeEventListener('visibilitychange', handleVisibility);
  window.removeEventListener('focus', handleFocus);
  window.removeEventListener('online', updateOnline);
  window.removeEventListener('offline', updateOnline);
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

const waitingItems = computed(() =>
  queue.value
    .filter((item) => item.status === 'WAITING' || item.status === 'CALLED')
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
);

const inServiceItems = computed(() =>
  queue.value
    .filter((item) => item.status === 'IN_SERVICE')
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
);

const completedList = computed(() => completedItems.value);
const expectedCompletedPages = computed(() =>
  Math.max(1, Math.ceil(queueCounts.value.completed / PAGE_SIZE)),
);

const totalPagesWaiting = computed(() => Math.max(1, Math.ceil(waitingItems.value.length / PAGE_SIZE)));
const totalPagesInService = computed(() => Math.max(1, Math.ceil(inServiceItems.value.length / PAGE_SIZE)));
const totalPagesCompleted = computed(() => {
  const loadedPages = Math.max(1, Math.ceil(completedList.value.length / PAGE_SIZE));
  const paddedPages = completedHasMore.value ? loadedPages + 1 : loadedPages;
  return Math.max(paddedPages, expectedCompletedPages.value);
});

const activePage = computed(() => {
  if (activeTab.value === 'WAITING') return waitingPage.value;
  if (activeTab.value === 'IN_SERVICE') return inServicePage.value;
  return completedPage.value;
});

const totalPages = computed(() => {
  if (activeTab.value === 'WAITING') return totalPagesWaiting.value;
  if (activeTab.value === 'IN_SERVICE') return totalPagesInService.value;
  return totalPagesCompleted.value;
});

const displayedQueue = computed(() => {
  const list =
    activeTab.value === 'WAITING'
      ? waitingItems.value
      : activeTab.value === 'IN_SERVICE'
      ? inServiceItems.value
      : completedList.value;
  const total = totalPages.value || 1;
  const pageRef =
    activeTab.value === 'WAITING'
      ? waitingPage
      : activeTab.value === 'IN_SERVICE'
      ? inServicePage
      : completedPage;
  if (pageRef.value > total) pageRef.value = total;
  const start = (pageRef.value - 1) * PAGE_SIZE;
  return list.slice(start, start + PAGE_SIZE);
});

const isQueueEmpty = computed(() => {
  if (activeTab.value === 'WAITING') return waitingItems.value.length === 0;
  if (activeTab.value === 'IN_SERVICE') return inServiceItems.value.length === 0;
  return completedList.value.length === 0;
});

const sendReminderForAppointment = async (appt: TodayAppointment) => {
  if (!isOnline.value) {
    ElMessage.warning('Available when online');
    return;
  }
  sendingMap.value = { ...sendingMap.value, [appt.id]: true };
  try {
    const matches = await searchCustomers(appt.phoneE164);
    const customer = matches.find((c) => c.phoneE164 === appt.phoneE164);
    if (!customer) throw new Error('Customer not found');
    if (!customer.reviewSmsConsent) {
      ElMessage.warning('Consent required');
      return;
    }
    await sendCustomerReminder(customer.id);
    ElMessage.success('Reminder sent');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to send reminder');
  } finally {
    sendingMap.value = { ...sendingMap.value, [appt.id]: false };
  }
};

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
  const targetItem = queue.value.find((q) => q.id === id);
  const svcName = targetItem?.serviceName || '';
  const matchedService = services.value.find((s) => s.name === svcName);
  const priceCents = matchedService?.priceCents ?? null;
  checkoutServices.value = svcName ? [{ name: svcName, priceCents }] : [];
  if (priceCents !== null && priceCents !== undefined) {
    checkoutAmount.value = (priceCents / 100).toFixed(2);
  }
  checkoutOpen.value = true;
};

const loadStaff = async () => {
  loadingStaff.value = true;
  try {
    const res = await fetchStaff();
    staff.value = res.items;
  } catch {
    staff.value = [];
  } finally {
    loadingStaff.value = false;
  }
};

const activeStaffNames = computed(() =>
  staff.value.filter((s) => s.active).map((s) => s.nickname || s.name),
);

const singleStaffName = computed(() => {
  const names = todayAppointments.value
    .map((a) => a.staffName)
    .filter((n): n is string => Boolean(n));
  const unique = Array.from(new Set(names));
  return unique.length === 1 ? unique[0] : null;
});

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

const changeDateFilter = (val: 'today' | 'yesterday' | 'last7' | 'last30') => {
  dateFilter.value = val;
  localStorage.setItem('queueCompletedRange', val);
  completedItems.value = [];
  completedCursor.value = null;
  completedHasMore.value = false;
  loadQueue();
  loadCounts();
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
  activeCheckinAppt.value = appt ?? null;
  checkinName.value = appt?.customerName || '';
  checkinPhone.value = appt?.phoneE164 || '';
  checkinServiceId.value = appt?.serviceName
    ? services.value.find((s) => s.name === appt.serviceName)?.id || ''
    : '';
  checkinPrefillService.value = appt?.serviceName || '';
  checkinOpen.value = true;
};

const submitCheckin = async (appt?: TodayAppointment) => {
  if (!checkinName.value.trim() || !checkinPhone.value.trim()) {
    ElMessage.warning('Name and phone are required');
    return;
  }
  try {
    await createPublicCheckIn({
      name: checkinName.value.trim(),
      phoneE164: checkinPhone.value.trim(),
      serviceId: checkinServiceId.value || undefined,
      appointmentId: appt?.id ?? activeCheckinAppt.value?.id,
    });
    checkinOpen.value = false;
    checkinServiceId.value = '';
    checkinPrefillService.value = '';
    if (appt) {
      appt.status = 'CHECKED_IN';
    } else if (activeCheckinAppt.value) {
      activeCheckinAppt.value.status = 'CHECKED_IN';
    }
    activeCheckinAppt.value = null;
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
      loadQueue({ silent: true });
      loadCounts();
      loadAppointments();
    }
  }, 30000);
};

const stopPolling = () => {
  if (pollId.value !== null) {
    clearInterval(pollId.value);
    pollId.value = null;
  }
};

const handleVisibility = () => {
  if (document.visibilityState === 'visible') {
    loadQueue({ silent: true });
    loadCounts();
    loadAppointments();
  }
};

const handleFocus = () => {
  loadQueue({ silent: true });
  loadCounts();
  loadAppointments();
};

watch(checkoutOpen, async (open) => {
  if (open) {
    await nextTick();
    checkoutAmountRef.value?.focus();
  }
});

watch(activeTab, () => {
  if (activeTab.value === 'COMPLETED') {
    completedItems.value = [];
    completedCursor.value = null;
    completedHasMore.value = false;
    completedPage.value = 1;
  }
  if (activeTab.value === 'WAITING') waitingPage.value = 1;
  if (activeTab.value === 'IN_SERVICE') inServicePage.value = 1;
  loadQueue();
  loadCounts();
});

function updateOnline() {
  isOnline.value = typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function deriveCompletedCursor() {
  const last = completedItems.value[completedItems.value.length - 1];
  return last?.completedAt ? `${last.completedAt}|${last.id}` : null;
}

const ensureCompletedDataForPage = async (targetPage: number) => {
  const neededEnd = targetPage * PAGE_SIZE;
  let safety = 0;

  while (
    completedItems.value.length < neededEnd &&
    (completedHasMore.value || completedItems.value.length < queueCounts.value.completed)
  ) {
    const before = completedItems.value.length;
    const cursor = completedCursor.value || deriveCompletedCursor();
    if (!cursor) break;
    completedCursor.value = cursor;
    await loadQueue({ loadMoreCompleted: true });
    safety += 1;
    if (completedItems.value.length <= before) break;
    if (safety > 5) break;
  }
};

const changePage = async (direction: 'prev' | 'next') => {
  const target =
    activePage.value + (direction === 'next' ? 1 : -1);
  await goToPage(target);
};

const goToPage = async (page: number) => {
  const clamped = Math.max(1, page);
  if (activeTab.value === 'COMPLETED') {
    await ensureCompletedDataForPage(clamped);
    const total = totalPages.value || 1;
    completedPage.value = Math.min(clamped, total);
  } else if (activeTab.value === 'WAITING') {
    waitingPage.value = Math.min(Math.max(1, clamped), totalPagesWaiting.value || 1);
  } else if (activeTab.value === 'IN_SERVICE') {
    inServicePage.value = Math.min(Math.max(1, clamped), totalPagesInService.value || 1);
  }
};

watch(waitingItems, () => {
  if (waitingPage.value > totalPagesWaiting.value) waitingPage.value = totalPagesWaiting.value || 1;
});

watch(inServiceItems, () => {
  if (inServicePage.value > totalPagesInService.value) inServicePage.value = totalPagesInService.value || 1;
});

watch(completedList, () => {
  if (completedPage.value > totalPagesCompleted.value) completedPage.value = totalPagesCompleted.value || 1;
});

watch(completedPage, async (val) => {
  await ensureCompletedDataForPage(val);
});
</script>

<template>
  <div class="flex h-full flex-col space-y-4">
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
      <div class="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="text-base font-semibold text-slate-900">
            Today’s Appointments
            <span v-if="singleStaffName" class="text-sm font-normal text-slate-600">
              — Staff: {{ singleStaffName }}
            </span>
          </div>
          <div class="text-xs text-slate-600">Check in quickly without retyping.</div>
        </div>
        <div class="text-xs font-medium" :class="isOnline ? 'text-emerald-600' : 'text-amber-600'">
          <span v-if="isOnline">🟢 Online</span>
          <span v-else>⚪ Offline mode</span>
        </div>
      </div>
      <div class="appointment-list space-y-2">
        <div v-if="todayAppointmentsLocked" class="text-xs text-slate-600">
          Appointments visible after billing activation.
        </div>
        <div
          v-for="appt in todayAppointments"
          :key="appt.id"
          class="rounded-md border border-slate-200 bg-slate-50 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2 text-sm text-slate-900">
                <span class="font-semibold">👤 {{ appt.customerName }}</span>
                <span class="flex items-center gap-1 text-slate-700">
                  📞 <span>{{ appt.phoneE164 }}</span>
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                <span>💇 {{ appt.serviceName || 'No service' }}</span>
                <span>🕒 {{ appt.scheduledAt.slice(11, 16) }}</span>
                <span class="flex items-center gap-1">
                  👩‍🎨
                  <span>{{ appt.staffName || 'Unassigned' }}</span>
                </span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <template v-if="appt.status === 'BOOKED'">
                <ElButton size="small" type="primary" @click="openCheckinModal(appt)">Check in</ElButton>
              </template>
              <ElTag v-else effect="plain" type="success" size="small">Checked in</ElTag>
              <ElTooltip v-if="!isOnline" content="Available when online">
                <span>
                  <ElButton
                    size="small"
                    plain
                    :disabled="!isOnline"
                    :loading="sendingMap[appt.id]"
                    @click="sendReminderForAppointment(appt)"
                  >
                    Reminder
                  </ElButton>
                </span>
              </ElTooltip>
              <ElButton
                v-else
                size="small"
                plain
                :loading="sendingMap[appt.id]"
                @click="sendReminderForAppointment(appt)"
              >
                Reminder
              </ElButton>
              <ElTooltip content="Send feedback after checkout">
                <span>
                  <ElButton size="small" plain disabled>
                    Feedback
                  </ElButton>
                </span>
              </ElTooltip>
            </div>
          </div>
        </div>
        <div v-if="!loadingAppointments && todayAppointments.length === 0" class="text-xs text-slate-500">
          <span v-if="todayAppointmentsLocked">Appointments visible after billing activation.</span>
          <span v-else>No appointments for today.</span>
        </div>
      </div>
    </ElCard>

    <div class="queue-toolbar">
      <div class="flex items-center gap-2">
        <div class="text-base font-semibold text-slate-900">Queue</div>
        <span v-if="isRefreshing" class="text-xs text-slate-500 animate-pulse">Updating…</span>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div v-if="activeTab === 'COMPLETED'" class="flex items-center gap-2">
          <span class="text-xs text-slate-600">Date range</span>
          <ElSelect
            v-model="dateFilter"
            size="small"
            class="w-36"
            @change="(v: any) => changeDateFilter(v)"
          >
            <ElOption label="Today" value="today" />
            <ElOption label="Yesterday" value="yesterday" />
            <ElOption label="Last 7 days" value="last7" />
            <ElOption label="Last 30 days" value="last30" />
          </ElSelect>
        </div>
        <el-tabs v-model="activeTab" class="queue-tabs" stretch>
          <el-tab-pane :label="`Waiting (${queueCounts.waiting})`" name="WAITING" />
          <el-tab-pane :label="`In Service (${queueCounts.inService})`" name="IN_SERVICE" />
          <el-tab-pane :label="`Completed (${queueCounts.completed})`" name="COMPLETED" />
        </el-tabs>
      </div>
    </div>

    <div v-if="queueLocked" class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      Billing required to use queue. Activate to resume live queue.
    </div>

    <div
      v-else-if="(loading && activeTab !== 'COMPLETED') || (activeTab === 'COMPLETED' && completedLoading && !completedItems.length)"
      class="grid gap-3 queue-grid"
    >
      <div v-for="n in 4" :key="n" class="h-32 rounded-md border border-slate-100 bg-slate-50 animate-pulse" />
    </div>

    <div v-else-if="isQueueEmpty" class="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
      No guests in this state.
    </div>

    <div v-else class="queue-scroll flex-1">
      <div class="grid gap-3 queue-grid">
        <ElCard
          v-for="item in displayedQueue"
          :key="item.id"
          shadow="hover"
          class="border border-slate-100"
        >
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
              {{ (item.customerName || '?').charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div class="text-sm font-semibold text-slate-900">
                  {{ item.customerName || 'Unknown' }}
                </div>
                <div class="flex items-center gap-1">
                  <ElTag :type="statusType(item.status)" effect="light">
                    {{ statusLabel(item.status) }}
                  </ElTag>
                  <ElTag v-if="item.customerType" effect="plain" size="small">
                    {{ item.customerType === 'VIP' ? 'VIP' : item.customerType === 'SECOND_TIME' ? '2nd-time' : 'Regular' }}
                  </ElTag>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-3 text-xs text-slate-700">
                <div class="flex items-center gap-1">
                  ✂️
                  <span>{{ item.serviceName || 'No service selected' }}</span>
                </div>
                <div v-if="item.servedByName" class="flex items-center gap-1">
                  👤
                  <span>{{ item.servedByName }}</span>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span class="flex items-center gap-1">📞 {{ item.customerPhone || '—' }}</span>
              </div>
            </div>
          </div>
          <div class="mt-3 flex items-center justify-between text-xs text-slate-600">
            <div class="flex items-center gap-1">⏱ {{ elapsed(item) }}</div>
            <div class="flex items-center gap-1 text-slate-700">
              💎 <span class="font-semibold">{{ item.pointsBalance ?? 0 }}</span>
            </div>
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
      <div class="pagination-footer">
        <ElButton size="small" plain :disabled="activePage <= 1" @click="goToPage(1)">«</ElButton>
        <ElButton size="small" plain :disabled="activePage <= 1" @click="changePage('prev')">Prev</ElButton>
        <div class="page-indicator">Page {{ activePage }} of {{ totalPages }}</div>
        <ElButton
          size="small"
          plain
          :disabled="activePage >= totalPages"
          :loading="activeTab === 'COMPLETED' && completedLoading && activePage > 1"
          @click="changePage('next')"
        >
          Next
        </ElButton>
      </div>
    </div>

    <div
      v-if="!loading && queue.length === 0 && completedItems.length === 0"
      class="text-center text-sm text-slate-500"
    >
      <span v-if="queueLocked">Queue is locked until billing is activated.</span>
      <span v-else>No active check-ins.</span>
    </div>

    <ElDialog v-model="checkoutOpen" title="Checkout" width="520px" class="checkout-modal">
      <div class="space-y-3 checkout-body">
        <div class="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
          Points available: {{ currentCheckoutItem?.pointsBalance ?? 0 }}
        </div>
        <div class="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 space-y-2">
          <div class="text-xs font-semibold text-slate-700">Services (from check-in)</div>
          <div v-if="checkoutServices.length" class="flex flex-wrap gap-2">
            <div
              v-for="svc in checkoutServices"
              :key="svc.name"
              class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm"
            >
              <span class="text-base">💅</span>
              <span class="text-sm font-semibold">{{ svc.name }}</span>
              <span v-if="svc.priceCents !== null" class="text-xs text-slate-600">
                {{
                  Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                  }).format((svc.priceCents ?? 0) / 100)
                }}
              </span>
            </div>
          </div>
          <div v-else class="text-xs text-slate-600">Services will be confirmed at the counter.</div>
          <div v-if="checkoutServices.length && checkoutServices.some((s) => s.priceCents !== null)" class="text-xs text-slate-600">
            Subtotal {{
              Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(
                checkoutServices.reduce((acc, svc) => acc + (svc.priceCents ?? 0), 0) / 100,
              )
            }}
          </div>
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
          <input
            type="checkbox"
            v-model="checkoutRedeem"
            class="h-4 w-4"
            :disabled="!canRedeem || !isOnline"
          />
          Redeem 300 points on this visit
        </label>
        <div v-if="!canRedeem" class="text-xs text-slate-500">
          Earn {{ Math.max(0, 300 - (currentCheckoutItem?.pointsBalance ?? 0)) }} more points to redeem.
        </div>
        <div v-else-if="!isOnline" class="text-xs text-slate-500">
          Redemption requires internet connection.
        </div>
        <div class="flex justify-end gap-2 checkout-actions">
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
          <ElButton type="primary" @click="submitCheckin(activeCheckinAppt || undefined)">Check in</ElButton>
        </div>
      </div>
    </ElDialog>
  </div>
</template>

<style scoped>
.queue-grid {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}
.queue-scroll {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  max-height: calc(100vh - 260px);
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  gap: 0.75rem;
}
.queue-scroll .queue-grid {
  flex: 1 1 auto;
  overflow-y: auto;
  padding-bottom: 12px;
}
.appointment-list {
  max-height: 280px;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
@media (min-width: 1024px) {
  .appointment-list {
    max-height: 320px;
  }
}
.queue-tabs :deep(.el-tabs__item.is-active) {
  color: #0ea5e9;
  font-weight: 600;
}
.queue-tabs :deep(.el-tabs__active-bar) {
  background-color: #0ea5e9;
}
.checkout-modal :deep(.el-dialog) {
  max-width: 520px;
  width: 92%;
}
.checkout-body {
  padding: 24px 28px;
}
.checkout-body label {
  font-size: 15px;
}
.checkout-body input,
.checkout-body .el-input__wrapper,
.checkout-body .el-select {
  font-size: 16px;
  min-height: 44px;
}
.checkout-actions .el-button {
  min-height: 44px;
  padding: 0 20px;
  font-size: 16px;
}
.queue-toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}
@media (min-width: 640px) {
  .queue-toolbar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
.pagination-footer {
  background: #fff;
  border-top: 1px solid #e5e7eb;
  padding: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  min-height: 56px;
}
.page-indicator {
  font-size: 13px;
  color: #475569;
  padding: 6px 10px;
  border-radius: 12px;
  background: #f1f5f9;
}
</style>
