<script setup lang="ts">
import { ref } from 'vue';
import { ElCard, ElInput, ElTable, ElTableColumn, ElTag, ElButton, ElMessage, ElDrawer, ElTooltip } from 'element-plus';
import dayjs from 'dayjs';
import {
  searchCustomers,
  fetchCustomerTimeline,
  fetchCustomers,
  type CustomerSearchResult,
  type CustomerTimeline as CustomerTimelineType,
  sendCustomerReminder,
  sendCustomerFeedback,
} from '../../api/customers';
import CustomerTimeline from '../../components/CustomerTimeline.vue';

const query = ref('');
const loading = ref(false);
const errorMessage = ref('');
const results = ref<CustomerSearchResult[]>([]);
const timelineOpen = ref(false);
const timelineLoading = ref(false);
const timeline = ref<CustomerTimelineType | null>(null);

const doSearch = async () => {
  if (!query.value.trim()) {
    await loadAll();
    return;
  }
  loading.value = true;
  errorMessage.value = '';
  try {
    results.value = await searchCustomers(query.value.trim());
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to search customers');
    errorMessage.value = err instanceof Error ? err.message : 'Failed to search customers';
  } finally {
    loading.value = false;
  }
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  return dayjs(value).format('MMM D, YYYY');
};

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

const loadAll = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    results.value = await fetchCustomers('all');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load customers');
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load customers';
  } finally {
    loading.value = false;
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
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Customers</h1>
      <p class="text-sm text-slate-600">
        Search by name or phone to see visit history. Customers appear after their first visit or checkout.
      </p>
    </div>

    <ElCard class="bg-white">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <ElInput
          v-model="query"
          placeholder="Search by name or phone"
          clearable
          @keyup.enter="doSearch"
        />
        <ElButton type="primary" :loading="loading" @click="doSearch">Search</ElButton>
      </div>
      <div v-if="errorMessage" class="mt-3 text-sm text-amber-700">
        {{ errorMessage }}
      </div>
    </ElCard>

    <ElCard v-if="results.length > 0" class="bg-white">
      <ElTable :data="results" style="width: 100%">
        <ElTableColumn label="Customer">
          <template #default="{ row }">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                {{ row.name?.charAt(0)?.toUpperCase() || '?' }}
              </div>
              <div class="space-y-1">
                <div class="text-sm font-semibold text-slate-900">👤 {{ row.name }}</div>
                <div class="text-xs text-slate-700">📞 {{ row.phoneE164 || '—' }}</div>
              </div>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Activity" width="200">
          <template #default="{ row }">
            <div class="space-y-1 text-xs text-slate-700">
              <div>
                Last visit:
                <ElTooltip :content="row.lastVisitAt || '—'" placement="top">
                  <span class="font-medium">{{ formatDate(row.lastVisitAt) }}</span>
                </ElTooltip>
              </div>
              <div>Visits: {{ row.visitCount ?? 0 }}</div>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Loyalty" width="200">
          <template #default="{ row }">
            <div class="space-y-1 text-xs text-slate-700">
              <div class="flex items-center gap-1">
                <span>⭐</span>
                <span :class="(row.pointsBalance ?? 0) >= 300 ? 'text-emerald-600 font-semibold' : 'text-slate-700'">
                  {{ row.pointsBalance ?? 0 }} pts
                </span>
              </div>
              <ElTag effect="light">
                {{ row.type.toUpperCase() }}
              </ElTag>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Consent" width="100">
          <template #default="{ row }">
            <ElTag :type="row.reviewSmsConsent ? 'success' : 'info'" effect="light">
              {{ row.reviewSmsConsent ? 'Yes' : 'No' }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Actions" width="220">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-2">
              <ElButton
                size="small"
                type="primary"
                plain
                :disabled="!canSendReminder(row)"
                @click="sendReminderAction(row)"
              >
                🔔 Reminder
              </ElButton>
              <ElButton
                size="small"
                type="success"
                plain
                :disabled="!canSendFeedback(row)"
                @click="sendFeedbackAction(row)"
              >
                📩 Feedback
              </ElButton>
              <ElButton size="small" @click="openTimeline(row.id)">👁 View</ElButton>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <div v-else class="text-sm text-slate-500">
      Customers appear after checkout. Complete a service to see history.
    </div>

    <ElDrawer v-model="timelineOpen" title="Customer Timeline" size="30%">
      <div v-if="timelineLoading" class="text-sm text-slate-500">Loading timeline...</div>
      <CustomerTimeline v-else :timeline="timeline" />
    </ElDrawer>
  </div>
</template>
