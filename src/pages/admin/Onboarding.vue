<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElDivider, ElTag, ElButton, ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { fetchOnboardingStatus, seedDemoServices } from '../../api/onboarding';

const router = useRouter();
const status = ref<Awaited<ReturnType<typeof fetchOnboardingStatus>> | null>(null);
const loading = ref(false);
const seeding = ref(false);

const quickNav = (name: string) => {
  router.push({ name });
};

const load = async () => {
  loading.value = true;
  try {
    status.value = await fetchOnboardingStatus(true);
    if (status.value.businessName) {
      localStorage.setItem('businessName', status.value.businessName);
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load onboarding');
  } finally {
    loading.value = false;
  }
};

const seedServices = async () => {
  seeding.value = true;
  try {
    status.value = await seedDemoServices();
    ElMessage.success('Sample services added. You can edit or delete them anytime.');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to seed services');
  } finally {
    seeding.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold text-slate-900">Owner Onboarding</h1>
      <p class="text-sm text-slate-600">A 20-minute setup to get your salon running on SalonFlow.</p>
    </div>

    <ElCard class="bg-white" :loading="loading">
      <div class="flex items-center gap-2 text-sm font-medium text-slate-900">
        <ElTag type="success" effect="light">Step 1</ElTag>
        Business Setup (5 minutes)
      </div>
      <ul class="mt-3 space-y-2 text-sm text-slate-700">
        <li>✔ Confirm your business name & hours</li>
        <li>✔ Verify your salon phone number</li>
        <li>✔ Add your Google Review link (recommended)</li>
      </ul>
      <p class="mt-3 text-xs text-slate-500">
        Enables review requests and cleaner customer history.
      </p>
    </ElCard>

    <ElCard class="bg-white" :loading="loading">
      <div class="flex items-center gap-2 text-sm font-medium text-slate-900">
        <ElTag type="success" effect="light">Step 2</ElTag>
        Add Services (5 minutes)
      </div>
      <ul class="mt-3 space-y-2 text-sm text-slate-700">
        <li>✔ Add each service you offer</li>
        <li>✔ Set duration (for scheduling & flow)</li>
        <li>✔ Set points earned (default = 1 point per $1)</li>
        <li>✔ Activate services</li>
      </ul>
      <div class="mt-3 flex flex-wrap gap-2">
        <ElButton type="primary" size="small" @click="quickNav('admin-services')">
          Go to Services
        </ElButton>
        <ElButton
          v-if="status?.shouldSeedDemo"
          size="small"
          :loading="seeding"
          @click="seedServices"
        >
          Add sample services
        </ElButton>
      </div>
      <p class="mt-3 text-xs text-slate-500">
        Services power check-ins, appointments, reporting, and loyalty.
      </p>
    </ElCard>

    <ElCard class="bg-white">
      <div class="flex items-center gap-2 text-sm font-medium text-slate-900">
        <ElTag type="success" effect="light">Step 3</ElTag>
        Add Staff (5 minutes)
      </div>
      <ul class="mt-3 space-y-2 text-sm text-slate-700">
        <li>✔ Add staff names</li>
        <li>✔ Enable/disable staff as needed</li>
        <li>✔ Staff can log in on their phones</li>
      </ul>
      <div class="mt-3">
        <ElButton size="small" @click="quickNav('admin-staff')">
          Go to Staff
        </ElButton>
      </div>
      <p class="mt-3 text-xs text-slate-500">
        Staff see their queue and appointments only — no admin access.
      </p>
    </ElCard>

    <ElCard class="bg-white">
      <div class="flex items-center gap-2 text-sm font-medium text-slate-900">
        <ElTag type="success" effect="light">Step 4</ElTag>
        Print Your QR Code (2 minutes)
      </div>
      <ul class="mt-3 space-y-2 text-sm text-slate-700">
        <li>✔ Print the QR code</li>
        <li>✔ Place it at reception or entrance</li>
      </ul>
      <div class="mt-3">
        <ElButton size="small" @click="quickNav('admin-qr')">
          Go to QR Code
        </ElButton>
      </div>
      <p class="mt-3 text-xs text-slate-500">
        Customers can scan to check in or book online.
      </p>
    </ElCard>

    <ElCard class="bg-white">
      <div class="flex items-center gap-2 text-sm font-medium text-slate-900">
        <ElTag type="warning" effect="light">Optional</ElTag>
        Enable SMS Features (3 minutes)
      </div>
      <ul class="mt-3 space-y-2 text-sm text-slate-700">
        <li>✔ Enable Review Requests</li>
        <li>✔ Enable Appointment Reminders</li>
        <li>✔ Consent language is built-in</li>
      </ul>
      <div class="mt-3 flex flex-wrap gap-2">
        <ElButton size="small" @click="quickNav('admin-review-sms')">
          Review SMS
        </ElButton>
        <ElButton size="small" @click="quickNav('admin-appointment-reminders')">
          Appointment Reminders
        </ElButton>
      </div>
      <p class="mt-3 text-xs text-slate-500">
        SMS is consent-based; failed sends are logged and refunded automatically.
      </p>
    </ElCard>

    <ElCard class="bg-white">
      <div class="flex items-center gap-2 text-sm font-medium text-slate-900">
        <ElTag type="warning" effect="light">Optional</ElTag>
        Billing & SMS Credits
      </div>
      <ul class="mt-3 space-y-2 text-sm text-slate-700">
        <li>✔ View included SMS credits</li>
        <li>✔ Purchase SMS packs if needed</li>
        <li>✔ Track usage in real time</li>
      </ul>
      <div class="mt-3">
        <ElButton size="small" @click="quickNav('admin-billing')">
          Go to Billing
        </ElButton>
      </div>
    </ElCard>

    <ElCard class="bg-white">
      <div class="flex flex-col gap-3">
        <div class="text-lg font-semibold text-slate-900">You’re Live</div>
        <ElDivider class="my-0" />
        <ul class="space-y-2 text-sm text-slate-700">
          <li>• Handle walk-ins with QR or desk check-in</li>
          <li>• Manage staff queues and appointments</li>
          <li>• Track loyalty, VIP tiers, and redemptions</li>
          <li>• Send review requests and reminders (consent-based)</li>
          <li>• See performance in your admin dashboards</li>
        </ul>
        <div class="flex flex-wrap gap-2">
          <ElButton type="primary" plain @click="quickNav('admin-dashboard')">
            Go to Dashboard
          </ElButton>
          <ElButton @click="quickNav('admin-services')">Start with Services</ElButton>
        </div>
      </div>
    </ElCard>
  </div>
</template>
