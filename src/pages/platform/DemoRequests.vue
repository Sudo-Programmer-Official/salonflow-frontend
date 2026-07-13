<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import {
  ElAlert,
  ElButton,
  ElCard,
  ElCheckbox,
  ElDescriptions,
  ElDescriptionsItem,
  ElDrawer,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElTabPane,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTabs,
} from 'element-plus';
import dayjs from 'dayjs';
import {
  fetchDemoRequests,
  convertDemoRequest,
  generateMagicLink as generateRequestMagicLink,
  sendDemoRequest,
  updateDemoRequestStatus,
  type DemoRequest,
} from '../../api/platform/demoRequests';
import {
  fetchDemoTenants,
  generateDemoTenantMagicLink,
  refreshDemoTenant,
  resetDemoTenant,
  updateDemoTenantMetadata,
  validateDemoTenant,
  type DemoDeploymentChecklist,
  type DemoTenantCatalogItem,
  type DemoTenantCatalogResponse,
  type DemoTenantMetadataPatch,
} from '../../api/platformDemoTenants';

const templateOptions = [
  { key: 'nail-salon', label: 'Nail Salon', summary: 'Flagship demo with the strongest proof story.' },
  { key: 'hair-salon', label: 'Hair Salon', summary: 'Color, rebooking, and a busier schedule.' },
  { key: 'spa', label: 'Spa', summary: 'Packages, gift cards, and longer sessions.' },
  { key: 'beauty-studio', label: 'Beauty Studio', summary: 'Brows, lashes, PMU, and specialty services.' },
  { key: 'barbershop', label: 'Barbershop', summary: 'Fast booking, chair turnover, and clean flow.' },
] as const;

const smokeChecks = [
  { key: 'website', label: 'Website loads' },
  { key: 'login', label: 'Login works' },
  { key: 'dashboard', label: 'Dashboard opens' },
  { key: 'booking', label: 'Booking works' },
  { key: 'pos', label: 'POS opens' },
  { key: 'loyalty', label: 'Loyalty renders' },
  { key: 'reviews', label: 'Reviews render' },
] as const;

const defaultChecklist = (): DemoDeploymentChecklist => ({
  backend: {
    tenantCreated: true,
    adminCreated: true,
    validationPassed: false,
  },
  frontend: {
    vercelConfigured: false,
    sslActive: false,
  },
  dns: {
    provider: null,
    dnsConfigured: false,
    cnameVerified: false,
    propagated: false,
  },
  website: {
    publicUrlWorks: false,
    homepageWorks: false,
    bookingWorks: false,
    httpsValid: false,
  },
  communications: {
    emailReady: false,
    magicLinkTested: false,
    smsReady: false,
    smsSkipped: false,
  },
});

const cloneChecklist = (checklist?: DemoDeploymentChecklist | null): DemoDeploymentChecklist =>
  checklist ? JSON.parse(JSON.stringify(checklist)) : defaultChecklist();

const copyText = async (value: string, message: string) => {
  if (!value) return;
  await navigator.clipboard.writeText(value);
  ElMessage.success(message);
};

const catalogLoading = ref(false);
const requestsLoading = ref(false);
const actionLoading = ref(false);
const saveLoading = ref(false);
const sendLoading = ref(false);
const convertLoading = ref(false);
const requestLinkLoading = ref(false);

const activeTab = ref<'catalog' | 'requests'>('catalog');
const catalog = ref<DemoTenantCatalogResponse | null>(null);
const requests = ref<DemoRequest[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const tenantDrawerOpen = ref(false);
const requestDrawerOpen = ref(false);
const selectedTenant = ref<DemoTenantCatalogItem | null>(null);
const selectedRequest = ref<DemoRequest | null>(null);
const tenantChecklistDraft = ref<DemoDeploymentChecklist>(defaultChecklist());
const tenantSmokeDraft = reactive({
  passed: true,
  checkedBy: '',
  notes: '',
  checks: smokeChecks.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.key] = true;
    return acc;
  }, {}),
});
const requestStatusDraft = ref('NEW');
const requestTemplateDraft = ref('nail-salon');
const tenantMagicLink = ref<string | null>(null);
const tenantMagicLinkLabel = ref<string>('Magic link');
const requestMagicLink = ref<string | null>(null);
const requestMagicLinkLabel = ref<string>('Magic link');

