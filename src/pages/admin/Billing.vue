<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { ElCard, ElButton, ElAlert, ElMessage, ElDivider } from 'element-plus';
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
import { formatInBusinessTz } from '../../utils/dates';

const status = ref<SubscriptionStatus | null>(null);
const billing = ref<{
  status: string;
  plan: string | null;
  renewsAt: string | null;
  billingMode: string;
  isDemo: boolean;
  canSubscribe?: boolean;
  subscriptionId?: string | null;
  customerId?: string | null;
} | null>(null);
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
    billing.value = data.billing ?? null;
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
  if (billing.value) {
    if (billing.value.status === 'active' && billing.value.plan === 'demo') return 'Active (Demo)';
    if (billing.value.status === 'active') return 'Active';
    if (billing.value.status === 'past_due') return 'Past Due';
    if (billing.value.status === 'trial') return 'Trial';
    if (billing.value.status === 'inactive') return 'Not Subscribed';
  }
  if (!s) return 'Unknown';
  if (s === 'active') return 'Active';
  if (s === 'trial') return 'Trial';
  if (s === 'past_due') return 'Past Due';
  if (s === 'canceled') return 'Canceled';
  return s;
};

const renewalText = computed(() => {
  if (!billing.value?.renewsAt) return null;
  const renewDate = new Date(billing.value.renewsAt);
  const days = Math.ceil((renewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (Number.isNaN(days)) return null;
  const dateLabel = formatInBusinessTz(renewDate.toISOString(), 'MMM D, YYYY');
  return `${days > 0 ? `Renews in ${days} day${days === 1 ? '' : 's'}` : 'Renewal today'} (${dateLabel})`;
});

const canSubscribe = computed(() => billing.value?.canSubscribe !== false);
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Billing</h1>
      <p class="text-sm text-slate-600">Manage your SalonFlow subscription.</p>
    </div>

    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-900">Plans</h2>
        <span v-if="!canSubscribe" class="text-xs text-slate-600">Subscription active — manage below.</span>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="flex min-h-[260px] flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-[0_1px_6px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5">
          <div class="text-base font-semibold text-slate-900">Monthly</div>
          <div class="text-3xl font-bold text-slate-900">$65<span class="text-base font-medium text-slate-600">/mo</span></div>
          <ul class="space-y-2 text-sm text-slate-700">
            <li>✓ Core platform access</li>
            <li>✓ Queue + appointments</li>
            <li>✓ SMS reminders (metered)</li>
          </ul>
          <div class="mt-auto">
            <ElButton
              type="primary"
              class="w-full"
              :loading="actionLoading === 'monthly'"
              :disabled="!canSubscribe"
              @click="handleCheckout('monthly')"
            >
              Subscribe Monthly
            </ElButton>
          </div>
        </div>

        <div class="relative flex min-h-[260px] flex-col gap-3 rounded-xl border-2 border-sky-500 bg-white p-5 shadow-[0_4px_12px_rgba(14,165,233,0.18)] transition hover:-translate-y-0.5">
          <span class="absolute right-3 top-3 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
            Best Value
          </span>
          <div class="text-base font-semibold text-slate-900">Annual</div>
          <div class="text-3xl font-bold text-slate-900">$700<span class="text-base font-medium text-slate-600">/yr</span></div>
          <ul class="space-y-2 text-sm text-slate-700">
            <li>✓ Everything in Monthly</li>
            <li>✓ Priority support</li>
            <li>✓ 2 months free</li>
          </ul>
          <div class="mt-auto">
            <ElButton
              type="primary"
              class="w-full"
              :loading="actionLoading === 'annual'"
              :disabled="!canSubscribe"
              @click="handleCheckout('annual')"
            >
              Subscribe Annual
            </ElButton>
          </div>
        </div>
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-slate-900">Current Subscription</h2>
      <ElCard class="bg-white">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
                {{ statusLabel(status) }}
              </span>
              <span
                v-if="billing?.plan && billing.plan !== 'demo'"
                class="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600"
              >
                {{ billing.plan === 'annual' ? 'Core Annual' : billing.plan === 'monthly' ? 'Core Monthly' : '' }}
              </span>
              <span
                v-if="billing?.isDemo"
                class="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700"
              >
                Demo Tenant
              </span>
              <span
                v-if="billing?.billingMode === 'sandbox'"
                class="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700"
              >
                Test Mode
              </span>
            </div>
            <div class="text-sm text-slate-700">
              {{ renewalText || `Renews at: ${billing?.renewsAt || '—'}` }}
            </div>
            <div class="text-xs text-slate-500">
              Subscription ID: {{ billing?.subscriptionId || '—' }} · Customer: {{ billing?.customerId || '—' }}
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <ElButton
              :loading="actionLoading === 'portal'"
              type="primary"
              plain
              @click="handlePortal"
            >
              Manage Billing
            </ElButton>
          </div>
        </div>
      </ElCard>
    </section>

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

    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-slate-900">SMS Credits & Add-ons</h2>
      <ElCard class="bg-white">
        <div class="flex flex-col gap-3">
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
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div class="text-base font-semibold text-slate-900">500 SMS</div>
              <div class="text-xl font-bold text-slate-900">$10</div>
              <div class="text-xs text-slate-600">Best for smaller teams.</div>
              <ElButton
                type="primary"
                class="w-full"
                :loading="actionLoading === 'sms-500' || smsLoading"
                @click="handleSmsPack(500)"
              >
                Buy 500 SMS
              </ElButton>
            </div>
            <div class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div class="text-base font-semibold text-slate-900">1,500 SMS</div>
              <div class="text-xl font-bold text-slate-900">$25</div>
              <div class="text-xs text-slate-600">Best for busy salons.</div>
              <ElButton
                type="primary"
                class="w-full"
                :loading="actionLoading === 'sms-1500' || smsLoading"
                @click="handleSmsPack(1500)"
              >
                Buy 1,500 SMS
              </ElButton>
            </div>
          </div>
          <ElDivider class="my-2" />
          <div class="text-sm text-slate-600">
            Included quota resets each billing cycle. Packs never expire; usage draws from included first, then packs.
          </div>
        </div>
      </ElCard>
    </section>
  </div>
</template>
