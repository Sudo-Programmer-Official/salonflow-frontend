<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElTag, ElMessage, ElProgress } from 'element-plus';
import { fetchPlatformTenants, type PlatformTenantRow, fetchPlatformUsageOverview } from '../../api/platform';
import { useRouter } from 'vue-router';

const router = useRouter();
const tenants = ref<PlatformTenantRow[]>([]);
const loading = ref(false);
const smsSentTotal = ref(0);
const smsBlockedTotal = ref(0);
const emailSentTotal = ref(0);

const load = async () => {
  loading.value = true;
  try {
    const [tenantRows, overview] = await Promise.all([fetchPlatformTenants(), fetchPlatformUsageOverview()]);
    tenants.value = tenantRows;
    smsSentTotal.value = Number(overview.sms_sent ?? 0);
    smsBlockedTotal.value = Number(overview.sms_blocked_cap ?? 0);
    emailSentTotal.value = Number(overview.email_sent ?? 0);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load tenants');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const statusType = (status: string) => (status === 'active' ? 'success' : 'danger');

const goTo = (id: string) => {
  router.push({ name: 'platform-tenant', params: { businessId: id } });
};

const smsProgress = (row: PlatformTenantRow) => {
  const cap = Number(row.sms_cap ?? 0) || 0;
  if (cap <= 0) return 0;
  return Math.min(100, Math.round((Number(row.sms_sent ?? 0) / cap) * 100));
};
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Platform Overview</h1>
      <p class="text-sm text-slate-600">Read-only visibility across all salons.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ElCard class="bg-white">
        <div class="text-sm text-slate-600">SMS sent (MTD)</div>
        <div class="text-2xl font-semibold text-slate-900">{{ smsSentTotal }}</div>
      </ElCard>
      <ElCard class="bg-white">
        <div class="text-sm text-slate-600">SMS blocked by caps (MTD)</div>
        <div class="text-2xl font-semibold text-slate-900">{{ smsBlockedTotal }}</div>
      </ElCard>
      <ElCard class="bg-white">
        <div class="text-sm text-slate-600">Email sent (MTD)</div>
        <div class="text-2xl font-semibold text-slate-900">{{ emailSentTotal }}</div>
      </ElCard>
    </div>

    <ElCard class="bg-white">
      <ElTable :data="tenants" :loading="loading" style="width: 100%" stripe>
        <ElTableColumn prop="name" label="Name" min-width="160" />
        <ElTableColumn prop="subdomain" label="Subdomain" min-width="140" />
        <ElTableColumn prop="created_at" label="Created" min-width="160" />
        <ElTableColumn label="SMS (MTD)" min-width="200">
          <template #default="{ row }">
            <div class="flex flex-col gap-1">
              <div class="flex justify-between text-xs text-slate-600">
                <span>Sent {{ row.sms_sent }}</span>
                <span>Cap {{ row.sms_cap }}</span>
              </div>
              <ElProgress :percentage="smsProgress(row)" :stroke-width="10" />
              <div class="text-2xs text-slate-500">Blocked: {{ row.sms_blocked_cap }}</div>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Status" width="120">
          <template #default="{ row }">
            <ElTag :type="statusType(row.status)" effect="light">{{ row.status }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Details" width="120">
          <template #default="{ row }">
            <a class="text-slate-700 underline" @click.prevent="goTo(row.businessId)">View</a>
          </template>
        </ElTableColumn>
      </ElTable>
      <div v-if="!loading && tenants.length === 0" class="py-6 text-center text-sm text-slate-500">
        No tenants found.
      </div>
    </ElCard>
  </div>
</template>
