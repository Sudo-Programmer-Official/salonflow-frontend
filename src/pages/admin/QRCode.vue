<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElButton } from 'element-plus';
import QRCode from 'qrcode';
import { markQrPrinted } from '../../api/onboarding';
import { generateQrPoster } from '../../utils/qrPoster';

const qrDataUrl = ref('');
const posterDataUrl = ref('');
const salonName = ref(localStorage.getItem('businessName') || 'Your Salon');

const generateQr = async () => {
  const url = `${window.location.origin}/check-in`;
  qrDataUrl.value = await QRCode.toDataURL(url, { margin: 2, scale: 8 });
  posterDataUrl.value = await generateQrPoster({
    qrDataUrl: qrDataUrl.value,
    businessName: salonName.value,
    caption: 'Scan to check in',
    footer: 'Powered by SalonFlow',
  });
};

onMounted(() => {
  generateQr();
});

const handlePrint = () => {
  window.print();
  markQrPrinted().catch(() => {});
};

const handleDownload = () => {
  const link = document.createElement('a');
  link.href = posterDataUrl.value || qrDataUrl.value;
  link.download = 'salonflow-checkin-qr.png';
  link.click();
};
</script>

<template>
  <div class="space-y-6">
    <div class="text-center">
      <h1 class="text-2xl font-semibold text-slate-900">Check-In QR Code</h1>
      <p class="mt-2 text-sm text-slate-600">{{ salonName }}</p>
    </div>

    <ElCard class="bg-white text-center">
      <div class="flex flex-col items-center gap-4">
        <div v-if="qrDataUrl" class="rounded-lg bg-white p-4 shadow-sm">
          <img :src="posterDataUrl || qrDataUrl" alt="Check-In QR Code" class="max-h-[520px] w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-sm" />
        </div>
        <div class="text-sm font-medium text-slate-700">Scan here to check in</div>
        <div class="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <ElButton type="primary" size="large" class="w-full sm:w-auto" @click="handlePrint">
            Print
          </ElButton>
          <ElButton size="large" class="w-full sm:w-auto" @click="handleDownload">
            Download PNG
          </ElButton>
        </div>
      </div>
    </ElCard>

    <ElCard class="bg-white">
      <div class="space-y-2">
        <h2 class="text-lg font-semibold text-slate-900">Install on iPad (Kiosk Mode)</h2>
        <ol class="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Open this page on the iPad.</li>
          <li>Tap the Share icon, then choose <strong>Add to Home Screen</strong>.</li>
          <li>Open the new “SalonFlow” app icon. It launches to /app and routes you to the dashboard or login; use the Public Check-In button to open the kiosk view.</li>
          <li>Use iPad Guided Access to keep the kiosk locked (optional but recommended).</li>
        </ol>
        <p class="text-xs text-slate-500">
          PWA caches the shell for quick loads, but always fetches live data (queue, billing, check-ins) over network.
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
