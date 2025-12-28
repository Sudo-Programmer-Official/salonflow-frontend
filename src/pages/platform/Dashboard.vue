<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElTag, ElMessage } from 'element-plus';
import { fetchTenants, type TenantOverview } from '../../api/superadmin';
import { useRouter } from 'vue-router';

const router = useRouter();
const tenants = ref<TenantOverview[]>([]);
const loading = ref(false);
const avgSms = ref(0);

const load = async () => {
  loading.value = true;
  try {
    const data = await fetchTenants();
    tenants.value = data.tenants;
    avgSms.value = data.averages.avgSmsPerSalon;
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
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Platform Overview</h1>
      <p class="text-sm text-slate-600">Read-only visibility across all salons.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ElCard class="bg-white">
        <div class="text-sm text-slate-600">Avg SMS / salon (this month)</div>
        <div class="text-2xl font-semibold text-slate-900">{{ avgSms }}</div>
      </ElCard>
    </div>

    <ElCard class="bg-white">
      <ElTable :data="tenants" :loading="loading" style="width: 100%" stripe>
        <ElTableColumn prop="name" label="Name" min-width="160" />
        <ElTableColumn prop="subdomain" label="Subdomain" min-width="140" />
        <ElTableColumn prop="createdAt" label="Created" min-width="160" />
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
