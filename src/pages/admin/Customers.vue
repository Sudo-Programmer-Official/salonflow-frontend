<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ElAlert,
  ElBadge,
  ElButton,
  ElCard,
  ElDrawer,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElInput,
  ElPagination,
  ElSelect,
  ElOption,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTooltip,
  ElSwitch,
} from 'element-plus';
import {
  fetchCustomers,
  fetchCustomerTimeline,
  sendCustomerFeedback,
  sendCustomerReminder,
  updateCustomer,
  type CustomerListConsentFilter,
  type CustomerListItem,
  type CustomerListLastVisitFilter,
  type CustomerListLoyaltyFilter,
  type CustomerListResponse,
  type CustomerListSort,
  type CustomerListTypeFilter,
  type CustomerListVisitsFilter,
  type CustomerTimeline as CustomerTimelineType,
} from '../../api/customers';
import CustomerTimeline from '../../components/CustomerTimeline.vue';
import { formatInBusinessTz, humanizeTime } from '../../utils/dates';
import { formatPhone } from '../../utils/format';

type CustomerFilters = {
  lastVisit: CustomerListLastVisitFilter | null;
  loyalty: CustomerListLoyaltyFilter | null;
  customerType: CustomerListTypeFilter | null;
  visits: CustomerListVisitsFilter | null;
  smsConsent: CustomerListConsentFilter | null;
  sort: CustomerListSort;
};

type CustomersQueryState = {
  q: string;
  lastVisit: CustomerListLastVisitFilter | null;
  loyalty: CustomerListLoyaltyFilter | null;
  customerType: CustomerListTypeFilter | null;
  visits: CustomerListVisitsFilter | null;
  smsConsent: CustomerListConsentFilter | null;
  sort: CustomerListSort;
  page: number;
  pageSize: number;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;
const SORT_LABELS: Record<CustomerListSort, string> = {
  lastVisit: 'Last visit',
  loyaltyPoints: 'Loyalty points',
  visits: 'Visits',
  name: 'Name',
};

const LAST_VISIT_LABELS: Record<NonNullable<CustomerFilters['lastVisit']>, string> = {
  today: 'Today',
  '7days': '7 days',
  '30days': '30 days',
  '60days': '60 days',
  '90plus': '90+ days',
  never: 'Never',
};

const LOYALTY_LABELS: Record<NonNullable<CustomerFilters['loyalty']>, string> = {
  rewardAvailable: 'Reward available',
  closeToReward: 'Close to reward',
};

const CUSTOMER_TYPE_LABELS: Record<NonNullable<CustomerFilters['customerType']>, string> = {
  new: 'New',
  regular: 'Regular',
  vip: 'VIP',
};

const VISITS_LABELS: Record<NonNullable<CustomerFilters['visits']>, string> = {
  '0': '0',
  '1': '1',
  '2-5': '2-5',
  '5+': '5+',
};

const CONSENT_LABELS: Record<NonNullable<CustomerFilters['smsConsent']>, string> = {
  optedIn: 'Opted in',
  notOptedIn: 'Not opted in',
};

const route = useRoute();
const router = useRouter();

const defaultFilters = (): CustomerFilters => ({
  lastVisit: null,
  loyalty: null,
  customerType: null,
  visits: null,
  smsConsent: null,
  sort: 'lastVisit',
});

const cloneFilters = (value: CustomerFilters): CustomerFilters => ({ ...value });

const searchInput = ref('');
const appliedSearch = ref('');
const filters = ref<CustomerFilters>(defaultFilters());
const filterDraft = ref<CustomerFilters>(defaultFilters());
const filterDrawerOpen = ref(false);
const loading = ref(false);
const errorMessage = ref('');
const customers = ref<CustomerListItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);

const timelineOpen = ref(false);
const timelineLoading = ref(false);
const timeline = ref<CustomerTimelineType | null>(null);

const editOpen = ref(false);
const savingEdit = ref(false);
const editingCustomerId = ref<string | null>(null);
const editForm = ref({
  name: '',
  phoneE164: '',
  reviewSmsConsent: false,
});

let loadRequestId = 0;

const pageStart = computed(() => (total.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1));
const pageEnd = computed(() => Math.min(total.value, page.value * pageSize.value));
const activeFilterCount = computed(
  () =>
    [
      filters.value.lastVisit,
      filters.value.loyalty,
      filters.value.customerType,
      filters.value.visits,
      filters.value.smsConsent,
    ].filter(Boolean).length,
);
const hasActiveFilters = computed(() => activeFilterCount.value > 0);

