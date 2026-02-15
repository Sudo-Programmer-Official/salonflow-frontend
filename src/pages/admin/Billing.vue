<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { ElCard, ElButton, ElAlert, ElMessage, ElDivider, ElInputNumber } from 'element-plus';
import {
  fetchBillingStatus,
  createCheckoutSession,
  createPortalSession,
  type SubscriptionStatus,
  fetchSmsCredits,
  createSmsPackCheckout,
  type SmsCredits,
  type SmsUsage,
  type SmsPricing,
  type SmsPackInfo,
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
const smsUsage = ref<SmsUsage | null>(null);
const smsPricing = ref<SmsPricing | null>(null);
const smsPacks = ref<SmsPackInfo[]>([]);
const packQuantities = ref<Record<number, number>>({
  500: 1,
  1500: 1,
  4000: 1,
});
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
    smsUsage.value = data.smsUsage ?? null;
    smsPricing.value = data.smsPricing ?? null;
    smsPacks.value = Array.isArray(data.smsPacks) ? data.smsPacks : [];
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

const handleSmsPack = async (pack: 500 | 1500 | 4000) => {
  actionLoading.value = `sms-${pack}`;
  try {
    const quantity = Math.min(20, Math.max(1, Number(packQuantities.value[pack] ?? 1)));
    const { url } = await createSmsPackCheckout(pack, quantity);
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

const unitPrice = computed(() => smsPricing.value?.unitPrice ?? 0.0083);

const normalizedPacks = computed(() => {
  const allowed = [500, 1500, 4000];
  const list = smsPacks.value.length
    ? smsPacks.value.filter((p) => allowed.includes(p.size))
    : allowed.map((size) => ({ size, price: Number((size * unitPrice.value).toFixed(2)) }));
  return list.sort((a, b) => a.size - b.size);
});

const packTotal = (pack: SmsPackInfo) => {
  const qty = Math.min(20, Math.max(1, Number(packQuantities.value[pack.size] ?? 1)));
  return pack.price * qty;
};

const updateQty = (packSize: number, val: number | undefined) => {
  const next = Number.isFinite(val)
    ? Math.min(20, Math.max(1, Math.round(Number(val))))
    : 1;
  packQuantities.value = { ...packQuantities.value, [packSize]: next };
};
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
      <h2 class="text-lg font-semibold text-slate-900">SMS Usage & Pricing</h2>
      <ElCard class="bg-white">
        <div class="grid gap-4 md:grid-cols-3">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div class="text-xs uppercase tracking-wide text-slate-600">This cycle</div>
            <div class="mt-1 text-2xl font-semibold text-slate-900">
              {{ smsUsage?.total ?? 0 }} messages
            </div>
            <div class="text-sm text-slate-600">
              Sent: {{ smsUsage?.sent ?? 0 }} · Received: {{ smsUsage?.received ?? 0 }}
            </div>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div class="text-xs uppercase tracking-wide text-slate-600">Estimated cost</div>
            <div class="mt-1 text-2xl font-semibold text-slate-900">
              ${{ (smsUsage?.estimatedCost ?? 0).toFixed(2) }}
            </div>
            <div class="text-sm text-slate-600">
              Calculated at ${{ unitPrice.toFixed(4) }} per segment (send or receive)
            </div>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div class="text-xs uppercase tracking-wide text-slate-600">Transparency</div>
            <div class="mt-1 text-sm text-slate-700">
              Prices are passed through from carriers (Twilio). No markup.
              Platform subscription fees are separate.
            </div>
          </div>
        </div>
      </ElCard>

      <ElCard class="bg-white">
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-base font-semibold text-slate-900">Buy SMS credits (optional)</div>
              <div class="text-sm text-slate-600">Credits never expire; usage draws from credits first.</div>
            </div>
            <div class="text-xs text-slate-500">
              Unit price: ${{ unitPrice.toFixed(4) }} per message
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-3">
            <div
              v-for="pack in normalizedPacks"
              :key="pack.size"
              class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
            >
              <div class="text-base font-semibold text-slate-900">{{ pack.size.toLocaleString() }} SMS</div>
              <div class="text-xl font-bold text-slate-900">${{ pack.price.toFixed(2) }} each</div>
              <div class="text-xs text-slate-600">Pass-through pricing</div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-slate-700">Qty</span>
                <ElInputNumber
                  v-model="packQuantities[pack.size]"
                  :min="1"
                  :max="20"
                  size="small"
                  controls-position="right"
                  @change="(val: number | undefined) => updateQty(pack.size, val)"
                />
              </div>
              <div class="text-sm font-semibold text-slate-900">
                Total: ${{ packTotal(pack).toFixed(2) }}
              </div>
              <ElButton
                type="default"
                plain
                size="small"
                class="w-full"
                :loading="actionLoading === `sms-${pack.size}` || smsLoading"
                @click="handleSmsPack(pack.size as 500 | 1500 | 4000)"
              >
                Buy {{ (pack.size * Math.max(1, packQuantities[pack.size] || 1)).toLocaleString() }} SMS
              </ElButton>
            </div>
          </div>
          <ElDivider class="my-2" />
          <div class="text-sm text-slate-600">
            Billing is utility-style: usage × unit price. Credits are optional and never expire.
          </div>
        </div>
      </ElCard>
    </section>
  </div>
</template>
