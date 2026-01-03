<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElButton, ElAlert, ElMessage, ElDivider, ElSpace } from 'element-plus';
import {
  fetchBillingStatus,
  createCheckoutSession,
  createPortalSession,
  type SubscriptionStatus,
  fetchSmsCredits,
  createSmsPackCheckout,
  type SmsCredits,
} from '../../api/billing';
import { resetTrialState, setTrialEndsAt } from '../../api/trialBanner';

const status = ref<SubscriptionStatus | null>(null);
const loading = ref(false);
const actionLoading = ref<string | null>(null);
const smsLoading = ref(false);
const smsCredits = ref<SmsCredits | null>(null);
const success = ref('');
const error = ref('');

const query = new URLSearchParams(window.location.search);
if (query.get('success')) {
  success.value = 'Subscription activated. Welcome aboard!';
}
if (query.get('canceled')) {
  error.value = 'Subscription checkout was canceled.';
}
if (query.get('sms_success')) {
  success.value = 'SMS pack purchase completed.';
}
if (query.get('sms_canceled')) {
  error.value = 'SMS pack checkout was canceled.';
}

const loadStatus = async () => {
  loading.value = true;
  try {
    const data = await fetchBillingStatus();
    status.value = data.subscriptionStatus;
    setTrialEndsAt(data.trialEndsAt);
    if (data.subscriptionStatus === 'active') {
      resetTrialState();
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load billing status';
  } finally {
    loading.value = false;
  }
};

const loadSmsCredits = async () => {
  smsLoading.value = true;
  try {
    smsCredits.value = await fetchSmsCredits();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load SMS credits';
  } finally {
    smsLoading.value = false;
  }
};

onMounted(() => {
  loadStatus();
  loadSmsCredits();
});

const handleCheckout = async (plan: 'monthly' | 'annual') => {
  actionLoading.value = plan;
  try {
    const { url } = await createCheckoutSession(plan);
    if (url) {
      window.location.href = url;
    } else {
      throw new Error('No checkout URL returned');
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to start checkout');
  } finally {
    actionLoading.value = null;
  }
};

const handlePortal = async () => {
  actionLoading.value = 'portal';
  try {
    const { url } = await createPortalSession();
    if (url) {
      window.location.href = url;
    } else {
      throw new Error('No portal URL returned');
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to open portal');
  } finally {
    actionLoading.value = null;
  }
};

const handleSmsPack = async (pack: 500 | 1500) => {
  actionLoading.value = `sms-${pack}`;
  try {
    const { url } = await createSmsPackCheckout(pack);
    if (url) {
      window.location.href = url;
    } else {
      throw new Error('No checkout URL returned');
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to start SMS pack checkout');
  } finally {
    actionLoading.value = null;
  }
};

const statusLabel = (s: SubscriptionStatus | null) => {
  if (!s) return 'Unknown';
  if (s === 'active') return 'Active';
  if (s === 'trial') return 'Trial';
  if (s === 'past_due') return 'Past Due';
  if (s === 'canceled') return 'Canceled';
  return s;
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Billing</h1>
      <p class="text-sm text-slate-600">Manage your SalonFlow subscription.</p>
    </div>

    <ElCard class="bg-white">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="text-sm text-slate-600">Subscription Status</div>
          <div class="text-xl font-semibold text-slate-900">
            {{ statusLabel(status) }}
          </div>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <ElButton
            type="primary"
            :loading="actionLoading === 'monthly'"
            @click="handleCheckout('monthly')"
          >
            Subscribe Monthly
          </ElButton>
          <ElButton
            type="primary"
            :loading="actionLoading === 'annual'"
            @click="handleCheckout('annual')"
          >
            Subscribe Annual
          </ElButton>
          <ElButton
            :loading="actionLoading === 'portal'"
            @click="handlePortal"
          >
            Manage Billing
          </ElButton>
        </div>
      </div>
    </ElCard>

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

    <ElCard class="bg-white">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="text-sm text-slate-600">SMS Credits</div>
          <div class="text-xl font-semibold text-slate-900">
            <span v-if="smsCredits">
              {{ smsCredits.totalAvailable }} available
            </span>
            <span v-else>Loading…</span>
          </div>
          <div class="text-sm text-slate-600" v-if="smsCredits">
            Included remaining: {{ smsCredits.includedRemaining }} / {{ smsCredits.monthlyIncluded }} ·
            Purchased balance: {{ smsCredits.purchasedRemaining }} ·
            Usage this month: {{ smsCredits.monthlyUsage }}
          </div>
        </div>
        <ElSpace wrap>
          <ElButton
            type="primary"
            :loading="actionLoading === 'sms-500' || smsLoading"
            @click="handleSmsPack(500)"
          >
            Buy 500 SMS – $10
          </ElButton>
          <ElButton
            type="primary"
            :loading="actionLoading === 'sms-1500' || smsLoading"
            @click="handleSmsPack(1500)"
          >
            Buy 1,500 SMS – $25
          </ElButton>
        </ElSpace>
      </div>
      <ElDivider class="my-4" />
      <div class="text-sm text-slate-600">
        Included quota resets each billing cycle. Packs never expire; usage draws from included first, then packs.
      </div>
    </ElCard>
  </div>
</template>