const formatDate = (value: string | null) => (value ? formatInBusinessTz(value, 'MMM D, YYYY h:mm A') : '—');
const formatRelative = (value: string | null) => (value ? humanizeTime(value) : '—');
const prettyPhone = (value: string | null) => formatPhone(value || undefined);
const pointsValue = (row: CustomerListItem) => (Number.isFinite(row.pointsBalance) ? row.pointsBalance : 0);

const readQueryValue = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null;
  }
  return typeof value === 'string' ? value : null;
};

const parseEnum = <T extends string>(value: unknown, allowed: readonly T[]): T | null => {
  const raw = readQueryValue(value);
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
};

const parsePage = (value: unknown): number => {
  const raw = readQueryValue(value);
  if (!raw) return 1;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const parsePageSize = (value: unknown): number => {
  const raw = readQueryValue(value);
  if (!raw) return DEFAULT_PAGE_SIZE;
  const parsed = Number(raw);
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number]) ? parsed : DEFAULT_PAGE_SIZE;
};

const normalizeStateFromQuery = (query: Record<string, unknown>): CustomersQueryState => ({
  q: readQueryValue(query.q)?.trim() ?? '',
  lastVisit: parseEnum(query.lastVisit, ['today', '7days', '30days', '60days', '90plus', 'never'] as const),
  loyalty: parseEnum(query.loyalty, ['rewardAvailable', 'closeToReward'] as const),
  customerType: parseEnum(query.customerType, ['new', 'regular', 'vip'] as const),
  visits: parseEnum(query.visits, ['0', '1', '2-5', '5+'] as const),
  smsConsent: parseEnum(query.smsConsent, ['optedIn', 'notOptedIn'] as const),
  sort: parseEnum(query.sort, ['lastVisit', 'loyaltyPoints', 'visits', 'name'] as const) ?? 'lastVisit',
  page: parsePage(query.page),
  pageSize: parsePageSize(query.pageSize),
});

const buildQueryFromState = () => {
  const query: Record<string, string> = {};
  const trimmedSearch = appliedSearch.value.trim();

  if (trimmedSearch) query.q = trimmedSearch;
  if (filters.value.lastVisit) query.lastVisit = filters.value.lastVisit;
  if (filters.value.loyalty) query.loyalty = filters.value.loyalty;
  if (filters.value.customerType) query.customerType = filters.value.customerType;
  if (filters.value.visits) query.visits = filters.value.visits;
  if (filters.value.smsConsent) query.smsConsent = filters.value.smsConsent;
  if (filters.value.sort !== 'lastVisit') query.sort = filters.value.sort;
  if (page.value > 1) query.page = String(page.value);
  if (pageSize.value !== DEFAULT_PAGE_SIZE) query.pageSize = String(pageSize.value);

  return query;
};

const queryKey = (query: Record<string, string>) =>
  Object.keys(query)
    .sort()
    .map((key) => `${key}=${query[key]}`)
    .join('&');

const routeQueryKey = (query: Record<string, unknown>) =>
  queryKey(
    Object.fromEntries(
      Object.entries(query)
        .map(([key, value]) => [key, readQueryValue(value) ?? ''])
        .filter(([, value]) => value !== ''),
    ) as Record<string, string>,
  );

const applyStateFromQuery = (query: Record<string, unknown>) => {
  const next = normalizeStateFromQuery(query);
  searchInput.value = next.q;
  appliedSearch.value = next.q;
  filters.value = {
    lastVisit: next.lastVisit,
    loyalty: next.loyalty,
    customerType: next.customerType,
    visits: next.visits,
    smsConsent: next.smsConsent,
    sort: next.sort,
  };
  page.value = next.page;
  pageSize.value = next.pageSize;
};