const fetchCatalog = async () => {
  catalogLoading.value = true;
  try {
    catalog.value = await fetchDemoTenants();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to load demo catalog');
  } finally {
    catalogLoading.value = false;
  }
};

const fetchRequests = async (nextPage = page.value) => {
  requestsLoading.value = true;
  try {
    const response = await fetchDemoRequests({ page: nextPage, pageSize: pageSize.value });
    requests.value = response.requests;
    page.value = response.pagination.page;
    pageSize.value = response.pagination.pageSize;
    total.value = response.pagination.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to load demo requests');
  } finally {
    requestsLoading.value = false;
  }
};

const reloadAll = async () => {
  await Promise.all([fetchCatalog(), fetchRequests()]);
};

onMounted(() => {
  void reloadAll();
});

const formatDate = (value: string | null | undefined) => (value ? dayjs(value).format('MMM D, YYYY HH:mm') : '—');

const templateLabel = (templateId: string | null | undefined) =>
  templateOptions.find((option) => option.key === templateId)?.label ?? '—';

const statusTagType = (status: string) => {
  const normalized = status.toUpperCase();
  if (normalized === 'READY' || normalized === 'PASS' || normalized === 'CONVERTED' || normalized === 'SENT') {
    return 'success';
  }
  if (normalized === 'WARNING' || normalized === 'VALIDATION_REQUIRED' || normalized === 'DNS_PENDING' || normalized === 'SMOKE_TEST_REQUIRED') {
    return 'warning';
  }
  if (normalized === 'FAILED' || normalized === 'FAIL' || normalized === 'RESET_RECOMMENDED') {
    return 'danger';
  }
  return 'info';
};

const readinessLabel = (value: DemoTenantCatalogItem['readinessStatus']) => {
  switch (value) {
    case 'READY':
      return 'Ready';
    case 'VALIDATION_REQUIRED':
      return 'Validation required';
    case 'DNS_PENDING':
      return 'Deployment pending';
    case 'SMOKE_TEST_REQUIRED':
      return 'Smoke test required';
    case 'RESET_RECOMMENDED':
      return 'Refresh seed recommended';
    default:
      return value;
  }
};

const openTenant = (tenant: DemoTenantCatalogItem) => {
  window.open(tenant.demoUrl, '_blank', 'noopener,noreferrer');
};

const openRequest = (row: DemoRequest) => {
  selectedRequest.value = row;
  requestStatusDraft.value = row.status?.toUpperCase() || 'NEW';
  requestTemplateDraft.value = row.demoTemplateKey?.trim().toLowerCase() || 'nail-salon';
  requestMagicLink.value = null;
  requestDrawerOpen.value = true;
};

const openTenantDetails = (tenant: DemoTenantCatalogItem) => {
  selectedTenant.value = tenant;
  tenantChecklistDraft.value = cloneChecklist(tenant.deploymentChecklist);
  tenantSmokeDraft.passed = tenant.lastSmokeTest.passed ?? true;
  tenantSmokeDraft.checkedBy = tenant.lastSmokeTest.checkedBy ?? '';
  tenantSmokeDraft.notes = tenant.lastSmokeTest.notes ?? '';
  smokeChecks.forEach((item) => {
    tenantSmokeDraft.checks[item.key] = tenant.lastSmokeTest.checks?.[item.key] ?? false;
  });
  tenantMagicLink.value = null;
  tenantDrawerOpen.value = true;
};

const refreshTenantDetails = async (businessId: string) => {
  await fetchCatalog();
  const refreshed = catalog.value?.tenants.find((tenant) => tenant.businessId === businessId);
  if (refreshed) {
    selectedTenant.value = refreshed;
    tenantChecklistDraft.value = cloneChecklist(refreshed.deploymentChecklist);
    tenantSmokeDraft.passed = refreshed.lastSmokeTest.passed ?? true;
    tenantSmokeDraft.checkedBy = refreshed.lastSmokeTest.checkedBy ?? '';
    tenantSmokeDraft.notes = refreshed.lastSmokeTest.notes ?? '';
    smokeChecks.forEach((item) => {
      tenantSmokeDraft.checks[item.key] = refreshed.lastSmokeTest.checks?.[item.key] ?? false;
    });
  }
};

