<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElCard, ElInput, ElTable, ElTableColumn, ElTag, ElButton, ElMessage, ElDrawer, ElTooltip, ElSwitch } from 'element-plus';
import {
  searchCustomers,
  fetchCustomerTimeline,
  fetchCustomers,
  updateCustomer,
  type CustomerSearchResult,
  type CustomerTimeline as CustomerTimelineType,
  sendCustomerReminder,
  sendCustomerFeedback,
} from '../../api/customers';
import CustomerTimeline from '../../components/CustomerTimeline.vue';
import { formatInBusinessTz, humanizeTime } from '../../utils/dates';
import { formatPhone } from '../../utils/format';

const PAGE_SIZE = 10;
const query = ref('');
const loading = ref(false);
const errorMessage = ref('');
const results = ref<CustomerSearchResult[]>([]);
const nextCursor = ref<string | null>(null);
const hasMore = ref(false);
const loadingMore = ref(false);
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
const page = ref(1);

const totalPages = computed(() => Math.max(1, Math.ceil(results.value.length / PAGE_SIZE)));
const totalCustomers = computed(() => results.value.length);

const displayedResults = computed(() => {
  if (page.value > totalPages.value) page.value = totalPages.value;
  const start = (page.value - 1) * PAGE_SIZE;
  return results.value.slice(start, start + PAGE_SIZE);
});

const doSearch = async () => {
  if (!query.value.trim()) {
    await loadAll();
    return;
  }
  loading.value = true;
  errorMessage.value = '';
  try {
    results.value = await searchCustomers(query.value.trim());
    nextCursor.value = null;
    hasMore.value = false;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to search customers');
    errorMessage.value = err instanceof Error ? err.message : 'Failed to search customers';
  } finally {
    loading.value = false;
  }
};

const formatDate = (value: string | null) => formatInBusinessTz(value, 'MMM D, YYYY');
const relativeDate = (value: string | null) => humanizeTime(value);
const prettyPhone = (value: string | null) => formatPhone(value || undefined);

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

const openEdit = (row: CustomerSearchResult) => {
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
    const target = results.value.find((item) => item.id === editingCustomerId.value);
    if (target) {
      target.name = editForm.value.name.trim();
      target.phoneE164 = editForm.value.phoneE164.trim() || '';
      target.reviewSmsConsent = editForm.value.reviewSmsConsent;
    }
    ElMessage.success('Customer updated');
    editOpen.value = false;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to update customer');
  } finally {
    savingEdit.value = false;
  }
};

const loadAll = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const data = await fetchCustomers({ segment: 'all', limit: 50, cursor: null });
    if (Array.isArray(data)) {
      results.value = data;
      nextCursor.value = null;
      hasMore.value = false;
    } else {
      results.value = data.items ?? [];
      nextCursor.value = data.nextCursor ?? null;
      hasMore.value = !!data.hasMore;
    }
    page.value = 1;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load customers');
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load customers';
  } finally {
    loading.value = false;
  }
};

const loadMore = async () => {
  if (!hasMore.value || loadingMore.value || !nextCursor.value) return;
  loadingMore.value = true;
  try {
    const data = await fetchCustomers({ segment: 'all', limit: 50, cursor: nextCursor.value });
    if (!Array.isArray(data)) {
      results.value = [...results.value, ...(data.items ?? [])];
      nextCursor.value = data.nextCursor ?? null;
      hasMore.value = !!data.hasMore;
    }
    page.value = Math.min(page.value, totalPages.value);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load more customers');
  } finally {
    loadingMore.value = false;
  }
};

loadAll();

const canSendReminder = (row: CustomerSearchResult) =>
  !!row.phoneE164 && row.reviewSmsConsent;
const canSendFeedback = (row: CustomerSearchResult) =>
  !!row.phoneE164 && row.reviewSmsConsent && !row.reviewSentAt;