const loadCustomers = async () => {
  const requestId = ++loadRequestId;
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await fetchCustomers({
      q: appliedSearch.value.trim() || undefined,
      lastVisit: filters.value.lastVisit,
      loyalty: filters.value.loyalty,
      customerType: filters.value.customerType,
      visits: filters.value.visits,
      smsConsent: filters.value.smsConsent,
      sort: filters.value.sort,
      page: page.value,
      pageSize: pageSize.value,
    });

    if (requestId !== loadRequestId) return;

    if (Array.isArray(response)) {
      customers.value = response;
      total.value = response.length;
      page.value = 1;
      pageSize.value = DEFAULT_PAGE_SIZE;
    } else {
      const data = response as CustomerListResponse;
      customers.value = data.items ?? [];
      total.value = data.total ?? 0;
      page.value = data.page ?? page.value;
      pageSize.value = data.pageSize ?? pageSize.value;
    }

    if (page.value > Math.max(1, Math.ceil(total.value / pageSize.value))) {
      page.value = Math.max(1, Math.ceil(total.value / pageSize.value));
    }
  } catch (err) {
    if (requestId !== loadRequestId) return;
    const message = err instanceof Error ? err.message : 'Failed to load customers';
    errorMessage.value = message;
    ElMessage.error(message);
    customers.value = [];
    total.value = 0;
  } finally {
    if (requestId === loadRequestId) {
      loading.value = false;
    }
  }
};

const syncRouteFromState = async (mode: 'replace' | 'push') => {
  const nextQuery = buildQueryFromState();
  if (queryKey(nextQuery) === routeQueryKey(route.query as Record<string, unknown>)) return;
  await router[mode]({ name: 'admin-customers', query: nextQuery });
};

const applySearch = async () => {
  appliedSearch.value = searchInput.value.trim();
  page.value = 1;
  await syncRouteFromState('push');
};

const openFilters = () => {
  filterDraft.value = cloneFilters(filters.value);
  filterDrawerOpen.value = true;
};

const applyFilters = async () => {
  filters.value = cloneFilters(filterDraft.value);
  filterDrawerOpen.value = false;
  page.value = 1;
  await syncRouteFromState('push');
};

const resetDraftFilters = () => {
  filterDraft.value = defaultFilters();
};

const clearAllFilters = async () => {
  filters.value = defaultFilters();
  filterDraft.value = defaultFilters();
  page.value = 1;
  await syncRouteFromState('push');
};

const removeFilter = async (key: keyof Omit<CustomerFilters, 'sort'>) => {
  filters.value = { ...filters.value, [key]: null };
  filterDraft.value = { ...filters.value };
  page.value = 1;
  await syncRouteFromState('push');
};

const activeFilterChips = computed(() => {
  const chips: Array<{ key: string; label: string; onClose: () => Promise<void> }> = [];
  if (filters.value.lastVisit) {
    chips.push({
      key: 'lastVisit',
      label: `Last visit: ${LAST_VISIT_LABELS[filters.value.lastVisit]}`,
      onClose: () => removeFilter('lastVisit'),
    });
  }
  if (filters.value.loyalty) {
    chips.push({
      key: 'loyalty',
      label: `Loyalty: ${LOYALTY_LABELS[filters.value.loyalty]}`,
      onClose: () => removeFilter('loyalty'),
    });
  }
  if (filters.value.customerType) {
    chips.push({
      key: 'customerType',
      label: `Type: ${CUSTOMER_TYPE_LABELS[filters.value.customerType]}`,
      onClose: () => removeFilter('customerType'),
    });
  }
  if (filters.value.visits) {
    chips.push({
      key: 'visits',
      label: `Visits: ${VISITS_LABELS[filters.value.visits]}`,
      onClose: () => removeFilter('visits'),
    });
  }
  if (filters.value.smsConsent) {
    chips.push({
      key: 'smsConsent',
      label: `SMS: ${CONSENT_LABELS[filters.value.smsConsent]}`,
      onClose: () => removeFilter('smsConsent'),
    });
  }
  return chips;
});

const openTimeline = async (customerId: string) => {
  timelineLoading.value = true;
  timeline.value = null;
  timelineOpen.value = true;
  try {
    timeline.value = await fetchCustomerTimeline(customerId);
  } catch (err) {
    timelineOpen.value = false;
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load timeline');
  } finally {
    timelineLoading.value = false;
  }
};

const openProfile = async (customerId: string) => {
  await router.push({ name: 'admin-customer-profile', params: { customerId } });
};

const openEdit = (row: CustomerListItem) => {
  editingCustomerId.value = row.id;
  editForm.value = {
    name: row.name ?? '',
    phoneE164: row.phoneE164 ?? '',
    reviewSmsConsent: !!row.reviewSmsConsent,
  };
  editOpen.value = true;
};