const saveTenantMetadata = async () => {
  if (!selectedTenant.value) return;
  saveLoading.value = true;
  try {
    const payload: DemoTenantMetadataPatch = {
      deploymentChecklist: cloneChecklist(tenantChecklistDraft.value),
      lastSmokeTestAt: new Date().toISOString(),
      lastSmokeTestPassed: tenantSmokeDraft.passed,
      lastSmokeTestCheckedBy: tenantSmokeDraft.checkedBy.trim() || null,
      lastSmokeTestNotes: tenantSmokeDraft.notes.trim() || null,
      lastSmokeTestChecks: Object.fromEntries(
        smokeChecks.map((item) => [item.key, Boolean(tenantSmokeDraft.checks[item.key])]),
      ),
    };
    await updateDemoTenantMetadata(selectedTenant.value.businessId, payload);
    ElMessage.success('Demo metadata updated');
    await refreshTenantDetails(selectedTenant.value.businessId);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to save demo metadata');
  } finally {
    saveLoading.value = false;
  }
};

const validateTenant = async (tenant: DemoTenantCatalogItem) => {
  actionLoading.value = true;
  try {
    const result = await validateDemoTenant(tenant.businessId);
    ElMessage.success(`Validation complete: ${result.validation.status || 'unknown'}`);
    await refreshTenantDetails(tenant.businessId);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to validate demo tenant');
  } finally {
    actionLoading.value = false;
  }
};

const resetTenant = async (tenant: DemoTenantCatalogItem) => {
  try {
    await ElMessageBox.confirm(
      `Reset ${tenant.businessName} in place? This preserves the tenant ID and URL.`,
      'Reset demo tenant',
      { type: 'warning', confirmButtonText: 'Reset', cancelButtonText: 'Cancel' },
    );
  } catch {
    return;
  }

  actionLoading.value = true;
  try {
    await resetDemoTenant(tenant.businessId, { confirmed: true, forceReset: true });
    ElMessage.success('Demo tenant reset');
    await refreshTenantDetails(tenant.businessId);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to reset demo tenant');
  } finally {
    actionLoading.value = false;
  }
};

const refreshSeedTenant = async (tenant: DemoTenantCatalogItem) => {
  try {
    await ElMessageBox.confirm(
      `Refresh the seed data for ${tenant.businessName}?`,
      'Refresh demo seed',
      { type: 'info', confirmButtonText: 'Refresh', cancelButtonText: 'Cancel' },
    );
  } catch {
    return;
  }

  actionLoading.value = true;
  try {
    await refreshDemoTenant(tenant.businessId, { confirmed: true });
    ElMessage.success('Seed refreshed');
    await refreshTenantDetails(tenant.businessId);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to refresh demo seed');
  } finally {
    actionLoading.value = false;
  }
};

const generateTenantLink = async (tenant: DemoTenantCatalogItem) => {
  actionLoading.value = true;
  try {
    const result = await generateDemoTenantMagicLink(tenant.businessId);
    tenantMagicLink.value = result.magicUrl;
    tenantMagicLinkLabel.value = `${result.ownerEmail} · ${result.subdomain}`;
    await copyText(result.magicUrl, 'Magic link copied');
    ElMessage.success('Magic link generated');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to generate magic link');
  } finally {
    actionLoading.value = false;
  }
};

const copyTenantUrl = async (tenant: DemoTenantCatalogItem) =>
  copyText(tenant.demoUrl, 'Demo URL copied');

const copyTenantEmail = async (tenant: DemoTenantCatalogItem) =>
  copyText(tenant.loginEmail || '', 'Login email copied');

