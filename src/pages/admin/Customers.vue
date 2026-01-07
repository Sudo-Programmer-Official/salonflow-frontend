<script setup lang="ts">
import { ref } from 'vue';
import { ElCard, ElInput, ElTable, ElTableColumn, ElTag, ElButton, ElMessage, ElDrawer } from 'element-plus';
import dayjs from 'dayjs';
import {
  searchCustomers,
  fetchCustomerTimeline,
  fetchCustomers,
  type CustomerSearchResult,
  type CustomerTimeline as CustomerTimelineType,
} from '../../api/customers';
import CustomerTimeline from '../../components/CustomerTimeline.vue';

const query = ref('');
const loading = ref(false);
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
  try {
    results.value = await searchCustomers(query.value.trim());
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to search customers');
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
  try {
    results.value = await fetchCustomers('all');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load customers');
  } finally {
    loading.value = false;
  }
};

loadAll();
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
    </ElCard>

    <ElCard v-if="results.length > 0" class="bg-white">
      <ElTable :data="results" style="width: 100%">
        <ElTableColumn label="Name" prop="name" />
        <ElTableColumn label="Phone" prop="phoneE164" />
        <ElTableColumn label="Visits" prop="visitCount" width="90" />
        <ElTableColumn label="Last Visit" width="150">
          <template #default="{ row }">
            {{ formatDate(row.lastVisitAt) }}
          </template>
        </ElTableColumn>
      <ElTableColumn label="Consent" width="110">
        <template #default="{ row }">
          <ElTag :type="row.reviewSmsConsent ? 'success' : 'info'" effect="light">
            {{ row.reviewSmsConsent ? 'Yes' : 'No' }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Points" width="90">
        <template #default="{ row }">
          {{ (row as any).pointsBalance ?? 0 }}
        </template>
      </ElTableColumn>
        <ElTableColumn label="Segment" width="110">
          <template #default="{ row }">
            <ElTag effect="light">
              {{ row.type.toUpperCase() }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Actions" width="120">
          <template #default="{ row }">
            <ElButton size="small" @click="openTimeline(row.id)">View</ElButton>
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
