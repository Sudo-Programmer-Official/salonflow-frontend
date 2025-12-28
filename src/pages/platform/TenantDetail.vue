<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElDescriptions, ElDescriptionsItem, ElAlert } from 'element-plus';
import { fetchTenantDetail, type TenantOverview, type TenantMetrics } from '../../api/superadmin';
import { useRoute } from 'vue-router';

const route = useRoute();
const businessId = route.params.businessId as string;
const tenant = ref<TenantOverview | null>(null);
const metrics = ref<TenantMetrics | null>(null);
const loading = ref(false);
const error = ref('');

const load = async () => {
  loading.value = true;
  try {
    const res = await fetchTenantDetail(businessId);
    tenant.value = res.tenant;
    metrics.value = res.metrics;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load tenant';
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Tenant Detail</h1>
      <p class="text-sm text-slate-600">Read-only metrics.</p>
    </div>

    <ElAlert v-if="error" type="error" :title="error" :closable="false" />

    <ElCard v-if="tenant" class="bg-white">
      <ElDescriptions title="Tenant" :column="2" border>
        <ElDescriptionsItem label="Name">{{ tenant.name }}</ElDescriptionsItem>
        <ElDescriptionsItem label="Subdomain">{{ tenant.subdomain }}</ElDescriptionsItem>
        <ElDescriptionsItem label="Status">{{ tenant.status }}</ElDescriptionsItem>
        <ElDescriptionsItem label="Created">{{ tenant.createdAt }}</ElDescriptionsItem>
      </ElDescriptions>
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
  </div>
</template>
