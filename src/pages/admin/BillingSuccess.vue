<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElCard, ElResult, ElButton } from 'element-plus';
import { confirmBilling } from '../../api/billing';

const router = useRouter();
const loading = ref(true);
const success = ref(false);
const message = ref('Confirming your subscription...');

const sessionId = new URLSearchParams(window.location.search).get('session_id') || '';

const goToBilling = () => {
  router.replace({ name: 'admin-billing' });
};

onMounted(async () => {
  if (!sessionId) {
    message.value = 'Missing session. Redirecting...';
    setTimeout(goToBilling, 1000);
    return;
  }
  try {
    await confirmBilling(sessionId);
    success.value = true;
    message.value = 'You’re now subscribed.';
  } catch (err) {
    message.value = err instanceof Error ? err.message : 'Failed to confirm billing.';
  } finally {
    loading.value = false;
    setTimeout(goToBilling, 1500);
  }
});
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <ElCard class="w-full max-w-lg bg-white">
      <ElResult
        :icon="success ? 'success' : 'info'"
        title="Billing Confirmation"
        :sub-title="message"
      >
        <template #extra>
          <ElButton type="primary" :loading="loading" @click="goToBilling">Go to Billing</ElButton>
        </template>
      </ElResult>
    </ElCard>
  </div>
</template>