const saveCustomerEdit = async () => {
  if (!editingCustomerId.value) return;
  if (!editForm.value.name.trim()) {
    ElMessage.warning('Customer name is required');
    return;
  }
  savingEdit.value = true;
  try {
    await updateCustomer(editingCustomerId.value, {
      name: editForm.value.name.trim(),
      phoneE164: editForm.value.phoneE164.trim() || null,
      reviewSmsConsent: editForm.value.reviewSmsConsent,
    });
    ElMessage.success('Customer updated');
    editOpen.value = false;
    await loadCustomers();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to update customer');
  } finally {
    savingEdit.value = false;
  }
};

const canSendReminder = (row: CustomerListItem) => !!row.phoneE164 && row.smsConsent;
const canSendFeedback = (row: CustomerListItem) => !!row.phoneE164 && row.smsConsent && !row.reviewSentAt;

const sendReminderAction = async (row: CustomerListItem) => {
  if (!canSendReminder(row)) {
    ElMessage.warning('Consent required to send reminder');
    return;
  }
  try {
    await sendCustomerReminder(row.id);
    ElMessage.success('Reminder sent');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to send reminder');
  }
};

const sendFeedbackAction = async (row: CustomerListItem) => {
  if (!canSendFeedback(row)) {
    ElMessage.warning('Already sent or consent missing');
    return;
  }
  try {
    await sendCustomerFeedback(row.id);
    ElMessage.success('Feedback link sent');
    await loadCustomers();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to send feedback');
  }
};

const handleActionCommand = (command: string, row: CustomerListItem) => {
  if (command === 'timeline') {
    void openTimeline(row.id);
    return;
  }
  if (command === 'profile') {
    void openProfile(row.id);
    return;
  }
  if (command === 'edit') {
    openEdit(row);
    return;
  }
  if (command === 'reminder') {
    void sendReminderAction(row);
    return;
  }
  if (command === 'feedback') {
    void sendFeedbackAction(row);
  }
};

const handlePageChange = async (nextPage: number) => {
  page.value = Math.max(1, nextPage);
  await syncRouteFromState('push');
};

const handlePageSizeChange = async (nextSize: number) => {
  pageSize.value = nextSize;
  page.value = 1;
  await syncRouteFromState('push');
};

watch(
  () => route.query,
  async (query) => {
    const normalizedQuery = buildQueryFromState();
    if (queryKey(normalizedQuery) !== routeQueryKey(query as Record<string, unknown>)) {
      await router.replace({ name: 'admin-customers', query: normalizedQuery });
      return;
    }

    applyStateFromQuery(query as Record<string, unknown>);

    await loadCustomers();
  },
  { immediate: true },
);

const applySearchAndReset = async () => {
  await applySearch();
};
</script>

