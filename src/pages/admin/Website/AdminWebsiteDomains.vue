<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  ElCard,
  ElTable,
  ElTableColumn,
  ElButton,
  ElTag,
  ElDialog,
  ElInput,
  ElMessage,
} from 'element-plus';
import {
  fetchWebsiteDomains,
  addWebsiteDomain,
  verifyWebsiteDomain,
  updateWebsiteSite,
  type WebsiteDomain,
} from '../../../api/website';

const loading = ref(false);
const domains = ref<WebsiteDomain[]>([]);
const modalOpen = ref(false);
const newDomain = ref('');
const verifying = ref<string | null>(null);

const load = async () => {
  loading.value = true;
  try {
    domains.value = await fetchWebsiteDomains();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load domains');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const addDomainHandler = async () => {
  if (!newDomain.value.trim()) {
    ElMessage.warning('Enter a domain');
    return;
  }
  try {
    await addWebsiteDomain(newDomain.value.trim());
    newDomain.value = '';
    modalOpen.value = false;
    await load();
    ElMessage.success('Domain added');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to add domain');
  }
};

const verify = async (id: string, makePrimary = false) => {
  verifying.value = id;
  try {
    await verifyWebsiteDomain(id, makePrimary);
    if (makePrimary) {
      await updateWebsiteSite({ primaryDomainId: id });
    }
    await load();
    ElMessage.success('Verification complete');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Verification failed');
  } finally {
    verifying.value = null;
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Domains</h1>
        <p class="text-sm text-slate-600">Connect your custom domain. CNAME only.</p>
      </div>
      <ElButton type="primary" @click="modalOpen = true">Add domain</ElButton>
    </div>

    <ElCard shadow="never" class="border border-slate-200">
      <div class="mb-3 text-sm text-slate-700">
        DNS instructions:
        <ul class="list-disc pl-5 mt-1 space-y-1">
          <li><strong>Type:</strong> CNAME</li>
          <li><strong>Host:</strong> www</li>
          <li><strong>Value:</strong> cname.salonflow.studio</li>
        </ul>
      </div>

      <ElTable :data="domains" :loading="loading" style="width: 100%">
        <ElTableColumn prop="domain" label="Domain" min-width="220" />
        <ElTableColumn label="Status" width="140">
          <template #default="{ row }">
            <ElTag :type="row.verified ? 'success' : 'info'">{{ row.verified ? 'Verified' : 'Pending' }}</ElTag>
            <ElTag v-if="row.is_primary" type="warning" class="ml-1">Primary</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Actions" width="220">
          <template #default="{ row }">
            <ElButton
              size="small"
              :loading="verifying === row.id"
              :disabled="row.verified"
              @click="verify(row.id, false)"
            >
              Verify
            </ElButton>
            <ElButton
              size="small"
              type="primary"
              plain
              :loading="verifying === row.id"
              :disabled="!row.verified || row.is_primary"
              @click="verify(row.id, true)"
            >
              Make primary
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElDialog v-model="modalOpen" title="Add domain" width="420px">
      <div class="space-y-2">
        <div class="text-sm text-slate-700">Enter your custom domain (e.g., www.example.com).</div>
        <ElInput v-model="newDomain" placeholder="www.example.com" />
      </div>
      <template #footer>
        <ElButton @click="modalOpen = false">Cancel</ElButton>
        <ElButton type="primary" @click="addDomainHandler">Add</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
