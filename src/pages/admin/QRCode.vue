<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElButton, ElDivider, ElMessage } from 'element-plus';
import QRCode from 'qrcode';
import { markQrPrinted, fetchOnboardingStatus } from '../../api/onboarding';
import { fetchReviewQr } from '../../api/reviewSms';
import { fetchWebsiteSite } from '../../api/website';
import { generateQrPoster } from '../../utils/qrPoster';

type QrItem = {
  key: 'booking' | 'checkin' | 'kiosk' | 'review' | 'facebook';
  title: string;
  subtitle: string;
  link: string;
  qrDataUrl: string;
  posterDataUrl: string;
  loading: boolean;
  disabledReason?: string;
};

const items = ref<QrItem[]>([]);
const loading = ref(true);
const salonName = ref(localStorage.getItem('businessName') || 'Your Salon');
const baseDomain = ref('');

const addItem = (partial: Partial<QrItem>) => {
  items.value.push({
    key: partial.key as QrItem['key'],
    title: partial.title || '',
    subtitle: partial.subtitle || '',
    link: partial.link || '',
    qrDataUrl: partial.qrDataUrl || '',
    posterDataUrl: partial.posterDataUrl || '',
    loading: partial.loading ?? true,
    disabledReason: partial.disabledReason,
  });
};

const updateItem = (key: QrItem['key'], partial: Partial<QrItem>) => {
  const item = items.value.find((i) => i.key === key);
  if (!item) return;
  Object.assign(item, partial);
};

const buildBaseOrigin = (subdomain: string | null) => {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;
  const parts = host.split('.');
  const root = parts.length >= 2 ? parts.slice(1).join('.') : host;
  const tenant = subdomain || parts[0] || '';
  // Strip leading www from root if present.
  const cleanRoot = root.replace(/^www\./i, '');
  return `https://${tenant}.${cleanRoot}`;
};

const generateQr = async (link: string, caption: string) => {
  const qrDataUrl = await QRCode.toDataURL(link, { margin: 1, scale: 8 });
  const posterDataUrl = await generateQrPoster({
    qrDataUrl,
    businessName: salonName.value,
    caption,
    footer: 'Powered by SalonFlow',
  });
  return { qrDataUrl, posterDataUrl };
};

const loadCoreLinks = async (origin: string) => {
  const paths = [
    { key: 'booking' as const, path: 'check-in/book', title: 'Booking', subtitle: 'Guests can pick service + time' },
    { key: 'checkin' as const, path: 'check-in', title: 'Check-In', subtitle: 'Front desk / walk-ins' },
    { key: 'kiosk' as const, path: 'check-in/kiosk', title: 'Kiosk', subtitle: 'Tablet-locked flow' },
  ];
  for (const p of paths) {
    const link = `${origin}/${p.path}`;
    addItem({
      key: p.key,
      title: p.title,
      subtitle: p.subtitle,
      link,
      loading: true,
    });
    try {
      const { qrDataUrl, posterDataUrl } = await generateQr(link, `Scan for ${p.title}`);
      updateItem(p.key, { qrDataUrl, posterDataUrl, loading: false });
    } catch (err) {
      updateItem(p.key, { loading: false, disabledReason: 'Failed to generate QR' });
    }
  }
};

const loadReview = async () => {
  addItem({
    key: 'review',
    title: 'Google Review',
    subtitle: 'Send guests to your Google review link',
    link: '',
    loading: true,
  });
  try {
    const reviewQr = await fetchReviewQr();
    const posterDataUrl = await generateQrPoster({
      qrDataUrl: reviewQr.qrDataUrl,
      businessName: salonName.value,
      caption: 'Scan to leave a review',
      footer: 'Powered by SalonFlow',
    });
    updateItem('review', {
      link: reviewQr.reviewLink,
      qrDataUrl: reviewQr.qrDataUrl,
      posterDataUrl,
      loading: false,
    });
  } catch (err) {
    updateItem('review', {
      loading: false,
      disabledReason: 'Add your Google review link in Review SMS to enable this QR.',
    });
  }
};