<template>
  <div class="customers-page space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold text-slate-900">Customers</h1>
        <p class="max-w-2xl text-sm text-slate-600">
          Search by name or phone, then narrow the full customer dataset with filters and sort options.
        </p>
      </div>
      <div class="stat-chip" aria-label="Matching customers">
        👥 Total: {{ total }}
      </div>
    </div>

    <ElCard class="bg-white">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div class="flex flex-1 flex-col gap-3 sm:flex-row">
          <ElInput
            v-model="searchInput"
            placeholder="Search by name or phone"
            clearable
            class="sf-input flex-1"
            @keyup.enter="applySearchAndReset"
          />
          <div class="flex gap-2 sm:flex-none">
            <ElButton
              type="primary"
              class="sf-btn sf-btn-search action-accent"
              :loading="loading"
              @click="applySearchAndReset"
            >
              <span aria-hidden="true">🔍</span>
              <span>Search</span>
            </ElButton>
            <ElBadge :value="activeFilterCount" :hidden="!hasActiveFilters" type="primary">
              <ElButton plain class="sf-btn" @click="openFilters">Filters</ElButton>
            </ElBadge>
          </div>
        </div>
      </div>

      <div v-if="hasActiveFilters" class="mt-3 flex flex-wrap items-center gap-2">
        <ElTag
          v-for="chip in activeFilterChips"
          :key="chip.key"
          closable
          effect="light"
          class="filter-chip"
          @close="chip.onClose"
        >
          {{ chip.label }}
        </ElTag>
        <ElButton text type="primary" class="clear-link" @click="clearAllFilters">Clear all</ElButton>
      </div>

      <div v-if="errorMessage" class="mt-3">
        <ElAlert type="error" :title="errorMessage" :closable="false" show-icon />
      </div>
    </ElCard>

    <ElCard v-if="loading || total > 0" class="bg-white">
      <div class="table-shell">
        <div class="table-meta flex flex-col gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-sm text-slate-600">
            Showing {{ pageStart }}-{{ pageEnd }} of {{ total }}
          </div>
          <div class="text-xs text-slate-500">
            Reward threshold is driven by the salon's active redemption rules.
          </div>
        </div>

        <div class="table-body table-scroll">
          <ElTable
            :data="customers"
            :loading="loading"
            empty-text="No customers match these filters."
            style="width: 100%"
          >
            <ElTableColumn label="Customer" min-width="260">
              <template #default="{ row }">
                <div class="flex items-center gap-3">
                  <div class="avatar-circle" aria-hidden="true">
                    {{ row.name?.trim()?.charAt(0)?.toUpperCase() || '?' }}
                  </div>
                  <div class="min-w-0 space-y-1">
                    <button class="customer-name-link block" type="button" @click="openProfile(row.id)">
                      {{ row.name }}
                    </button>
                    <div class="text-sm text-slate-600">
                      {{ prettyPhone(row.phoneE164) }}
                    </div>
                  </div>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="Activity" min-width="170">
              <template #default="{ row }">
                <div class="space-y-1 text-sm text-slate-700">
                  <div class="flex items-center gap-1">
                    <span class="text-slate-500">Last visit:</span>
                    <ElTooltip :content="formatDate(row.lastVisitAt)" placement="top">
                      <span class="font-semibold text-slate-900">{{ formatRelative(row.lastVisitAt) }}</span>
                    </ElTooltip>
                  </div>
                  <div class="text-slate-600">Visits: {{ row.visitCount }}</div>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="Loyalty" min-width="160">
              <template #default="{ row }">
                <div class="space-y-1">
                  <div class="flex items-center gap-1 text-sm text-slate-800">
                    <span aria-hidden="true">⭐</span>
                    <span class="font-semibold">{{ pointsValue(row) }} pts</span>
                  </div>
                  <ElTag effect="light" class="capitalize">
                    {{ row.type }}
                  </ElTag>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="Consent" width="120">
              <template #default="{ row }">
                <ElTag :type="row.smsConsent ? 'success' : 'info'" effect="light">
                  {{ row.smsConsent ? 'Yes' : 'No' }}
                </ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn
              label="Actions"
              width="100"
              align="center"
              header-align="center"
              fixed="right"
            >
              <template #default="{ row }">
                <ElDropdown trigger="click" @command="(command) => handleActionCommand(String(command), row)">
                  <ElButton class="kebab-btn" plain @click.stop>⋯</ElButton>
                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem command="timeline">Timeline</ElDropdownItem>
                      <ElDropdownItem command="profile">Profile</ElDropdownItem>
                      <ElDropdownItem command="edit">Edit</ElDropdownItem>
                      <ElDropdownItem command="reminder" :disabled="!canSendReminder(row)">
                        Send Reminder
                      </ElDropdownItem>
                      <ElDropdownItem command="feedback" :disabled="!canSendFeedback(row)">
                        Send Feedback
                      </ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </template>
            </ElTableColumn>
          </ElTable>
        </div>

        <div class="pagination-footer">
          <ElPagination
            background
            layout="total, sizes, prev, pager, next, jumper"
            :current-page="page"
            :page-size="pageSize"
            :page-sizes="[...PAGE_SIZE_OPTIONS]"
            :total="total"
            :disabled="loading"
            @current-change="handlePageChange"
            @size-change="handlePageSizeChange"
          />
        </div>
      </div>
    </ElCard>

    <ElCard v-else class="bg-white">
      <ElEmpty description="No customers match these filters." />
    </ElCard>

    <ElDrawer v-model="filterDrawerOpen" title="Filters" size="360px" class="customers-filter-drawer">
      <div class="space-y-5">
        <section class="filter-section">
          <div class="filter-label">Last Visit</div>
          <ElSelect v-model="filterDraft.lastVisit" clearable class="w-full" placeholder="All">
            <ElOption label="Today" value="today" />
            <ElOption label="7 days" value="7days" />
            <ElOption label="30 days" value="30days" />
            <ElOption label="60 days" value="60days" />
            <ElOption label="90+ days" value="90plus" />
            <ElOption label="Never" value="never" />
          </ElSelect>
        </section>

        <section class="filter-section">
          <div class="filter-label">Loyalty</div>
          <ElSelect v-model="filterDraft.loyalty" clearable class="w-full" placeholder="All">
            <ElOption label="Reward available" value="rewardAvailable" />
            <ElOption label="Close to reward" value="closeToReward" />
          </ElSelect>
          <div class="filter-help">Close to reward uses the salon's configured redemption threshold.</div>
        </section>

        <section class="filter-section">
          <div class="filter-label">Customer Type</div>
          <ElSelect v-model="filterDraft.customerType" clearable class="w-full" placeholder="All">
            <ElOption label="New" value="new" />
            <ElOption label="Regular" value="regular" />
            <ElOption label="VIP" value="vip" />
          </ElSelect>
        </section>

        <section class="filter-section">
          <div class="filter-label">Visits</div>
          <ElSelect v-model="filterDraft.visits" clearable class="w-full" placeholder="All">
            <ElOption label="0" value="0" />
            <ElOption label="1" value="1" />
            <ElOption label="2-5" value="2-5" />
            <ElOption label="5+" value="5+" />
          </ElSelect>
        </section>

        <section class="filter-section">
          <div class="filter-label">SMS Consent</div>
          <ElSelect v-model="filterDraft.smsConsent" clearable class="w-full" placeholder="All">
            <ElOption label="Opted in" value="optedIn" />
            <ElOption label="Not opted in" value="notOptedIn" />
          </ElSelect>
        </section>

        <section class="filter-section">
          <div class="filter-label">Sort</div>
          <ElSelect v-model="filterDraft.sort" class="w-full">
            <ElOption v-for="(label, key) in SORT_LABELS" :key="key" :label="label" :value="key" />
          </ElSelect>
        </section>

        <div class="flex items-center justify-between gap-2 pt-2">
          <ElButton text type="primary" @click="resetDraftFilters">Reset</ElButton>
          <div class="flex gap-2">
            <ElButton @click="filterDrawerOpen = false">Cancel</ElButton>
            <ElButton type="primary" @click="applyFilters">Apply</ElButton>
          </div>
        </div>
      </div>
    </ElDrawer>

    <ElDrawer v-model="timelineOpen" title="Customer Timeline" size="30%">
      <div v-if="timelineLoading" class="text-sm text-slate-500">Loading timeline...</div>
      <CustomerTimeline v-else :timeline="timeline" />
    </ElDrawer>

    <ElDrawer v-model="editOpen" title="Edit Customer" size="32%">
      <div class="edit-form">
        <label class="field-label" for="customer-name">Name</label>
        <ElInput id="customer-name" v-model="editForm.name" placeholder="Customer name" />

        <label class="field-label mt-3" for="customer-phone">Phone</label>
        <ElInput id="customer-phone" v-model="editForm.phoneE164" placeholder="+13612270110" />

        <div class="mt-4 flex items-center justify-between gap-3">
          <span class="field-label mb-0">SMS consent</span>
          <ElSwitch v-model="editForm.reviewSmsConsent" />
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <ElButton @click="editOpen = false">Cancel</ElButton>
          <ElButton type="primary" :loading="savingEdit" @click="saveCustomerEdit">Save</ElButton>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<style scoped>
