<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElCard, ElSwitch, ElAlert, ElButton, ElInput, ElDivider } from 'element-plus';
import { fetchReviewSmsSettings, updateReviewSmsSettings, fetchReviewQr } from '../../api/reviewSms';

const enabled = ref(false);
const reviewLink = ref('');
const loading = ref(false);
const loadingQr = ref(false);
const reviewQr = ref<{ reviewLink: string; qrDataUrl: string } | null>(null);
const saving = ref(false);
const success = ref('');
const error = ref('');
const businessName =
  (typeof window !== 'undefined' ? localStorage.getItem('businessName') : null) || 'your salon';

const previewMessage = computed(
  () =>
    `Thanks for visiting ${businessName}! If you enjoyed your service, please leave us a review: ${
      reviewLink.value || 'https://your-review-link'
    }`,
);

const loadSettings = async () => {
  loading.value = true;
  try {
    const data = await fetchReviewSmsSettings();
    enabled.value = data.enabled;
    reviewLink.value = data.reviewLink || '';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load settings';
  } finally {
    loading.value = false;
  }
};

const loadQr = async () => {
  loadingQr.value = true;
  try {
    reviewQr.value = await fetchReviewQr();
  } catch (err) {
    // Keep silent if not configured
    reviewQr.value = null;
  } finally {
    loadingQr.value = false;
  }
};

onMounted(() => {
  loadSettings();
  loadQr();
});

const handleSave = async () => {
  saving.value = true;
  success.value = '';
  error.value = '';
  try {
    await updateReviewSmsSettings(enabled.value, reviewLink.value.trim() || null);
    success.value = 'Settings saved.';
    await loadQr();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save settings';
  } finally {
    saving.value = false;
  }
};

const openReviewLink = () => {
  if (reviewQr.value?.reviewLink) {
    window.open(reviewQr.value.reviewLink, '_blank');
  }
};

const copyReviewLink = async () => {
  if (reviewQr.value?.reviewLink && navigator?.clipboard) {
    await navigator.clipboard.writeText(reviewQr.value.reviewLink);
  }
};

const downloadQr = () => {
  if (!reviewQr.value?.qrDataUrl) return;
  const a = document.createElement('a');
  a.href = reviewQr.value.qrDataUrl;
  a.download = 'google-review-qr.png';
  a.click();
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Automated Review SMS</h1>
      <p class="text-sm text-slate-600">
        Sends one Google review request after a service is completed, only with customer consent.
      </p>
    </div>

    <ElCard class="bg-white space-y-4" :loading="loading">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="text-sm font-semibold text-slate-900">Enable automated review request SMS</div>
          <div class="text-xs text-slate-600">
            Messages are sent only to customers who explicitly consent.
          </div>
        </div>
        <ElSwitch v-model="enabled" size="large" />
      </div>

      <ElAlert
        title="When a check-in is marked COMPLETED, a single review SMS is sent (one per visit). No reminders, no automation beyond this trigger."
        type="info"
        :closable="false"
        class="w-full"
      />

      <div class="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div class="text-sm font-semibold text-slate-900">Google review link</div>
        <ElInput
          v-model="reviewLink"
          placeholder="https://g.page/r/your-link"
          clearable
        />
        <div class="text-xs text-slate-600">
          Use your Google “Write a review” link. Leave blank to disable sending.
        </div>
      </div>

      <div class="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div class="text-sm font-semibold text-slate-900">Preview</div>
        <div class="text-sm text-slate-800 whitespace-pre-line">
          {{ previewMessage }}
        </div>
      </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ElButton type="primary" :loading="saving" @click="handleSave">Save</ElButton>
        </div>

      <ElAlert
        v-if="success"
        type="success"
        :title="success"
        :closable="false"
        class="w-full"
      />
      <ElAlert
        v-if="error"
        type="error"
        :title="error"
        :closable="false"
        class="w-full"
      />
    </ElCard>

    <ElCard class="bg-white" :loading="loadingQr">
      <div class="flex flex-col gap-2">
        <div>
          <div class="text-sm font-semibold text-slate-900">Google Review QR</div>
          <div class="text-xs text-slate-600">
            Print or display this QR so customers can scan and leave a review on the spot.
          </div>
        </div>
        <ElDivider class="my-2" />
        <div v-if="reviewQr" class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
          <img
            :src="reviewQr.qrDataUrl"
            alt="Google review QR"
            class="h-40 w-40 rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
          />
          <div class="space-y-2 text-sm text-slate-700 break-all">
            <div class="text-xs font-semibold text-slate-900">Review link</div>
            <div>{{ reviewQr.reviewLink }}</div>
            <div class="flex flex-wrap gap-2">
              <ElButton size="small" type="primary" plain @click="openReviewLink">
                Open link
              </ElButton>
              <ElButton size="small" @click="copyReviewLink">
                Copy link
              </ElButton>
              <ElButton size="small" @click="downloadQr">
                Download QR
              </ElButton>
            </div>
            <div class="text-xs text-slate-600">
              Place this at the front desk so customers can scan and leave a review instantly.
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-slate-600">
          Configure your Google review link above to generate a QR.
        </div>
      </div>
    </ElCard>
  </div>
</template>