const sendRequest = async () => {
  if (!selectedRequest.value) return;
  sendLoading.value = true;
  try {
    const result = await sendDemoRequest(selectedRequest.value.id, requestTemplateDraft.value);
    selectedRequest.value.status = result.request.status;
    selectedRequest.value.demoTemplateKey = result.request.demoTemplateKey;
    selectedRequest.value.assignedBusinessId = result.request.assignedBusinessId;
    selectedRequest.value.assignedSubdomain = result.request.assignedSubdomain;
    selectedRequest.value.assignedUsername = result.request.assignedUsername;
    selectedRequest.value.assignedTempPassword = result.request.assignedTempPassword;
    selectedRequest.value.loginUrl = result.request.loginUrl;
    selectedRequest.value.approvedAt = result.request.approvedAt;
    selectedRequest.value.sentAt = result.request.sentAt;
    selectedRequest.value.activatedAt = result.request.activatedAt;
    ElMessage.success('Demo sent');
    await reloadAll();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to send demo');
  } finally {
    sendLoading.value = false;
  }
};

const convertRequest = async () => {
  if (!selectedRequest.value) return;
  convertLoading.value = true;
  try {
    const result = await convertDemoRequest(selectedRequest.value.id);
    selectedRequest.value.status = 'CONVERTED';
    selectedRequest.value.convertedBusinessId = result.businessId;
    selectedRequest.value.assignedBusinessId = result.businessId;
    selectedRequest.value.assignedSubdomain = result.subdomain;
    selectedRequest.value.assignedUsername = result.ownerEmail;
    selectedRequest.value.assignedTempPassword = result.password ?? null;
    selectedRequest.value.loginUrl = null;
    ElMessage.success('Demo converted');
    await reloadAll();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to convert demo request');
  } finally {
    convertLoading.value = false;
  }
};

const generateRequestLink = async () => {
  if (!selectedRequest.value) return;
  requestLinkLoading.value = true;
  try {
    const result = await generateRequestMagicLink(selectedRequest.value.id);
    requestMagicLink.value = result.magicUrl;
    requestMagicLinkLabel.value = `${result.ownerEmail} · ${result.subdomain}`;
    await copyText(result.magicUrl, 'Magic link copied');
    ElMessage.success('Magic link created');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to generate magic link');
  } finally {
    requestLinkLoading.value = false;
  }
};

const saveRequestStatus = async () => {
  if (!selectedRequest.value) return;
  try {
    await updateDemoRequestStatus(selectedRequest.value.id, requestStatusDraft.value);
    selectedRequest.value.status = requestStatusDraft.value;
    ElMessage.success('Request status updated');
    await reloadAll();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to update request status');
  }
};

const openRequestLogin = () => {
  if (selectedRequest.value?.loginUrl) {
    window.open(selectedRequest.value.loginUrl, '_blank', 'noopener,noreferrer');
  }
};

const onRequestPageChange = (nextPage: number) => {
  void fetchRequests(nextPage);
};

const onRequestPageSizeChange = (nextPageSize: number) => {
  pageSize.value = nextPageSize;
  void fetchRequests(1);
};

const catalogTotals = computed(() => {
  const tenants = catalog.value?.tenants ?? [];
  return {
    total: tenants.length,
    ready: tenants.filter((tenant) => tenant.readinessStatus === 'READY').length,
    warnings: tenants.filter((tenant) => tenant.readinessStatus !== 'READY').length,
    validated: tenants.filter((tenant) => tenant.lastValidation.status === 'PASS').length,
  };
});

const requestTotals = computed(() => ({
  total: requests.value.length,
  converted: requests.value.filter((request) => (request.status || '').toUpperCase() === 'CONVERTED').length,
  sent: requests.value.filter((request) => ['SENT', 'ACTIVATED'].includes((request.status || '').toUpperCase())).length,
}));

