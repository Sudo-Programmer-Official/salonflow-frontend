<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import {
  ElCard,
  ElTable,
  ElTableColumn,
  ElTag,
  ElMessage,
  ElButton,
  ElEmpty,
  ElDialog,
  ElMessageBox,
} from 'element-plus';
import {
  fetchDemoRequests,
  convertDemoRequest,
  generateMagicLink,
  type DemoRequest,
} from '../../api/demoRequests';
import { formatInBusinessTz } from '../../utils/dates';

const loading = ref(false);
const requests = ref<DemoRequest[]>([]);
const detailsOpen = ref(false);
const selected = ref<DemoRequest | null>(null);
const convertingId = ref<string | null>(null);
const linkLoadingId = ref<string | null>(null);
const resendLoadingId = ref<string | null>(null);
const linkDialogOpen = ref(false);
const magicLink = ref<string | null>(null);
const magicLinkTarget = ref<DemoRequest | null>(null);
const isProd = import.meta.env.PROD;

const loadRequests = async () => {
  loading.value = true;
  try {
    requests.value = await fetchDemoRequests();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load demo requests');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadRequests();
});

const statusType = (status: string | undefined) => {
  const value = (status ?? 'NEW').toUpperCase();
  if (value === 'CONVERTED') return 'success';
  if (value === 'CONTACTED') return 'warning';
  return 'info';
};

const formatDate = (iso: string) => formatInBusinessTz(iso, 'MMM D, YYYY h:mm A');

const notesText = computed(() => selected.value?.notes?.trim() || 'No notes provided');

const openDetails = (row: DemoRequest) => {
  selected.value = row;
  detailsOpen.value = true;
};

const canConvert = (row: DemoRequest) =>
  (row.status || '').toUpperCase() !== 'CONVERTED' && !row.converted_business_id;

const canGenerateLink = (row: DemoRequest) =>
  (row.status || '').toUpperCase() === 'CONVERTED' || !!row.converted_business_id;

const convert = async (row: DemoRequest) => {
  if (!canConvert(row)) return;
  try {
    await ElMessageBox.confirm(
      `Convert ${row.name} into a customer/tenant?`,
      'Convert demo request',
      { type: 'warning', confirmButtonText: 'Convert', cancelButtonText: 'Cancel' },
    );
  } catch {
    return;
  }

  convertingId.value = row.id;
  try {
    const result = await convertDemoRequest(row.id);
    row.status = 'CONVERTED';
    row.converted_business_id = result.businessId;

    const details = result.password
      ? `Subdomain: ${result.subdomain}\nOwner: ${result.ownerEmail}\nPassword: ${result.password}`
      : `Subdomain: ${result.subdomain}\nOwner: ${result.ownerEmail}`;
    ElMessage.success(`Converted. ${details}`);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Conversion failed');
  } finally {
    convertingId.value = null;
  }
};

const generateLink = async (row: DemoRequest) => {
  if (!canGenerateLink(row)) return;
  linkLoadingId.value = row.id;
  try {
    const result = await generateMagicLink(row.id);
    magicLink.value = result.magicUrl;
    magicLinkTarget.value = row;
    linkDialogOpen.value = true;
    ElMessage.success('Magic link created');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to create magic link');
  } finally {
    linkLoadingId.value = null;
  }
};

const openMagicLink = () => {
  if (magicLink.value) window.open(magicLink.value, '_blank');
};

const copyMagicLink = () => {
  if (magicLink.value && navigator?.clipboard) {
    navigator.clipboard.writeText(magicLink.value);
    ElMessage.success('Copied link');
  }
};

