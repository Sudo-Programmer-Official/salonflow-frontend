<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import {
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElAlert,
  ElTag,
  ElButton,
  ElMessage,
  ElTooltip,
  ElInput,
  ElCheckbox,
  ElTable,
  ElTableColumn,
  ElSwitch,
  ElDialog,
  ElForm,
  ElFormItem,
} from 'element-plus';
import { fetchTenantDetail, impersonateTenant, type TenantOverview, type TenantMetrics } from '../../api/superadmin';
import { fetchPlatformLimits, updatePlatformLimits } from '../../api/platform';
import {
  fetchTenantControl,
  fetchTenantAudit,
  forceLogoutTenant,
  resetTenantUsage,
  updateTenantControl,
  type TenantControl,
  type PlatformAuditRow,
} from '../../api/platformTenantControls';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const businessId = computed(() => route.params.businessId as string | undefined);
const tenant = ref<TenantOverview | null>(null);
const metrics = ref<TenantMetrics | null>(null);
const loading = ref(false);
const error = ref('');
const impersonating = ref(false);
const limits = ref<any | null>(null);
const limitsLoading = ref(false);
const limitsDialog = ref(false);
const savingLimits = ref(false);

const controls = ref<TenantControl | null>(null);
const controlDraft = ref<Partial<TenantControl>>({});
const savingControls = ref(false);
const audit = ref<PlatformAuditRow[]>([]);
const reasonDialog = ref(false);
const pendingPayload = ref<Record<string, any> | null>(null);
const pendingAction = ref<'controls' | 'force-logout' | 'reset-usage' | null>(null);
const reasonText = ref('');
const reasonDialogTitle = computed(() => {
  if (pendingAction.value === 'force-logout') return 'Reason for force logout';
  if (pendingAction.value === 'reset-usage') return 'Reason for reset usage';
  return 'Reason required';
});

const statusType = (status: string) => (status === 'active' ? 'success' : 'danger');

const reasonRequiredFields: (keyof TenantControl)[] = [
  'status',
  'sms_blocked',
  'email_blocked',
  'allow_transactional_only',
  'frozen',
];

