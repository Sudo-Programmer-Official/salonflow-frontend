<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElButton, ElCard, ElSkeleton, ElMessage } from 'element-plus';
import { fetchQueue, type QueueItem } from '@/api/queue';
import { formatPhone } from '@/utils/format';
import { humanizeTime } from '@/utils/dates';

const route = useRoute();
const router = useRouter();
const checkinId = computed(() => route.params.checkinId as string);

const loading = ref(true);
const item = ref<QueueItem | null>(null);

const loadCheckin = async () => {
  loading.value = true;
  try {
    // Pull current in-service items and locate the target check-in
    const res = await fetchQueue({ status: 'IN_SERVICE', limit: 100 });
    const list = (res as any).items ?? [];
    const match = list.find((q: QueueItem) => q.id === checkinId.value) as QueueItem | undefined;
    if (!match) {
      ElMessage.warning('Start service before checkout');
      router.replace({ name: 'admin-queue' });
      return;
    }
    item.value = match;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load checkout');
    router.replace({ name: 'admin-queue' });
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push({ name: 'admin-queue' });
};

onMounted(() => {
  loadCheckin();
});
</script>

<template>
  <div class="checkout-shell">
    <header class="checkout-header">
      <div class="header-left">
        <ElButton text type="primary" size="large" @click="goBack">← Back to Queue</ElButton>
        <div v-if="item" class="customer-meta">
          <div class="customer-name">{{ item.customerName || 'Customer' }}</div>
          <div class="customer-phone">{{ formatPhone(item.customerPhone) }}</div>
          <div class="customer-meta-sub">
            <span v-if="item.serviceName">Service: {{ item.serviceName }}</span>
            <span v-if="item.startedAt"> • In service for {{ humanizeTime(item.startedAt) }}</span>
          </div>
        </div>
      </div>
      <div class="header-right">
        <ElButton plain size="large" @click="goBack">Cancel</ElButton>
        <ElButton type="success" size="large" disabled>Complete checkout</ElButton>
      </div>
    </header>

    <main class="checkout-body">
      <section class="checkout-panel left">
        <ElCard v-if="loading" class="glass-card" shadow="never">
          <ElSkeleton rows="6" animated />
        </ElCard>
        <ElCard v-else class="glass-card" shadow="never">
          <div class="panel-title">Services</div>
          <p class="panel-sub">Service catalog and add-ons will appear here.</p>
        </ElCard>
      </section>
      <section class="checkout-panel right">
        <ElCard v-if="loading" class="glass-card" shadow="never">
          <ElSkeleton rows="5" animated />
        </ElCard>
        <ElCard v-else class="glass-card" shadow="never">
          <div class="panel-title">Bill</div>
          <p class="panel-sub">Summary, taxes, promos, and payments will live here.</p>
          <div class="bill-placeholder">Checkout UI scaffold</div>
        </ElCard>
      </section>
    </main>
  </div>
</template>

<style scoped>
.checkout-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc, #eef2ff);
  padding: 18px 20px 24px;
  gap: 16px;
}
.checkout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  position: sticky;
  top: 0;
  z-index: 5;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.customer-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.customer-name {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}
.customer-phone {
  font-size: 14px;
  color: #475569;
}
.customer-meta-sub {
  font-size: 13px;
  color: #64748b;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.checkout-body {
  display: grid;
  grid-template-columns: minmax(360px, 38%) minmax(360px, 1fr);
  gap: 16px;
  align-items: start;
}
.checkout-panel {
  min-height: 480px;
}
.glass-card {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
}
.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}
.panel-sub {
  margin-top: 4px;
  font-size: 13px;
  color: #64748b;
}
.bill-placeholder {
  margin-top: 16px;
  padding: 16px;
  border: 1px dashed rgba(148, 163, 184, 0.5);
  border-radius: 10px;
  color: #475569;
  background: rgba(248, 250, 252, 0.8);
}
@media (max-width: 1024px) {
  .checkout-body {
    grid-template-columns: 1fr;
  }
}
</style>
