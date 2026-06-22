<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  ElCard,
  ElTable,
  ElTableColumn,
  ElTag,
  ElButton,
  ElDrawer,
  ElSelect,
  ElOption,
  ElPagination,
  ElMessage,
} from 'element-plus';
import dayjs from 'dayjs';
import {
  fetchDemoRequests,
  updateDemoRequestStatus,
  type DemoRequest,
} from '../../api/platform/demoRequests';

const requests = ref<DemoRequest[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const loading = ref(false);
const drawerOpen = ref(false);
const selected = ref<DemoRequest | null>(null);
const saving = ref(false);
const statusOptions = ['NEW', 'CONTACTED', 'CONVERTED', 'DISQUALIFIED', 'CLOSED'];
const detailSummary = (row: DemoRequest | null) =>
  row?.details?.summary || row?.notes || '—';
const fieldValue = (row: DemoRequest | null, key: string) => {
  const value = row?.details?.[key];
  if (typeof value !== 'string' || !value.trim()) return '—';
  return value;
};
const statusLabel = (row: DemoRequest) =>
  row.isDraft ? `DRAFT${row.progressStep ? ` · STEP ${row.progressStep}/7` : ''}` : row.status;

const load = async (nextPage = page.value) => {
  loading.value = true;
  try {
    const response = await fetchDemoRequests({ page: nextPage, pageSize: pageSize.value });
    requests.value = response.requests;
    page.value = response.pagination.page;
    pageSize.value = response.pagination.pageSize;
    total.value = response.pagination.total;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load demo requests');
  } finally {
    loading.value = false;
  }
};

const openDrawer = (row: DemoRequest) => {
  selected.value = { ...row };
  drawerOpen.value = true;
};

const saveStatus = async () => {
  if (!selected.value) return;
  saving.value = true;
  try {
    await updateDemoRequestStatus(selected.value.id, selected.value.status);
    ElMessage.success('Status updated');
    await load();
    drawerOpen.value = false;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to update status');
  } finally {
    saving.value = false;
  }
};

const formatDate = (iso: string) => dayjs(iso).format('MMM D, YYYY HH:mm');
const onPageChange = (nextPage: number) => load(nextPage);
const onPageSizeChange = (nextPageSize: number) => {
  pageSize.value = nextPageSize;
  load(1);
};

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Demo Requests</h1>
      <p class="text-sm text-slate-600">Platform-level inbox of incoming demo requests.</p>
    </div>

    <ElCard class="bg-white" :loading="loading">
      <div class="mb-4 flex items-center justify-between gap-3">
        <div class="text-sm text-slate-600">
          Showing {{ requests.length }} of {{ total }} requests
        </div>
        <ElButton :loading="loading" @click="load(page)">Refresh</ElButton>
      </div>
      <ElTable :data="requests" stripe style="width: 100%" v-loading="loading">
        <ElTableColumn prop="name" label="Name" />
        <ElTableColumn prop="email" label="Email" />
        <ElTableColumn prop="phone" label="Phone" />
        <ElTableColumn label="Submitted">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="Status" width="140">
          <template #default="{ row }">
            <ElTag effect="light">{{ statusLabel(row) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Actions" width="120">
          <template #default="{ row }">
            <ElButton size="small" @click="openDrawer(row)">View</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div v-if="!loading && requests.length === 0" class="py-6 text-center text-sm text-slate-500">
        No demo requests yet.
      </div>
      <div class="mt-4 flex justify-end" v-if="total > pageSize">
        <ElPagination
          background
          layout="prev, pager, next, sizes, total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          @current-change="onPageChange"
          @size-change="onPageSizeChange"
        />
      </div>
    </ElCard>

    <ElDrawer v-model="drawerOpen" title="Demo request" size="30%">
      <div v-if="selected" class="space-y-3 text-sm text-slate-800">
        <div>
          <div class="text-xs text-slate-500">Name</div>
          <div class="font-semibold">{{ selected.name }}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">Email</div>
          <div>{{ selected.email }}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">Phone</div>
          <div>{{ selected.phone || '—' }}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">Submitted</div>
          <div>{{ formatDate(selected.createdAt) }}</div>
        </div>
        <div v-if="selected.updatedAt">
          <div class="text-xs text-slate-500">Last updated</div>
          <div>{{ formatDate(selected.updatedAt) }}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">Source</div>
          <div>{{ selected.source || 'website form' }}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">Country</div>
          <div>{{ fieldValue(selected, 'country') }}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">Website</div>
          <div class="break-all">{{ fieldValue(selected, 'website') }}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">Google Business URL</div>
          <div class="break-all">{{ fieldValue(selected, 'googleBusinessUrl') }}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">Instagram handle</div>
          <div>{{ fieldValue(selected, 'instagramHandle') }}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">Time zone</div>
          <div>{{ fieldValue(selected, 'timezone') }}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">State</div>
          <div>{{ statusLabel(selected) }}</div>
        </div>
        <div v-if="selected.details?.businessName">
          <div class="text-xs text-slate-500">Salon</div>
          <div>{{ selected.details.businessName }}</div>
        </div>
        <div v-if="selected.details?.primaryGoal">
          <div class="text-xs text-slate-500">Primary goal</div>
          <div>{{ selected.details.primaryGoal }}</div>
        </div>
        <div v-if="selected.details?.teamSize">
          <div class="text-xs text-slate-500">Team size</div>
          <div>{{ selected.details.teamSize }}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">Lead summary</div>
          <div class="whitespace-pre-line">{{ detailSummary(selected) }}</div>
        </div>
        <div v-if="selected.details?.biggestPain">
          <div class="text-xs text-slate-500">Biggest pain</div>
          <div class="whitespace-pre-line">{{ selected.details.biggestPain }}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">Status</div>
          <ElSelect v-model="selected.status" placeholder="Select status" class="w-full">
            <ElOption v-for="s in statusOptions" :key="s" :label="s" :value="s" />
          </ElSelect>
        </div>
        <ElButton type="primary" class="w-full" :loading="saving" @click="saveStatus">
          Save status
        </ElButton>
      </div>
    </ElDrawer>
  </div>
</template>