const load = async () => {
  if (!businessId.value) {
    router.replace({ name: 'platform-dashboard' });
    return;
  }
  loading.value = true;
  try {
    const res = await fetchTenantDetail(businessId.value);
    tenant.value = res.tenant;
    metrics.value = res.metrics;
    await Promise.all([loadLimits(), loadControls(), loadAudit()]);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load tenant';
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const impersonate = async () => {
  if (!businessId.value) return;
  impersonating.value = true;
  try {
    const result = await impersonateTenant(businessId.value);
    localStorage.setItem('impersonationOriginalToken', localStorage.getItem('token') || '');
    localStorage.setItem('impersonationOriginalRole', localStorage.getItem('role') || '');
    localStorage.setItem('impersonationOriginalTenant', localStorage.getItem('tenantId') || '');
    localStorage.setItem('impersonationActive', 'true');
    if (tenant.value?.name) {
      localStorage.setItem('impersonationBusinessName', tenant.value.name);
    }

    localStorage.setItem('token', result.token);
    localStorage.setItem('role', result.role);
    localStorage.setItem('tenantId', result.businessId);
    if (result.email) localStorage.setItem('email', result.email);

    const subdomain = tenant.value?.subdomain ?? '';
    const host = typeof window !== 'undefined' ? window.location.host : '';
    const baseDomain = host.split('.').slice(1).join('.') || 'localhost:5173';
    const target = subdomain ? `http://${subdomain}.${baseDomain}/admin` : '/admin';
    window.location.href = target;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to impersonate');
  } finally {
    impersonating.value = false;
  }
};

const isPlatformTenant = computed(() => tenant.value?.subdomain === 'platform');

const openTenantAdmin = () => {
  if (!tenant.value) return;
  const subdomain = tenant.value.subdomain ?? '';
  const host = typeof window !== 'undefined' ? window.location.host : '';
  const baseDomain = host.split('.').slice(1).join('.') || 'localhost:5173';
  const target = subdomain ? `http://${subdomain}.${baseDomain}/admin` : '/admin';
  window.open(target, '_blank', 'noopener,noreferrer');
};

const openKiosk = () => {
  if (!tenant.value) return;
  const subdomain = tenant.value.subdomain ?? '';
  const host = typeof window !== 'undefined' ? window.location.host : '';
  const baseDomain = host.split('.').slice(1).join('.') || 'localhost:5173';
  const target = subdomain ? `http://${subdomain}.${baseDomain}/check-in/kiosk` : '/check-in/kiosk';
  window.open(target, '_blank', 'noopener,noreferrer');
};

const loadLimits = async () => {
  limitsLoading.value = true;
  try {
    if (!businessId.value) return;
    limits.value = await fetchPlatformLimits(businessId.value);
  } catch (err) {
    // silent
  } finally {
    limitsLoading.value = false;
  }
};

const openLimits = () => {
  limitsDialog.value = true;
};

const saveLimits = async () => {
  if (!limits.value || !businessId.value) return;
  savingLimits.value = true;
  try {
    await updatePlatformLimits(businessId.value, limits.value);
    ElMessage.success('Limits updated');
    limitsDialog.value = false;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to update limits');
  } finally {
    savingLimits.value = false;
  }
};

const loadControls = async () => {
  if (!businessId.value) return;
  try {
    const res = await fetchTenantControl(businessId.value);
    controls.value = res.control;
    controlDraft.value = { ...res.control };
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load controls');
  }
};

const loadAudit = async () => {
  if (!businessId.value) return;
  try {
    audit.value = await fetchTenantAudit(businessId.value, 50);
  } catch {
    audit.value = [];
  }
};

const fields: (keyof TenantControl)[] = [
  'status',
  'maintenance_message',
  'disabled_reason',
  'sms_blocked',
  'email_blocked',
  'allow_promotions',
  'allow_transactional_only',
  'is_demo',
  'demo_expires_at',
  'sms_daily_cap',
  'email_daily_cap',
  'frozen',
];

const isDirty = computed(() => {
  if (!controls.value) return false;
  return fields.some((f) => controlDraft.value[f] !== controls.value?.[f]);
});

const buildPayload = () => {
  if (!controls.value) return {};
  const payload: Record<string, any> = {};
  fields.forEach((f) => {
    if (controlDraft.value[f] !== controls.value?.[f]) {
      payload[f] = controlDraft.value[f];
    }
  });
  return payload;
};

const needsReason = (payload: Record<string, any>) =>
  reasonRequiredFields.some((f) => Object.prototype.hasOwnProperty.call(payload, f));

const persistControls = async (payload: Record<string, any>, reason?: string) => {
  if (!businessId.value) return;
  savingControls.value = true;
  try {
    const updated = await updateTenantControl(businessId.value, {
      ...payload,
      ...(reason ? { reason } : {}),
    });
    controls.value = updated;
    controlDraft.value = { ...updated };
    reasonText.value = '';
    await loadAudit();
    ElMessage.success('Controls saved');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save controls');
  } finally {
    savingControls.value = false;
    pendingPayload.value = null;
    reasonDialog.value = false;
    pendingAction.value = null;
  }
};

const openReasonModal = (action: 'controls' | 'force-logout' | 'reset-usage', payload?: Record<string, any>) => {
  pendingAction.value = action;
  pendingPayload.value = payload ?? null;
  reasonText.value = '';
  reasonDialog.value = true;
};

const saveControls = async () => {
  const payload = buildPayload();
  if (Object.keys(payload).length === 0) return;
  if (needsReason(payload) && !reasonText.value.trim()) {
    openReasonModal('controls', payload);
    return;
  }
  await persistControls(payload, reasonText.value.trim() || undefined);
};

const confirmReasonAndSave = async () => {
  const reason = reasonText.value.trim();
  if (!reason) {
    ElMessage.warning('Reason is required');
    return;
  }
  if (pendingAction.value === 'controls' && pendingPayload.value) {
    await persistControls(pendingPayload.value, reason);
    return;
  }
  if (pendingAction.value === 'force-logout') {
    await performForceLogout(reason);
    return;
  }
  if (pendingAction.value === 'reset-usage') {
    await performResetUsage(reason);
  }
};

const resetDraft = () => {
  if (controls.value) {
    controlDraft.value = { ...controls.value };
    reasonText.value = '';
    pendingPayload.value = null;
    pendingAction.value = null;
  }
};

const performForceLogout = async (reason: string) => {
  if (!businessId.value) return;
  try {
    const version = await forceLogoutTenant(businessId.value, reason.trim());
    ElMessage.success(`Forced logout. Session version ${version}`);
  } catch (err: any) {
    ElMessage.error(err?.message || 'Force logout failed');
  } finally {
    reasonDialog.value = false;
    pendingAction.value = null;
    reasonText.value = '';
  }
};

const performResetUsage = async (reason: string) => {
  if (!businessId.value) return;
  try {
    await resetTenantUsage(businessId.value, reason.trim());
    ElMessage.success('Usage reset timestamp updated');
    await loadControls();
    await loadAudit();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Reset usage failed');
  } finally {
    reasonDialog.value = false;
    pendingAction.value = null;
    reasonText.value = '';
  }
};

const forceLogout = () => {
  openReasonModal('force-logout');
};

const resetUsage = () => {
  openReasonModal('reset-usage');
};
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Tenant Detail</h1>
      <p class="text-sm text-slate-600">Control plane and metrics.</p>
    </div>

    <ElAlert v-if="error" type="error" :title="error" :closable="false" />

    <ElCard v-if="tenant" class="bg-white">
      <ElDescriptions title="Tenant" :column="2" border>
        <ElDescriptionsItem label="Name">{{ tenant.name }}</ElDescriptionsItem>
        <ElDescriptionsItem label="Subdomain">{{ tenant.subdomain }}</ElDescriptionsItem>
        <ElDescriptionsItem label="Status">
          <ElTag :type="statusType(tenant.status)" effect="light">{{ tenant.status }}</ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="Created">{{ tenant.createdAt }}</ElDescriptionsItem>
      </ElDescriptions>
      <div class="mt-3">
        <ElTooltip v-if="isPlatformTenant" content="Platform tenant cannot be impersonated" placement="top">
          <span>
            <ElButton type="primary" disabled>
              Login as tenant
            </ElButton>
          </span>
        </ElTooltip>
        <ElButton
          v-else
          type="primary"
          :loading="impersonating"
          @click="impersonate"
        >
          Login as tenant
        </ElButton>
        <ElButton class="ml-2" @click="openLimits" :loading="limitsLoading">
          Edit limits
        </ElButton>
        <ElButton class="ml-2" type="success" plain @click="openTenantAdmin">
          Open tenant admin
        </ElButton>
        <ElButton class="ml-2" plain @click="openKiosk">
          Open kiosk
        </ElButton>
      </div>
    </ElCard>

    <ElCard v-if="controls" class="bg-white">
      <div class="flex items-center justify-between mb-3">
        <div>
          <div class="text-lg font-semibold">Tenant Controls</div>
          <div class="text-xs text-slate-500">Status, maintenance, messaging, caps</div>
        </div>
        <div class="flex gap-2 items-center">
          <ElButton @click="resetDraft" :disabled="!isDirty || savingControls">Reset</ElButton>
          <ElButton type="primary" :loading="savingControls" :disabled="!isDirty" @click="saveControls">
            Save changes
          </ElButton>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="border rounded-lg p-3">
          <div class="text-sm font-semibold mb-2">Status & Maintenance</div>
          <ElForm label-position="top" size="small">
            <ElFormItem label="Status">
              <select
                class="w-full border rounded px-2 py-1"
                v-model="controlDraft.status"
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="disabled">Disabled</option>
              </select>
            </ElFormItem>
            <ElFormItem label="Maintenance message">
              <ElInput
                type="textarea"
                :rows="2"
                v-model="controlDraft.maintenance_message"
                placeholder="Shown to tenant during maintenance"
              />
            </ElFormItem>
            <ElFormItem label="Disabled reason (required when disabled)">
              <ElInput
                v-model="controlDraft.disabled_reason"
                placeholder="Reason shown to admins"
              />
            </ElFormItem>
          </ElForm>
        </div>

        <div class="border rounded-lg p-3">
          <div class="text-sm font-semibold mb-2">Messaging Controls</div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span>SMS blocked</span>
              <ElSwitch v-model="controlDraft.sms_blocked" />
            </div>
            <div class="flex items-center justify-between">
              <span>Email blocked</span>
              <ElSwitch v-model="controlDraft.email_blocked" />
            </div>
            <div class="flex items-center justify-between">
              <span>Allow promotions</span>
              <ElSwitch v-model="controlDraft.allow_promotions" />
            </div>
            <div class="flex items-center justify-between">
              <span>Transactional only</span>
              <ElSwitch v-model="controlDraft.allow_transactional_only" />
            </div>
          </div>
        </div>

        <div class="border rounded-lg p-3">
          <div class="text-sm font-semibold mb-2">Caps & Freeze</div>
          <ElForm label-position="top" size="small">
            <ElFormItem label="SMS daily cap">
              <ElInput v-model.number="controlDraft.sms_daily_cap" type="number" placeholder="e.g. 500" />
            </ElFormItem>
            <ElFormItem label="Email daily cap">
              <ElInput v-model.number="controlDraft.email_daily_cap" type="number" placeholder="e.g. 500" />
            </ElFormItem>
            <ElFormItem label="Freeze all messaging">
              <ElSwitch v-model="controlDraft.frozen" />
            </ElFormItem>
            <ElButton size="small" @click="resetUsage">Reset usage timestamp</ElButton>
          </ElForm>
        </div>

        <div class="border rounded-lg p-3">
          <div class="text-sm font-semibold mb-2">Session & Demo</div>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span>Demo tenant</span>
              <ElSwitch v-model="controlDraft.is_demo" />
            </div>
            <ElForm label-position="top" size="small">
              <ElFormItem label="Demo expires at">
                <ElInput v-model="controlDraft.demo_expires_at" type="date" />
              </ElFormItem>
            </ElForm>
            <ElButton type="warning" size="small" @click="forceLogout">Force logout</ElButton>
            <div class="text-2xs text-slate-500">Session version: {{ controls.session_version }}</div>
          </div>
        </div>
      </div>
    </ElCard>

    <ElCard v-if="audit.length" class="bg-white">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-semibold">Audit log (latest {{ audit.length }})</div>
        <ElButton size="small" @click="loadAudit">Refresh</ElButton>
      </div>
      <ElTable :data="audit" size="small" height="260">
        <ElTableColumn prop="created_at" label="When" width="160" />
        <ElTableColumn prop="actor_email" label="Actor" width="180" />
        <ElTableColumn prop="action" label="Action" width="200" />
        <ElTableColumn prop="reason" label="Reason" />
      </ElTable>
    </ElCard>

    <ElCard v-if="metrics" class="bg-white">
      <ElDescriptions title="Subscription" :column="2" border>
        <ElDescriptionsItem label="Status">{{ metrics.subscriptionStatus ?? 'n/a' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="Plan">{{ metrics.subscriptionPlan ?? 'n/a' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="Current Period End">
          {{ metrics.subscriptionCurrentPeriodEnd ?? 'n/a' }}
        </ElDescriptionsItem>
      </ElDescriptions>
    </ElCard>

    <ElCard v-if="metrics" class="bg-white">
      <ElDescriptions title="Usage (This Month)" :column="2" border>
        <ElDescriptionsItem label="SMS Sent">{{ metrics.smsSentThisMonth }}</ElDescriptionsItem>
        <ElDescriptionsItem label="SMS Pack Revenue">${{ metrics.smsPackRevenueThisMonth }}</ElDescriptionsItem>
        <ElDescriptionsItem label="Appointments">{{ metrics.appointmentsThisMonth }}</ElDescriptionsItem>
        <ElDescriptionsItem label="Check-ins">{{ metrics.checkinsThisMonth }}</ElDescriptionsItem>
        <ElDescriptionsItem label="Revenue (paid reference)">{{ metrics.revenueThisMonth }}</ElDescriptionsItem>
      </ElDescriptions>
    </ElCard>

    <ElCard v-if="metrics" class="bg-white">
      <ElDescriptions title="Loyalty / VIP" :column="2" border>
        <ElDescriptionsItem label="VIP Count">{{ metrics.vipCount }}</ElDescriptionsItem>
        <ElDescriptionsItem label="Avg Lifetime Points">{{ metrics.avgLifetimePoints }}</ElDescriptionsItem>
      </ElDescriptions>
    </ElCard>

    <ElDialog v-model="limitsDialog" title="Messaging limits" width="520px">
      <div v-if="limits" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div class="text-sm text-slate-700">SMS monthly cap</div>
            <ElInput v-model.number="limits.sms_cap" type="number" />
          </div>
          <div>
            <div class="text-sm text-slate-700">Email monthly cap</div>
            <ElInput v-model.number="limits.email_cap" type="number" />
          </div>
          <div>
            <ElCheckbox v-model="limits.sms_hard_block">Hard block SMS when cap reached</ElCheckbox>
          </div>
          <div>
            <ElCheckbox v-model="limits.email_hard_block">Hard block Email when cap reached</ElCheckbox>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="limitsDialog = false">Cancel</ElButton>
          <ElButton type="primary" :loading="savingLimits" @click="saveLimits">Save</ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog v-model="reasonDialog" :title="reasonDialogTitle" width="420px">
      <p class="text-sm text-slate-600 mb-2">
        A reason is required for this change. It will be stored in the audit log.
      </p>
      <ElInput
        type="textarea"
        :rows="3"
        v-model="reasonText"
        placeholder="Enter reason"
      />
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="reasonDialog = false">Cancel</ElButton>
          <ElButton type="primary" :loading="savingControls" @click="confirmReasonAndSave">Save</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>
