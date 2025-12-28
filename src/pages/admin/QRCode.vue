<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElButton } from 'element-plus';
import QRCode from 'qrcode';
import { markQrPrinted } from '../../api/onboarding';

const qrDataUrl = ref('');
const salonName = ref(localStorage.getItem('businessName') || 'Your Salon');

const generateQr = async () => {
  const url = `${window.location.origin}/check-in`;
  qrDataUrl.value = await QRCode.toDataURL(url, { margin: 2, scale: 8 });
};

onMounted(() => {
  generateQr();
});

const handlePrint = () => {
  window.print();
  markQrPrinted().catch(() => {});
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
          <img :src="qrDataUrl" alt="Check-In QR Code" class="h-56 w-56" />
        </div>
        <div class="text-sm font-medium text-slate-700">Scan here to check in</div>
        <ElButton type="primary" size="large" class="w-full sm:w-auto" @click="handlePrint">
          Print
        </ElButton>
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
