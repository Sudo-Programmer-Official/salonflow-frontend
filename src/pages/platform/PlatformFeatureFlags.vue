<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElCard, ElTable, ElTableColumn, ElSwitch, ElInputNumber, ElDatePicker, ElButton, ElMessage } from 'element-plus';
import { apiUrl, buildHeaders } from '../../api/client';

type FeatureRow = {
  feature_key: string;
  enabled: boolean;
  quota: number | null;
  expires_at: string | null;
};

const route = useRoute();
const businessId = ref<string>((route.query.businessId as string) || '');
const loading = ref(false);
const saving = ref(false);
const items = ref<FeatureRow[]>([
  { feature_key: 'reviews', enabled: false, quota: null, expires_at: null },
  { feature_key: 'google_sync', enabled: false, quota: null, expires_at: null },
  { feature_key: 'social_posting', enabled: false, quota: null, expires_at: null },
  { feature_key: 'ai_assist', enabled: false, quota: null, expires_at: null },
]);
const grants = ref<any[]>([]);
const grantForm = ref({
  feature_key: 'social_posting',
  quota: null as number | null,
  expires_at: null as string | null,
  reason: 'founder',
});

const headers = () => buildHeaders({ auth: true, json: true });

const load = async () => {
  if (!businessId.value) return;
  loading.value = true;
  try {
    const res = await fetch(apiUrl(`/platform/features/${businessId.value}`), { headers: headers() });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to load features');
    const map = new Map(body.items.map((i: FeatureRow) => [i.feature_key, i]));
    items.value = items.value.map((row) => {
      const incoming = map.get(row.feature_key);
      return incoming ? { ...row, ...incoming } : row;
    });
  } catch (err: any) {
    ElMessage.error(err?.message || 'Load failed');
  } finally {
    loading.value = false;
  }

  // Load grants
  try {
    const res = await fetch(apiUrl(`/platform/grants/${businessId.value}`), { headers: headers() });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to load grants');
    grants.value = body.grants || [];
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load grants');
  }
};

onMounted(load);

const save = async () => {
  if (!businessId.value) {
    ElMessage.warning('Enter businessId');
    return;
  }
  saving.value = true;
  try {
    const res = await fetch(apiUrl(`/platform/features/${businessId.value}`), {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ items: items.value }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Save failed');
    ElMessage.success('Saved');
    await load();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Save failed');
  } finally {
    saving.value = false;
  }
};

const addGrant = async () => {
  if (!businessId.value) return ElMessage.warning('Enter businessId');
  try {
    const res = await fetch(apiUrl(`/platform/grants/${businessId.value}`), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        feature_key: grantForm.value.feature_key,
        enabled: true,
        quota: grantForm.value.quota,
        reason: grantForm.value.reason,
        expires_at: grantForm.value.expires_at,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to add grant');
    ElMessage.success('Grant added');
    await load();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to add grant');
  }
};

const revokeGrant = async (id: string) => {
  if (!businessId.value) return;
  try {
    const res = await fetch(apiUrl(`/platform/grants/${businessId.value}/${id}`), {
      method: 'DELETE',
      headers: headers(),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to revoke grant');
    }
    ElMessage.success('Grant revoked');
    await load();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to revoke grant');
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Feature Flags</h1>
        <p class="text-sm text-slate-600">Enable/disable growth modules per tenant (SUPER_ADMIN).</p>
      </div>
      <div class="flex gap-2">
        <input
          v-model="businessId"
          placeholder="businessId"
          class="rounded border px-2 py-1 text-sm border-slate-300"
          style="min-width: 260px"
        />
        <ElButton size="small" @click="load">Load</ElButton>
      </div>
    </div>

    <ElCard shadow="never" class="border border-slate-200" :loading="loading">
      <ElTable :data="items" style="width: 100%">
        <ElTableColumn prop="feature_key" label="Feature" width="160" />
        <ElTableColumn label="Enabled" width="120">
          <template #default="{ row }">
            <ElSwitch v-model="row.enabled" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="Quota" width="160">
          <template #default="{ row }">
            <ElInputNumber v-model="row.quota" :min="0" :controls="false" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="Expires" width="220">
          <template #default="{ row }">
            <ElDatePicker v-model="row.expires_at" type="date" placeholder="None" style="width: 100%" />
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="flex justify-end mt-3">
        <ElButton type="primary" :loading="saving" @click="save">Save</ElButton>
      </div>
    </ElCard>

    <ElCard shadow="never" class="border border-slate-200">
      <div class="flex items-center justify-between mb-3">
        <div>
          <div class="text-lg font-semibold">Grants</div>
          <p class="text-sm text-slate-600">Founder / promo overrides (expire automatically if set).</p>
        </div>
        <div class="flex flex-wrap gap-2 items-center">
          <select v-model="grantForm.feature_key" class="rounded border px-2 py-1 text-sm border-slate-300">
            <option value="reviews">Reviews</option>
            <option value="google_sync">Google Sync</option>
            <option value="social_posting">Social Posting</option>
            <option value="ai_assist">AI Assist</option>
          </select>
          <ElInputNumber v-model="grantForm.quota" :min="0" :controls="false" placeholder="Quota (optional)" />
          <ElDatePicker v-model="grantForm.expires_at" type="date" placeholder="Expires" style="width: 140px" />
          <input v-model="grantForm.reason" placeholder="Reason" class="rounded border px-2 py-1 text-sm border-slate-300" />
          <ElButton size="small" type="primary" @click="addGrant">Add grant</ElButton>
        </div>
      </div>
      <ElTable :data="grants" style="width: 100%">
        <ElTableColumn prop="feature_key" label="Feature" width="160" />
        <ElTableColumn prop="quota" label="Quota" width="120" />
        <ElTableColumn prop="reason" label="Reason" width="140" />
        <ElTableColumn prop="expires_at" label="Expires" width="160" />
        <ElTableColumn label="Actions" width="120">
          <template #default="{ row }">
            <ElButton size="small" type="danger" plain @click="revokeGrant(row.id)">Revoke</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>
