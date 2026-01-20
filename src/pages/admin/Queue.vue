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
import { humanizeTime } from '../../utils/dates';

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

const elapsed = (item: QueueItem) => humanizeTime(item.calledAt || item.createdAt || null);

const statusChip = (status: QueueItem['status']) => {
  if (status === 'WAITING') return { icon: '🧍', tone: 'waiting', label: 'Waiting' };
  if (status === 'CALLED') return { icon: '📣', tone: 'called', label: 'Call Next' };
  if (status === 'IN_SERVICE') return { icon: '✂️', tone: 'in-service', label: 'In Service' };
  if (status === 'COMPLETED') return { icon: '✅', tone: 'completed', label: 'Completed' };
  if (status === 'NO_SHOW') return { icon: '⚪', tone: 'muted', label: 'No Show' };
  return { icon: 'ℹ️', tone: 'muted', label: statusLabel(status) };
};

const cardToneClass = (status: QueueItem['status']) => {
  if (status === 'IN_SERVICE') return 'queue-card--in-service';
  if (status === 'WAITING' || status === 'CALLED') return 'queue-card--waiting';
  if (status === 'COMPLETED') return 'queue-card--completed';
  return '';
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
  <div class="queue-page flex h-full flex-col space-y-4">
    <div class="mb-2">
      <h1 class="text-xl font-semibold text-slate-900">Today’s Queue</h1>
      <p class="text-sm text-slate-600">Live queue with quick actions. Staff view is read-only.</p>
    </div>

    <ElCard v-if="queueLocked" class="glass bg-white/90 border-amber-200">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="text-sm font-semibold text-slate-900">Live queue unlocks after billing is activated.</div>
          <div class="text-xs text-slate-600">Activate billing to track waiting, in-service, and completed visits.</div>
        </div>
        <ElButton type="primary" @click="$router.push({ name: 'admin-billing' })">Go to billing</ElButton>
      </div>
    </ElCard>

    <ElCard class="glass bg-white/95" :loading="loadingAppointments">
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
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
            <div class="appointment-actions">
              <template v-if="appt.status === 'BOOKED'">
                <ElButton
                  size="small"
                  type="primary"
                  class="sf-btn sf-btn--table sf-btn--icon"
                  @click="openCheckinModal(appt)"
                >
                  <span aria-hidden="true">✅</span>
                  <span>Check in</span>
                </ElButton>
              </template>
              <ElTag v-else effect="plain" type="success" size="small">Checked in</ElTag>
              <ElTooltip v-if="!isOnline" content="Available when online">
                <span>
                  <ElButton
                    size="small"
                    class="sf-btn sf-btn--table sf-btn--icon sf-btn--ghost"
                    :disabled="!isOnline"
                    :loading="sendingMap[appt.id]"
                    @click="sendReminderForAppointment(appt)"
                  >
                    <span aria-hidden="true">🔔</span>
                    <span>Reminder</span>
                  </ElButton>
                </span>
              </ElTooltip>
              <ElButton
                v-else
                size="small"
                class="sf-btn sf-btn--table sf-btn--icon sf-btn--ghost"
                :loading="sendingMap[appt.id]"
                @click="sendReminderForAppointment(appt)"
              >
                <span aria-hidden="true">🔔</span>
                <span>Reminder</span>
              </ElButton>
              <ElTooltip content="Send feedback after checkout">
                <span>
                  <ElButton size="small" class="sf-btn sf-btn--table sf-btn--icon sf-btn--ghost" disabled>
                    <span aria-hidden="true">💬</span>
                    <span>Feedback</span>
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
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div v-if="activeTab === 'COMPLETED'" class="flex items-center gap-2">
          <span class="text-xs text-slate-600">Date range</span>
          <ElSelect
            v-model="dateFilter"
            size="small"
            class="w-40 queue-date-picker"
            @change="(v: any) => changeDateFilter(v)"
          >
            <ElOption label="Today" value="today" />
            <ElOption label="Yesterday" value="yesterday" />
            <ElOption label="Last 7 days" value="last7" />
            <ElOption label="Last 30 days" value="last30" />
          </ElSelect>
        </div>
        <div class="flex-1">
          <div class="sf-tabs queue-tabs">
            <button
              type="button"
              class="sf-tab"
              :class="{ active: activeTab === 'WAITING' }"
              @click="activeTab = 'WAITING'"
            >
              🧍 Waiting ({{ queueCounts.waiting }})
            </button>
            <button
              type="button"
              class="sf-tab"
              :class="{ active: activeTab === 'IN_SERVICE' }"
              @click="activeTab = 'IN_SERVICE'"
            >
              ✂️ In Service ({{ queueCounts.inService }})
            </button>
            <button
              type="button"
              class="sf-tab"
              :class="{ active: activeTab === 'COMPLETED' }"
              @click="activeTab = 'COMPLETED'"
            >
              ✅ Completed ({{ queueCounts.completed }})
            </button>
          </div>
        </div>
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
      <div class="grid gap-6 queue-grid">
        <ElCard
          v-for="item in displayedQueue"
          :key="item.id"
          shadow="hover"
          class="queue-card glass-card"
          :class="cardToneClass(item.status)"
        >
          <div class="flex items-start gap-3">
            <div class="queue-avatar">
              {{ (item.customerName || '?').charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 space-y-1.5">
              <div class="flex items-start justify-between gap-2">
                <div class="text-base font-semibold text-slate-900 customer-name">
                  {{ item.customerName || 'Unknown' }}
                </div>
                <div class="flex items-center gap-1">
                  <span
                    class="sf-status"
                    :class="`sf-status--${statusChip(item.status).tone}`"
                  >
                    <span aria-hidden="true">{{ statusChip(item.status).icon }}</span>
                    <span>{{ statusChip(item.status).label }}</span>
                  </span>
                  <ElTag
                    v-if="item.customerType"
                    effect="plain"
                    size="small"
                    :class="item.customerType === 'VIP' ? 'vip-tag' : ''"
                  >
                    {{ item.customerType === 'VIP' ? 'VIP' : item.customerType === 'SECOND_TIME' ? '2nd-time' : 'Regular' }}
                  </ElTag>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                <div class="flex items-center gap-1 service-row">
                  ✂️
                  <span>{{ item.serviceName || 'No service selected' }}</span>
                </div>
                <div v-if="item.servedByName" class="flex items-center gap-1 service-row">
                  👤
                  <span>{{ item.servedByName }}</span>
                </div>
              </div>
              <div class="queue-phone">
                <span class="flex items-center gap-2">
                  <span>📞</span>
                  <span>{{ item.customerPhone || '—' }}</span>
                </span>
              </div>
            </div>
          </div>
          <div class="mt-2 flex items-center justify-between text-sm text-slate-700 meta">
            <div class="flex items-center gap-1 text-slate-500 text-xs">
              <span aria-hidden="true">🕒</span>
              <span>{{ elapsed(item) }}</span>
            </div>
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
              :class="['sf-btn', 'sf-call-next', { 'sf-call-next--attention': activeTab === 'WAITING' }]"
              @click="handleAction(item.id, () => callCheckIn(item.id))"
            >
              <span aria-hidden="true">👤➡️</span>
              <span>Call Next</span>
            </ElButton>
            <template v-else-if="item.status === 'CALLED'">
              <ElButton
                size="small"
                type="success"
                :loading="actionLoading === item.id"
                class="sf-btn"
                @click="handleAction(item.id, () => startCheckIn(item.id))"
              >
                Mark In Service
              </ElButton>
              <ElButton
                size="small"
                type="danger"
                plain
                :loading="actionLoading === `${item.id}-no-show`"
                class="sf-btn"
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
              class="sf-btn"
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

    <ElDialog v-model="checkinOpen" title="Check In" width="460px">
      <div class="checkin-form space-y-4">
        <div class="space-y-1">
          <label class="text-sm font-semibold text-slate-800">Name</label>
          <ElInput v-model="checkinName" placeholder="Customer name" />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-semibold text-slate-800">Phone</label>
          <ElInput v-model="checkinPhone" placeholder="+1 555 123 4567" />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-semibold text-slate-800">Service (optional)</label>
          <ElSelect
            v-model="checkinServiceId"
            placeholder="Select service"
            clearable
            filterable
            :loading="loadingServices"
            class="w-full"
          >
            <ElOption v-for="svc in services" :key="svc.id" :label="svc.name" :value="svc.id" />
          </ElSelect>
          <div v-if="checkinPrefillService && !checkinServiceId" class="text-xs text-slate-500">
            Prefilled from appointment: {{ checkinPrefillService }}
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <ElButton class="sf-btn" @click="checkinOpen = false">Cancel</ElButton>
          <ElButton type="primary" class="sf-btn action-accent" @click="submitCheckin(activeCheckinAppt || undefined)">
            Check in
          </ElButton>
        </div>
      </div>
    </ElDialog>
  </div>
</template>

<style scoped>
.queue-page {
  min-height: calc(100vh - 140px);
}
.queue-grid {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  align-items: start;
  flex: 1 1 auto;
}
.queue-scroll {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  gap: 0.75rem;
}
.queue-scroll .queue-grid {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 6px 4px 14px;
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
.appointment-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-left: auto;
}
.queue-tabs {
  display: flex;
  flex-wrap: wrap;
  width: fit-content;
  max-width: 100%;
  gap: 8px;
}
.queue-tabs .sf-tab {
  white-space: nowrap;
}
.queue-tabs .sf-tab {
  border-radius: 999px;
  padding: 0.55em 1.1em;
  font-weight: 650;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.6);
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
  transition: all 0.16s ease;
}
.queue-tabs .sf-tab:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.18);
}
.queue-tabs .sf-tab.active {
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 8px 20px rgba(14, 165, 233, 0.35);
  opacity: 1;
}
.sf-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}
.sf-status--waiting {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}
.sf-status--called {
  background: linear-gradient(120deg, rgba(59, 130, 246, 0.14), rgba(16, 185, 129, 0.16));
  color: #0f766e;
  box-shadow: inset 0 0 0 1px rgba(14, 165, 233, 0.18);
}
.sf-status--in-service {
  background: rgba(16, 185, 129, 0.16);
  color: #047857;
}
.sf-status--in-service::after {
  content: ' ●';
  animation: sf-status-blink 1.6s infinite;
}
.sf-status--completed {
  background: rgba(100, 116, 139, 0.14);
  color: #0f172a;
}
.sf-status--muted {
  background: rgba(148, 163, 184, 0.16);
  color: #334155;
}
.sf-call-next {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 0.65em 1.1em;
  font-weight: 700;
  box-shadow: 0 8px 18px rgba(59, 130, 246, 0.28);
  transition: all 0.2s ease;
}
.sf-call-next:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(59, 130, 246, 0.35);
}
.sf-call-next--attention {
  animation: sf-pulse 2s infinite;
}
.vip-tag {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #92400e;
  border: none;
  font-weight: 700;
}
@keyframes sf-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.35);
  }
  70% {
    box-shadow: 0 0 0 12px rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}