</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Demo Operations</h1>
        <p class="mt-1 text-sm text-slate-600">
          Super Admin control center for demo tenants, validation, reset, and request handoff.
        </p>
      </div>
      <ElButton :loading="catalogLoading || requestsLoading" @click="reloadAll">Refresh all</ElButton>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <ElCard class="bg-white">
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Demo tenants</div>
        <div class="mt-2 text-3xl font-semibold text-slate-950">{{ catalogTotals.total }}</div>
      </ElCard>
      <ElCard class="bg-white">
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Ready</div>
        <div class="mt-2 text-3xl font-semibold text-slate-950">{{ catalogTotals.ready }}</div>
      </ElCard>
      <ElCard class="bg-white">
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Requests</div>
        <div class="mt-2 text-3xl font-semibold text-slate-950">{{ requestTotals.total }}</div>
      </ElCard>
      <ElCard class="bg-white">
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Converted</div>
        <div class="mt-2 text-3xl font-semibold text-slate-950">{{ requestTotals.converted }}</div>
      </ElCard>
    </div>

    <ElAlert
      type="info"
      show-icon
      :closable="false"
      title="Demo operations reuse the existing send-demo, convert, reset, and magic-link flows."
      description="The catalog only exposes demo tenants and the request tab keeps the handoff workflow in one place."
    />

    <ElTabs v-model="activeTab" class="demo-ops-tabs">
      <ElTabPane label="Demo Catalog" name="catalog">
        <ElCard class="bg-white" :loading="catalogLoading">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div class="text-sm text-slate-600">
              Only businesses marked as demo tenants are shown here.
            </div>
            <div class="flex flex-wrap gap-2">
              <ElTag type="success">Ready: {{ catalogTotals.ready }}</ElTag>
              <ElTag type="warning">Needs attention: {{ catalogTotals.warnings }}</ElTag>
              <ElTag type="info">Validated: {{ catalogTotals.validated }}</ElTag>
            </div>
          </div>

          <ElTable :data="catalog?.tenants ?? []" stripe style="width: 100%" v-loading="catalogLoading">
            <ElTableColumn label="Identity" min-width="240">
              <template #default="{ row }">
                <div class="space-y-1">
                  <div class="font-semibold text-slate-900">{{ row.businessName }}</div>
                  <div class="text-xs text-slate-500">
                    {{ templateLabel(row.templateId) }} · {{ row.slug }} · {{ row.businessId.slice(0, 8) }}…
                  </div>
                  <div class="text-xs text-slate-500">
                    Created {{ formatDate(row.createdAt) }}
                  </div>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="Access" min-width="240">
              <template #default="{ row }">
                <div class="space-y-1 text-sm">
                  <div class="text-slate-800">{{ row.demoUrl }}</div>
                  <div class="text-xs text-slate-500">Login: {{ row.loginEmail || '—' }}</div>
                  <ElTag size="small" :type="row.magicLinkStatus === 'AVAILABLE' ? 'success' : 'warning'">
                    {{ row.magicLinkStatus }}
                  </ElTag>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="Health" min-width="220">
              <template #default="{ row }">
                <div class="space-y-2">
                  <ElTag :type="statusTagType(row.readinessStatus)">
                    {{ readinessLabel(row.readinessStatus) }}
                  </ElTag>
                  <div class="text-xs text-slate-500">
                    Validation: {{ row.lastValidation.status || '—' }}
                  </div>
                  <div class="text-xs text-slate-500">
                    Smoke: {{ row.lastSmokeTest.checkedAt ? (row.lastSmokeTest.passed ? 'Passed' : 'Failed') : '—' }}
                  </div>
                  <div class="text-xs text-slate-500">
                    Next action: {{ row.nextAction }}
                  </div>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="Activity" min-width="220">
              <template #default="{ row }">
                <div class="space-y-1 text-xs text-slate-500">
                  <div>Reset: {{ formatDate(row.lastResetAt) }}</div>
                  <div>Validation: {{ formatDate(row.lastValidation.checkedAt) }}</div>
                  <div>Smoke test: {{ formatDate(row.lastSmokeTest.checkedAt) }}</div>
                  <div>Demo sent: {{ formatDate(row.lastDemoSentAt) }}</div>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="Actions" min-width="280" fixed="right">
              <template #default="{ row }">
                <div class="flex flex-wrap gap-2">
                  <ElButton size="small" @click="openTenant(row)">Open</ElButton>
                  <ElButton size="small" @click="copyTenantUrl(row)">Copy URL</ElButton>
                  <ElButton size="small" @click="copyTenantEmail(row)">Copy Email</ElButton>
                  <ElButton size="small" type="primary" @click="generateTenantLink(row)">Magic Link</ElButton>
                  <ElButton size="small" @click="validateTenant(row)">Validate</ElButton>
                  <ElButton size="small" type="warning" @click="refreshSeedTenant(row)">Refresh Seed</ElButton>
                  <ElButton size="small" type="danger" @click="resetTenant(row)">Reset</ElButton>
                  <ElButton size="small" @click="openTenantDetails(row)">Details</ElButton>
                </div>
              </template>
            </ElTableColumn>
          </ElTable>

          <div v-if="!catalogLoading && !(catalog?.tenants.length ?? 0)" class="py-6 text-center text-sm text-slate-500">
            No demo tenants found.
          </div>
        </ElCard>
      </ElTabPane>

      <ElTabPane label="Demo Requests" name="requests">
        <ElCard class="bg-white" :loading="requestsLoading">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div class="text-sm text-slate-600">
              Operational handoff for new demo requests.
            </div>
            <ElButton :loading="requestsLoading" @click="fetchRequests(page)">Refresh requests</ElButton>
          </div>

          <ElTable :data="requests" stripe style="width: 100%" v-loading="requestsLoading">
            <ElTableColumn label="Requester" min-width="220">
              <template #default="{ row }">
                <div class="space-y-1">
                  <div class="font-semibold text-slate-900">{{ row.name }}</div>
                  <div class="text-xs text-slate-500">{{ row.email || '—' }}</div>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="Status" min-width="140">
              <template #default="{ row }">
                <ElTag :type="statusTagType((row.status || 'NEW').toString())">
                  {{ row.status || 'NEW' }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="Submitted" min-width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="Template" min-width="180">
              <template #default="{ row }">
                {{ templateLabel(row.demoTemplateKey) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="Actions" min-width="160">
              <template #default="{ row }">
                <ElButton size="small" @click="openRequest(row)">Open</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>

          <div v-if="!requestsLoading && !requests.length" class="py-6 text-center text-sm text-slate-500">
            No demo requests yet.
          </div>

          <div v-if="total > pageSize" class="mt-4 flex justify-end">
            <ElPagination
              background
              layout="prev, pager, next, sizes, total"
              :current-page="page"
              :page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="total"
              @current-change="onRequestPageChange"
              @size-change="onRequestPageSizeChange"
            />
          </div>
        </ElCard>
      </ElTabPane>
    </ElTabs>

    <ElDrawer v-model="tenantDrawerOpen" title="Demo tenant details" size="48%">
      <div v-if="selectedTenant" class="space-y-6">
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="Business">{{ selectedTenant.businessName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Template">{{ templateLabel(selectedTenant.templateId) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Template version">{{ selectedTenant.templateVersion || '—' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Seed version">{{ selectedTenant.seedVersion || '—' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Slug">{{ selectedTenant.slug }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Demo URL">{{ selectedTenant.demoUrl }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Login email">{{ selectedTenant.loginEmail || '—' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Readiness">{{ readinessLabel(selectedTenant.readinessStatus) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Next action">{{ selectedTenant.nextAction }}</ElDescriptionsItem>
        </ElDescriptions>

        <div class="grid gap-4 md:grid-cols-2">
          <ElCard>
            <div class="text-sm font-semibold text-slate-900">Deployment checklist</div>
            <div class="mt-4 space-y-3 text-sm">
              <label class="flex items-center gap-3">
                <ElCheckbox v-model="tenantChecklistDraft.backend.tenantCreated" />
                Tenant created
              </label>
              <label class="flex items-center gap-3">
                <ElCheckbox v-model="tenantChecklistDraft.backend.adminCreated" />
                Admin created
              </label>
              <label class="flex items-center gap-3">
                <ElCheckbox v-model="tenantChecklistDraft.backend.validationPassed" />
                Validation passed
              </label>
              <label class="flex items-center gap-3">
                <ElCheckbox v-model="tenantChecklistDraft.frontend.vercelConfigured" />
                Vercel configured
              </label>
              <label class="flex items-center gap-3">
                <ElCheckbox v-model="tenantChecklistDraft.frontend.sslActive" />
                SSL active
              </label>
              <label class="flex items-center gap-3">
                <ElCheckbox v-model="tenantChecklistDraft.dns.dnsConfigured" />
                DNS configured
              </label>
              <label class="flex items-center gap-3">
                <ElCheckbox v-model="tenantChecklistDraft.dns.cnameVerified" />
                CNAME verified
              </label>
              <label class="flex items-center gap-3">
                <ElCheckbox v-model="tenantChecklistDraft.dns.propagated" />
                DNS propagated
              </label>
              <label class="flex items-center gap-3">
                <ElCheckbox v-model="tenantChecklistDraft.website.homepageWorks" />
                Homepage works
              </label>
              <label class="flex items-center gap-3">
                <ElCheckbox v-model="tenantChecklistDraft.website.bookingWorks" />
                Booking works
              </label>
              <label class="flex items-center gap-3">
                <ElCheckbox v-model="tenantChecklistDraft.website.httpsValid" />
                HTTPS valid
              </label>
              <label class="flex items-center gap-3">
                <ElCheckbox v-model="tenantChecklistDraft.communications.emailReady" />
                Email ready
              </label>
              <label class="flex items-center gap-3">
                <ElCheckbox v-model="tenantChecklistDraft.communications.magicLinkTested" />
                Magic link tested
              </label>
            </div>
          </ElCard>

          <ElCard>
            <div class="text-sm font-semibold text-slate-900">Browser smoke test</div>
            <div class="mt-4 space-y-3">
              <label class="flex items-center gap-3 text-sm">
                <ElCheckbox v-model="tenantSmokeDraft.passed" />
                Passed
              </label>
              <div>
                <div class="mb-1 text-xs text-slate-500">Checked by</div>
                <ElInput v-model="tenantSmokeDraft.checkedBy" placeholder="Platform admin" />
              </div>
              <div>
                <div class="mb-1 text-xs text-slate-500">Notes</div>
                <ElInput v-model="tenantSmokeDraft.notes" type="textarea" :rows="4" placeholder="What was verified?" />
              </div>
              <div class="grid gap-2">
                <label v-for="item in smokeChecks" :key="item.key" class="flex items-center gap-3 text-sm">
                  <ElCheckbox v-model="tenantSmokeDraft.checks[item.key]" />
                  {{ item.label }}
                </label>
              </div>
            </div>
          </ElCard>
        </div>

        <div class="flex flex-wrap gap-2">
          <ElButton @click="openTenant(selectedTenant)">Open Demo</ElButton>
          <ElButton @click="copyTenantUrl(selectedTenant)">Copy URL</ElButton>
          <ElButton @click="copyTenantEmail(selectedTenant)">Copy Email</ElButton>
          <ElButton type="primary" :loading="actionLoading" @click="generateTenantLink(selectedTenant)">Generate Magic Link</ElButton>
          <ElButton :loading="actionLoading" @click="validateTenant(selectedTenant)">Validate</ElButton>
          <ElButton type="warning" :loading="actionLoading" @click="refreshSeedTenant(selectedTenant)">Refresh Seed</ElButton>
          <ElButton type="danger" :loading="actionLoading" @click="resetTenant(selectedTenant)">Reset</ElButton>
        </div>

        <div class="flex items-center gap-2">
          <ElButton type="success" :loading="saveLoading" @click="saveTenantMetadata">Save metadata</ElButton>
          <ElButton @click="refreshTenantDetails(selectedTenant.businessId)">Reload</ElButton>
        </div>

        <ElAlert
          v-if="tenantMagicLink"
          type="success"
          show-icon
          :closable="false"
          :title="tenantMagicLinkLabel"
          :description="tenantMagicLink"
        />

        <div>
          <div class="text-sm font-semibold text-slate-900">Last checks</div>
          <div class="mt-2 grid gap-3 md:grid-cols-2">
            <ElCard>
              <div class="text-xs uppercase tracking-[0.22em] text-slate-500">Validation</div>
              <div class="mt-2 text-sm text-slate-700">
                {{ selectedTenant.lastValidation.status || '—' }}
              </div>
              <div class="mt-1 text-xs text-slate-500">{{ formatDate(selectedTenant.lastValidation.checkedAt) }}</div>
              <div class="mt-2 text-xs text-slate-500">{{ selectedTenant.lastValidation.reason || '—' }}</div>
            </ElCard>
            <ElCard>
              <div class="text-xs uppercase tracking-[0.22em] text-slate-500">Smoke test</div>
              <div class="mt-2 text-sm text-slate-700">
                {{ selectedTenant.lastSmokeTest.checkedAt ? (selectedTenant.lastSmokeTest.passed ? 'Passed' : 'Failed') : '—' }}
              </div>
              <div class="mt-1 text-xs text-slate-500">{{ formatDate(selectedTenant.lastSmokeTest.checkedAt) }}</div>
              <div class="mt-2 text-xs text-slate-500">{{ selectedTenant.lastSmokeTest.notes || '—' }}</div>
            </ElCard>
          </div>
        </div>
      </div>
    </ElDrawer>

    <ElDrawer v-model="requestDrawerOpen" title="Demo request handoff" size="40%">
      <div v-if="selectedRequest" class="space-y-5">
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="Name">{{ selectedRequest.name }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Email">{{ selectedRequest.email || '—' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Phone">{{ selectedRequest.phone || '—' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Current status">{{ selectedRequest.status || 'NEW' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Template">{{ templateLabel(selectedRequest.demoTemplateKey) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Submitted">{{ formatDate(selectedRequest.createdAt) }}</ElDescriptionsItem>
        </ElDescriptions>

        <div>
          <div class="mb-2 text-sm font-semibold text-slate-900">Template</div>
          <ElSelect v-model="requestTemplateDraft" class="w-full">
            <ElOption
              v-for="template in templateOptions"
              :key="template.key"
              :label="`${template.label} - ${template.summary}`"
              :value="template.key"
            />
          </ElSelect>
        </div>

        <div>
          <div class="mb-2 text-sm font-semibold text-slate-900">Request status</div>
          <ElSelect v-model="requestStatusDraft" class="w-full">
            <ElOption label="NEW" value="NEW" />
            <ElOption label="PENDING" value="PENDING" />
            <ElOption label="APPROVED" value="APPROVED" />
            <ElOption label="SENT" value="SENT" />
            <ElOption label="ACTIVATED" value="ACTIVATED" />
            <ElOption label="CONTACTED" value="CONTACTED" />
            <ElOption label="CONVERTED" value="CONVERTED" />
            <ElOption label="DISQUALIFIED" value="DISQUALIFIED" />
            <ElOption label="CLOSED" value="CLOSED" />
          </ElSelect>
        </div>

        <div class="flex flex-wrap gap-2">
          <ElButton :loading="sendLoading" type="primary" @click="sendRequest">Send Demo</ElButton>
          <ElButton :loading="requestLinkLoading" @click="generateRequestLink">Generate Magic Link</ElButton>
          <ElButton :loading="convertLoading" @click="convertRequest">Convert</ElButton>
          <ElButton @click="saveRequestStatus">Save Status</ElButton>
          <ElButton v-if="selectedRequest.loginUrl" @click="openRequestLogin">Open Demo</ElButton>
        </div>

        <ElAlert
          v-if="requestMagicLink"
          type="success"
          show-icon
          :closable="false"
          :title="requestMagicLinkLabel"
          :description="requestMagicLink"
        />

        <ElCard>
          <div class="text-sm font-semibold text-slate-900">Handoff details</div>
          <div class="mt-3 grid gap-2 text-sm text-slate-700">
            <div>Assigned business: {{ selectedRequest.assignedBusinessId || '—' }}</div>
            <div>Assigned subdomain: {{ selectedRequest.assignedSubdomain || '—' }}</div>
            <div>Assigned username: {{ selectedRequest.assignedUsername || '—' }}</div>
            <div>Demo login URL: {{ selectedRequest.loginUrl || '—' }}</div>
            <div>Temporary password: {{ selectedRequest.assignedTempPassword || '—' }}</div>
          </div>
        </ElCard>
      </div>
    </ElDrawer>
  </div>
</template>