const resendLink = async (row: DemoRequest) => {
  if (!canGenerateLink(row)) return;
  try {
    await ElMessageBox.confirm(
      `Send a fresh magic link to ${row.name}? This will invalidate any unused link.`,
      'Resend magic link',
      { type: 'info', confirmButtonText: 'Resend', cancelButtonText: 'Cancel' },
    );
  } catch {
    return;
  }

  resendLoadingId.value = row.id;
  try {
    const result = await generateMagicLink(row.id);
    magicLink.value = result.magicUrl;
    magicLinkTarget.value = row;
    linkDialogOpen.value = true;
    ElMessage.success('New magic link created.');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to resend magic link');
  } finally {
    resendLoadingId.value = null;
  }
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Demo Requests</h1>
      <p class="mt-1 text-sm text-slate-600">
        Leads captured from the public form, ordered by newest first.
      </p>
    </div>

    <ElCard class="bg-white">
      <div class="mb-4 flex items-center justify-between">
        <div class="text-sm text-slate-600">Click a row to see notes.</div>
        <ElButton size="small" :loading="loading" @click="loadRequests">Refresh</ElButton>
      </div>

      <ElTable
        v-if="requests.length > 0"
        :data="requests"
        :loading="loading"
        stripe
        style="width: 100%"
        @row-click="openDetails"
      >
        <ElTableColumn prop="name" label="Name" min-width="160" />
        <ElTableColumn prop="email" label="Email" min-width="180" />
        <ElTableColumn prop="phone" label="Phone" min-width="140" />
        <ElTableColumn label="Status" width="120">
          <template #default="{ row }">
            <ElTag :type="statusType(row.status)" size="small">
              {{ row.status || 'NEW' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Created" min-width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="Actions" width="220">
          <template #default="{ row }">
            <div class="flex flex-wrap items-center gap-2">
              <ElButton
                type="primary"
                size="small"
                :loading="convertingId === row.id"
                :disabled="!canConvert(row)"
                @click.stop="convert(row)"
              >
                Convert
              </ElButton>
              <ElButton
                size="small"
                :loading="linkLoadingId === row.id"
                :disabled="!canGenerateLink(row)"
                @click.stop="generateLink(row)"
              >
                Magic Link
              </ElButton>
              <ElButton
                size="small"
                :loading="resendLoadingId === row.id"
                :disabled="!canGenerateLink(row)"
                @click.stop="resendLink(row)"
              >
                Resend
              </ElButton>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>

      <ElEmpty v-else-if="!loading" description="No demo requests yet." />
    </ElCard>

    <ElDialog v-model="detailsOpen" title="Demo Request Details" width="480px">
      <div v-if="selected" class="space-y-2">
        <div class="text-sm text-slate-600">Name</div>
        <div class="text-base font-semibold text-slate-900">{{ selected.name }}</div>

        <div class="text-sm text-slate-600">Email</div>
        <div class="text-base text-slate-900">{{ selected.email }}</div>

        <div class="text-sm text-slate-600">Phone</div>
        <div class="text-base text-slate-900">
          {{ selected.phone || '—' }}
        </div>

        <div class="text-sm text-slate-600">Status</div>
        <ElTag :type="statusType(selected.status)" size="small">
          {{ selected.status || 'NEW' }}
        </ElTag>

        <div class="text-sm text-slate-600">Created</div>
        <div class="text-base text-slate-900">
          {{ formatDate(selected.created_at) }}
        </div>

        <div class="text-sm text-slate-600">Notes</div>
        <div class="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-800">
          {{ notesText }}
        </div>
      </div>
    </ElDialog>

    <ElDialog v-model="linkDialogOpen" title="Magic Login Link" width="520px">
      <div v-if="magicLink" class="space-y-3">
        <div class="text-sm text-slate-600">
          Share this link with {{ magicLinkTarget?.name || 'the owner' }}. It expires in 15 minutes and works once.
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 break-words">
          {{ magicLink }}
        </div>
        <div class="flex gap-2">
          <ElButton type="primary" @click="openMagicLink">
            Open in new tab
          </ElButton>
          <ElButton
            v-if="!isProd"
            @click="copyMagicLink"
          >
            Copy
          </ElButton>
        </div>
      </div>
    </ElDialog>
  </div>
</template>