@keyframes sf-status-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
.queue-card--waiting {
  background: linear-gradient(145deg, rgba(14, 165, 233, 0.04), rgba(59, 130, 246, 0.03));
}
.queue-card--in-service {
  background: linear-gradient(145deg, rgba(16, 185, 129, 0.08), rgba(14, 165, 233, 0.03));
  box-shadow: 0 12px 30px rgba(16, 185, 129, 0.12);
}
.queue-card--completed {
  background: linear-gradient(145deg, rgba(148, 163, 184, 0.08), rgba(226, 232, 240, 0.6));
  opacity: 0.95;
}
.checkin-form {
  padding: 4px 2px;
}
.checkin-form :deep(.el-input__wrapper),
.checkin-form :deep(.el-select__wrapper) {
  padding: 12px 14px;
  min-height: 46px;
  font-size: 1rem;
}
.checkin-form :deep(.el-input__inner),
.checkin-form :deep(.el-select__selected-item),
.checkin-form :deep(.el-select__placeholder) {
  font-size: 1rem;
}
.queue-card {
  align-self: flex-start;
  border-radius: 18px;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.queue-card .queue-avatar {
  height: 42px;
  width: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
  font-weight: 700;
  box-shadow: none;
}
.queue-card :deep(.el-card__body) {
  padding: 14px;
}
.queue-phone {
  font-size: 1.05rem;
  font-weight: 650;
  color: #0f172a;
  letter-spacing: 0.01em;
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
.queue-toolbar :deep(.el-select .el-input__wrapper) {
  font-size: 1rem;
  padding: 0.75em 1em;
}
@media (min-width: 640px) {
  .queue-toolbar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
.queue-grid {
  gap: 24px;
}
.queue-card .customer-name {
  line-height: 1.2;
  min-height: 2.4em;
  overflow: hidden;
}
.queue-card .service-row {
  margin-top: 8px;
  margin-bottom: 8px;
  opacity: 0.9;
}
.queue-card .service-row svg {
  margin-right: 6px;
}
.queue-card .sf-btn {
  min-height: 40px;
}
.queue-card .meta {
  font-size: 0.85rem;
  opacity: 0.75;
}
.queue-date-picker {
  height: 44px;
  min-width: 160px;
  /* padding: 0 14px; */
  border-radius: 12px;
  font-size: 1rem;
  background: #ffffff;
  border: none;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}
.queue-date-picker :deep(.el-select__wrapper) {
  height: 44px;
  border-radius: 12px !important;
  border: none;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.25);
  display: flex;
  align-items: center;
}
.queue-date-picker :deep(.el-input__inner) {
  text-align: center;
}
.pagination-footer {
  position: sticky;
  bottom: 0;
  z-index: 5;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  min-height: 60px;
  margin-top: auto;
}
.page-indicator {
  font-size: 13px;
  color: #475569;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(241, 245, 249, 0.85);
}
</style>
