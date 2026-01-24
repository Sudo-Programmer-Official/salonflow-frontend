<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElButton, ElCard, ElDialog, ElForm, ElFormItem, ElInput, ElMessage, ElSelect, ElOption, ElSwitch, ElTable, ElTableColumn } from 'element-plus';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { fetchPlatformNumbers, reassignNumber, setNumberActive, type PlatformNumber, type PlatformNumberAudit } from '../../api/platformNumbers';
import { fetchTenants } from '../../api/superadmin';

dayjs.extend(relativeTime);

const numbers = ref<PlatformNumber[]>([]);
const audit = ref<PlatformNumberAudit[]>([]);
const loading = ref(false);
const dialogOpen = ref(false);
const selectedId = ref<string | null>(null);
const formTenant = ref<string>('');
const formNote = ref('');
const tenants = ref<{ id: string; name: string }[]>([]);
const toggling = ref(false);

const loadData = async () => {
  loading.value = true;
  try {
    const data = await fetchPlatformNumbers();
    numbers.value = data.numbers;
    audit.value = data.audit;
    const tenantList = await fetchTenants();
    tenants.value = tenantList.tenants.map((t: any) => ({ id: t.businessId || t.id, name: t.name }));
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load');
  } finally {
    loading.value = false;
  }
};

const openReassign = (id: string) => {
  selectedId.value = id;
  formTenant.value = '';
  formNote.value = '';
  dialogOpen.value = true;
};

const selectedNumber = computed(() => numbers.value.find((n) => n.id === selectedId.value));

const reassignWarning = computed(() => {
  const num = selectedNumber.value;
  if (!num) return null;
  const warnings: string[] = [];
  if (num.openConversations && num.openConversations > 0) {
    warnings.push(`${num.openConversations} open conversation${num.openConversations > 1 ? 's' : ''} on this number`);
  }
  if (num.lastReassignAt) {
    const minutes = dayjs().diff(dayjs(num.lastReassignAt), 'minute');
    if (minutes < 60) warnings.push('Recently reassigned (within last hour)');
  }
  return warnings.length ? warnings.join(' • ') : null;
});

const submitReassign = async () => {
  if (!selectedId.value || !formTenant.value) {
    ElMessage.warning('Select tenant');
    return;
  }
  try {
    await reassignNumber(selectedId.value, formTenant.value, formNote.value || undefined);
    ElMessage.success('Reassigned');
    dialogOpen.value = false;
    await loadData();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to reassign');
  }
};

const toggleActive = async (row: PlatformNumber) => {
  toggling.value = true;
  try {
    await setNumberActive(row.id, !row.active);
    await loadData();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to update');
  } finally {
    toggling.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="space-y-4">
    <ElCard>
      <div class="flex items-center justify-between mb-3">
        <div>
          <div class="text-lg font-semibold">Messaging Numbers</div>
          <div class="text-xs text-slate-500">Platform-managed number ↔ tenant assignments</div>
        </div>
        <ElButton size="small" @click="loadData" :loading="loading">Refresh</ElButton>
      </div>
      <ElTable :data="numbers" stripe :loading="loading" height="520">
        <ElTableColumn label="Phone" prop="phoneE164" width="180" />
        <ElTableColumn label="Tenant" width="220">
          <template #default="{ row }">
            <div class="leading-tight">
              <div class="font-medium">{{ row.tenantName || 'Unassigned' }}</div>
              <div class="text-xs text-slate-500">{{ row.tenantSubdomain ? row.tenantSubdomain + '.salonflow.studio' : '—' }}</div>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Open conv." width="120">
          <template #default="{ row }">{{ row.openConversations ?? 0 }}</template>
        </ElTableColumn>
        <ElTableColumn label="Provider" prop="provider" width="120" />
        <ElTableColumn label="Active" width="120">
          <template #default="{ row }">
            <ElSwitch :model-value="row.active" @change="() => toggleActive(row)" :loading="toggling" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="Last reassigned" width="170">
          <template #default="{ row }">
            <span>{{ row.lastReassignAt ? dayjs(row.lastReassignAt).fromNow() : '—' }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Created" width="170">
          <template #default="{ row }">{{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}</template>
        </ElTableColumn>
        <ElTableColumn label="Actions" width="140">
          <template #default="{ row }">
            <ElButton size="small" @click="openReassign(row.id)">Reassign</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElCard>
      <div class="mb-2 text-sm font-semibold">Audit (latest 200)</div>
      <ElTable :data="audit" height="260">
        <ElTableColumn prop="phoneE164" label="Phone" width="160" />
        <ElTableColumn prop="fromTenantId" label="From" width="160" />
        <ElTableColumn prop="toTenantId" label="To" width="160" />
        <ElTableColumn prop="action" label="Action" width="120" />
        <ElTableColumn prop="actor" label="Actor" width="160" />
        <ElTableColumn prop="note" label="Note" />
        <ElTableColumn label="At" width="180">
          <template #default="{ row }">{{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}</template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElDialog v-model="dialogOpen" title="Reassign number" width="420px">
      <div v-if="reassignWarning" class="bg-amber-50 text-amber-800 border border-amber-200 rounded px-3 py-2 text-xs mb-3">
        {{ reassignWarning }}
      </div>
      <ElForm label-position="top">
        <ElFormItem label="New tenant">
          <ElSelect v-model="formTenant" filterable placeholder="Select tenant">
            <ElOption v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="Internal note (optional)">
          <ElInput v-model="formNote" type="textarea" :rows="2" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogOpen = false">Cancel</ElButton>
        <ElButton type="primary" @click="submitReassign">Reassign</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