const loadFacebook = async () => {
  addItem({
    key: 'facebook',
    title: 'Facebook Page',
    subtitle: 'Guests can like or follow',
    link: '',
    loading: true,
  });
  try {
    const site = await fetchWebsiteSite();
    const fb = site.layout?.footer?.social?.facebook || null;
    if (!fb) {
      throw new Error('No Facebook page configured');
    }
    const { qrDataUrl, posterDataUrl } = await generateQr(fb, 'Scan to visit our Facebook page');
    updateItem('facebook', { link: fb, qrDataUrl, posterDataUrl, loading: false });
  } catch (err: any) {
    updateItem('facebook', {
      loading: false,
      disabledReason: 'Set your Facebook page URL in Website > Footer > Social to generate this QR.',
    });
  }
};

const copyLink = async (link: string) => {
  if (!link || !navigator?.clipboard) return;
  await navigator.clipboard.writeText(link);
  ElMessage.success('Link copied');
};

const openLink = (link: string) => {
  if (!link) return;
  window.open(link, '_blank');
};

const downloadPng = (item: QrItem) => {
  const url = item.posterDataUrl || item.qrDataUrl;
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = `${item.key}-qr.png`;
  a.click();
};

const printCheckin = () => {
  window.print();
  markQrPrinted().catch(() => {});
};

onMounted(async () => {
  try {
    const status = await fetchOnboardingStatus(true);
    salonName.value = status.businessName || salonName.value;
    baseDomain.value = buildBaseOrigin(status.subdomain);
    await Promise.all([loadCoreLinks(baseDomain.value), loadReview(), loadFacebook()]);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="space-y-6">
    <div class="text-center">
      <h1 class="text-2xl font-semibold text-slate-900">QR Codes</h1>
      <p class="mt-2 text-sm text-slate-600">Everything in one place: booking, check-in, kiosk, reviews, and social.</p>
    </div>

    <ElCard class="bg-white">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="item in items"
          :key="item.key"
          class="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="text-base font-semibold text-slate-900">{{ item.title }}</div>
              <div class="text-xs text-slate-600">{{ item.subtitle }}</div>
            </div>
            <ElButton
              v-if="item.key === 'checkin'"
              size="small"
              type="primary"
              plain
              class="sf-btn sf-btn--table"
              @click="printCheckin"
            >
              Print
            </ElButton>
          </div>
          <ElDivider class="my-3" />
          <div class="flex flex-col items-center gap-3">
            <div v-if="item.loading" class="h-40 w-40 rounded-lg border border-dashed border-slate-300 bg-white" />
            <img
              v-else-if="item.qrDataUrl"
              :src="item.posterDataUrl || item.qrDataUrl"
              :alt="`${item.title} QR`"
              class="h-44 w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
            />
            <div v-else class="text-xs text-amber-700 text-center">
              {{ item.disabledReason || 'Not configured yet.' }}
            </div>
          </div>
          <div class="mt-3 space-y-1 break-all text-xs text-slate-700">
            <div class="font-semibold text-slate-900">Link</div>
            <div>{{ item.link || '—' }}</div>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <ElButton size="small" type="primary" plain class="sf-btn sf-btn--table" :disabled="!item.link" @click="openLink(item.link)">
              Open
            </ElButton>
            <ElButton size="small" class="sf-btn sf-btn--table" :disabled="!item.link" @click="copyLink(item.link)">
              Copy
            </ElButton>
            <ElButton size="small" class="sf-btn sf-btn--table" :disabled="!item.qrDataUrl" @click="downloadPng(item)">
              Download PNG
            </ElButton>
          </div>
        </div>
      </div>
    </ElCard>

    <ElCard class="bg-white">
      <div class="space-y-2">
        <h2 class="text-lg font-semibold text-slate-900">Install on iPad (Kiosk Mode)</h2>
        <ol class="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Open this page on the iPad.</li>
          <li>Tap the Share icon, then choose <strong>Add to Home Screen</strong>.</li>
          <li>Use the Kiosk or Check-In QR to launch the public flow.</li>
          <li>Use iPad Guided Access to keep the kiosk locked (optional but recommended).</li>
        </ol>
        <p class="text-xs text-slate-500">
          PWAs cache the shell for quick loads but always fetch live data (queue, billing, check-ins) over network.
        </p>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
@media print {
  :host {
    background: white !important;
  }
  .el-card {
    box-shadow: none !important;
    border: none !important;
  }
  button {
    display: none !important;
  }
}
</style>