.customers-page {
  font-size: var(--font-md);
}

.customers-page :deep(.el-input__wrapper) {
  padding: 12px 14px;
  min-height: 44px;
}

.customers-page :deep(.el-button) {
  font-size: 1rem;
}

.customers-page :deep(.el-pagination) {
  flex-wrap: wrap;
}

.customers-page :deep(.el-table) {
  font-size: 1rem;
}

.table-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.table-body {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.pagination-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
  border-top: 1px solid #e5e7eb;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 12px;
  background: #f1f5f9;
  font-weight: 600;
  color: #0f172a;
}

.avatar-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  background: #e2e8f0;
  color: #334155;
  font-weight: 700;
  flex: 0 0 auto;
}

.customer-name-link {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  color: #0f172a;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.customer-name-link:hover {
  color: #2563eb;
}

.kebab-btn {
  width: 36px;
  height: 32px;
  min-width: 36px;
  padding: 0;
  font-size: 20px;
  line-height: 1;
  color: #334155;
}

.filter-chip {
  max-width: 100%;
}

.clear-link {
  padding-left: 4px;
  padding-right: 4px;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label,
.field-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-help {
  font-size: 12px;
  color: #64748b;
}

.customers-filter-drawer :deep(.el-drawer__body) {
  padding-top: 0;
}

@media (max-width: 1024px) {
  .pagination-footer {
    justify-content: stretch;
  }

  .pagination-footer :deep(.el-pagination) {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