const sendReminderAction = async (row: CustomerSearchResult) => {
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

const sendFeedbackAction = async (row: CustomerSearchResult) => {
  if (!canSendFeedback(row)) {
    ElMessage.warning('Already sent or consent missing');
    return;
  }
  try {
    await sendCustomerFeedback(row.id);
    ElMessage.success('Feedback link sent');
    row.reviewSentAt = new Date().toISOString();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to send feedback');
  }
};

const ensureDataForPage = async (target: number) => {
  const needed = target * PAGE_SIZE;
  if (needed > results.value.length && hasMore.value && nextCursor.value) {
    await loadMore();
  }
};

const changePage = async (direction: 'prev' | 'next') => {
  const target = direction === 'next' ? page.value + 1 : page.value - 1;
  await goToPage(target);
};

const goToPage = async (target: number) => {
  const clamped = Math.max(1, target);
  await ensureDataForPage(clamped);
  page.value = Math.min(Math.max(1, clamped), totalPages.value);
};

const pointsValue = (row: any) => {
  const val =
    row?.pointsBalance ??
    row?.points_balance ??
    row?.points ??
    row?.loyaltyPoints ??
    0;
  return typeof val === 'number' && Number.isFinite(val) ? val : 0;
};

watch(results, () => {
  if (page.value > totalPages.value) {
    page.value = totalPages.value;
  }
});
</script>

<template>
  <div class="customers-page space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Customers</h1>
        <p class="text-sm text-slate-600">
          Search by name or phone to see visit history. Customers appear after their first visit or checkout.
        </p>
      </div>
      <div class="stat-chip" aria-label="Total customers">
        👥 Total: {{ totalCustomers }}
      </div>
    </div>

    <ElCard class="bg-white">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 max-w-xl">
        <ElInput
          v-model="query"
          placeholder="Search by name or phone"
          clearable
          class="sf-input flex-1"
          @keyup.enter="doSearch"
        />
        <ElButton
          type="primary"
          class="sf-btn sf-btn-search action-accent"
          :loading="loading"
          @click="doSearch"
        >
          <span aria-hidden="true">🔍</span>
          <span>Search</span>
        </ElButton>
      </div>
      <div v-if="errorMessage" class="mt-3 text-sm text-amber-700">
        {{ errorMessage }}
      </div>
    </ElCard>

    <ElCard v-if="results.length > 0" class="bg-white">
      <div class="table-shell">
        <div class="table-body table-scroll">
          <ElTable :data="displayedResults" style="width: 100%">
            <ElTableColumn label="Customer" min-width="200">
              <template #default="{ row }">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                    {{ row.name?.charAt(0)?.toUpperCase() || '?' }}
                  </div>
                  <div class="space-y-1">
                    <div class="text-sm font-semibold text-slate-900">👤 {{ row.name }}</div>
                    <div class="text-xs text-slate-700">📞 {{ prettyPhone(row.phoneE164) }}</div>
                  </div>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="Activity" width="180">
              <template #default="{ row }">
                <div class="space-y-1 text-xs text-slate-700">
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-1">
                      <span class="text-slate-500">Last visit:</span>
                      <ElTooltip :content="formatDate(row.lastVisitAt)" placement="top">
                        <span class="flex items-center gap-1 text-slate-500">
                          <span aria-hidden="true">🕒</span>
                          <span class="font-semibold text-slate-700">{{ relativeDate(row.lastVisitAt) }}</span>
                        </span>
                      </ElTooltip>
                    </div>
                    <div class="flex items-center gap-1 text-slate-600">
                      <span aria-hidden="true">👤</span>
                      <span>{{ row.lastServedBy || '—' }}</span>
                    </div>
                  </div>
                  <div>Visits: {{ row.visitCount ?? 0 }}</div>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="Loyalty" width="150">
              <template #default="{ row }">
                <div class="space-y-1 text-xs text-slate-700">
                  <div class="flex items-center gap-1">
                    <span>⭐</span>
                    <span :class="pointsValue(row) >= 300 ? 'text-emerald-600 font-semibold' : 'text-slate-700'">
                      {{ pointsValue(row) }} pts
                    </span>
                  </div>
                  <ElTag effect="light">
                    {{ row.type.toUpperCase() }}
                  </ElTag>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="Consent" width="110">
              <template #default="{ row }">
                <ElTag :type="row.reviewSmsConsent ? 'success' : 'info'" effect="light">
                  {{ row.reviewSmsConsent ? 'Yes' : 'No' }}
                </ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn label="Actions" min-width="260" width="280" fixed="right" align="center" header-align="center" class-name="actions-col">
              <template #default="{ row }">
                <div class="table-actions">
                  <ElButton size="small" plain class="action-btn-text" @click.stop="openTimeline(row.id)">View</ElButton>
                  <ElButton size="small" type="primary" plain class="action-btn-text" @click.stop="openEdit(row)">Edit</ElButton>
                  <ElButton
                    size="small"
                    type="primary"
                    class="action-btn-text"
                    :disabled="!canSendReminder(row)"
                    @click.stop="sendReminderAction(row)"
                  >
                    Reminder
                  </ElButton>
                  <ElButton
                    size="small"
                    type="primary"
                    plain
                    class="action-btn-text"
                    :disabled="!canSendFeedback(row)"
                    @click.stop="sendFeedbackAction(row)"
                  >
                    Feedback
                  </ElButton>
                </div>
              </template>
            </ElTableColumn>
          </ElTable>
        </div>
        <div class="pagination-footer">
          <ElButton size="small" plain :disabled="page <= 1" @click="goToPage(1)">«</ElButton>
          <ElButton size="small" plain :disabled="page <= 1" @click="changePage('prev')">Prev</ElButton>
          <div class="page-indicator">Page {{ page }} of {{ totalPages }}</div>
          <ElButton
            size="small"
            plain
            :disabled="page >= totalPages && !hasMore"
            :loading="loadingMore && page >= totalPages"
            @click="changePage('next')"
          >
            Next
          </ElButton>
        </div>
      </div>
    </ElCard>

    <div v-else class="text-sm text-slate-500">
      Customers appear after checkout. Complete a service to see history.
    </div>

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
.customers-page :deep(.el-table) {
  font-size: 1rem;
}
.customers-page :deep(.el-input__wrapper) {
  padding: 12px 14px;
  min-height: 44px;
}
.customers-page :deep(.el-button) {
  font-size: 1rem;
}
.table-shell {
  display: flex;
  flex-direction: column;
  max-height: 70vh;
}
.table-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding-bottom: 12px;
}
.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.pagination-footer {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid #e5e7eb;
  padding: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}
.page-indicator {
  font-size: 13px;
  color: #475569;
  padding: 6px 10px;
  border-radius: 12px;
  background: #f1f5f9;
}
.table-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.action-btn-text {
  min-width: 72px;
}
.actions-col {
  min-width: 240px;
  max-width: 300px;
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
.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}
</style>
