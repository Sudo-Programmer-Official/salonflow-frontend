<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { ElCard, ElButton, ElTag, ElProgress, ElMessage } from 'element-plus';
import { fetchGrowthPlan, requestGrowthUpgrade } from '../../../api/growth';
import { fetchInvoicePreview, type InvoiceEstimate } from '../../../api/invoice';

const loading = ref(false);
const plan = ref<string>('CORE');
const features = ref<any[]>([]);
const usage = ref<{ [k: string]: number }>({});
const trialExpiresAt = ref<string | null>(null);
const hasBonus = ref(false);
const invoice = ref<InvoiceEstimate | null>(null);
const invoiceLoading = ref(false);
const trialWarning = computed(() => {
  if (!trialExpiresAt.value) return null;
  const days = Math.ceil((new Date(trialExpiresAt.value).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return days;
});

const socialQuota = computed(() => {
  const f = features.value.find((f: any) => f.feature_key === 'social_posting');
  return f?.quota ?? null;
});
const socialUsed = computed(() => usage.value['social_posts'] || 0);
const usagePercent = computed(() => {
  if (!socialQuota.value || socialQuota.value === 0) return 0;
  return Math.min(100, Math.round((socialUsed.value / socialQuota.value) * 100));
});
const socialWarning = computed(() => {
  if (!socialQuota.value || socialQuota.value === 0) return null;
  const remaining = socialQuota.value - socialUsed.value;
  if (remaining <= 0) return 'You have reached your social post quota this month.';
  if (remaining <= 2) return `Only ${remaining} posts left this month.`;
  if (usagePercent.value >= 75) return `${remaining} posts left — consider upgrading for more.`;
  return null;
});

const load = async () => {
  loading.value = true;
  try {
    const data = await fetchGrowthPlan();
    plan.value = data.plan;
    features.value = data.features;
    usage.value = Object.fromEntries((data.usage || []).map((u) => [u.metric_key, u.count]));
    trialExpiresAt.value = data.trial_expires_at;
    hasBonus.value = (data.features || []).some((f: any) => f.source === 'grant');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load plan');
  } finally {
    loading.value = false;
  }
};

onMounted(load);
onMounted(async () => {
  invoiceLoading.value = true;
  try {
    invoice.value = await fetchInvoicePreview();
  } catch {
    invoice.value = null;
  } finally {
    invoiceLoading.value = false;
  }
});

const requestUpgradePlan = async (target: string) => {
  try {
    await requestGrowthUpgrade(target);
    ElMessage.success('Upgrade request sent');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to request upgrade');
  }
};

const featureEnabled = (key: string) =>
  features.value.find((f: any) => f.feature_key === key)?.enabled === true;
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Growth</h1>
        <p class="text-sm text-slate-600">Reviews, Google, and Social in one place.</p>
      </div>
      <ElTag type="info">Current plan: {{ plan }}</ElTag>
    </div>

    <div v-if="trialExpiresAt" class="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Trial active — expires {{ new Date(trialExpiresAt).toLocaleDateString() }}
      <span v-if="trialWarning && trialWarning <= 7"> ({{ trialWarning }} days left)</span>
    </div>
    <div v-else-if="hasBonus" class="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
      Bonus access active — Founder/promo perks applied by SalonFlow.
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <ElCard shadow="never" class="border border-slate-200" :loading="loading">
        <div class="text-lg font-semibold mb-1">Reviews</div>
        <p class="text-sm text-slate-600 mb-2">Automated review requests + internal feedback.</p>
        <ElTag :type="featureEnabled('reviews') ? 'success' : 'info'">
          {{ featureEnabled('reviews') ? 'Enabled' : 'Not enabled' }}
        </ElTag>
      </ElCard>

      <ElCard shadow="never" class="border border-slate-200" :loading="loading">
        <div class="text-lg font-semibold mb-1">Google Business Sync</div>
        <p class="text-sm text-slate-600 mb-2">Keep hours, phone, and photos synced.</p>
        <ElTag :type="featureEnabled('google_sync') ? 'success' : 'info'">
          {{ featureEnabled('google_sync') ? 'Enabled' : 'Not enabled' }}
        </ElTag>
      </ElCard>

      <ElCard shadow="never" class="border border-slate-200" :loading="loading">
        <div class="text-lg font-semibold mb-1">Social Posting</div>
        <p class="text-sm text-slate-600 mb-2">Schedule posts to Facebook / Google Business.</p>
        <div v-if="featureEnabled('social_posting') && socialQuota">
          <ElProgress :percentage="usagePercent" :text-inside="true" :stroke-width="16" />
          <div class="mt-1 text-xs text-slate-600">{{ socialUsed }} / {{ socialQuota }} posts this month</div>
          <div v-if="socialWarning" class="mt-1 text-xs text-amber-700">{{ socialWarning }}</div>
        </div>
        <ElTag v-else type="info">Not enabled</ElTag>
      </ElCard>
    </div>

    <ElCard shadow="never" class="border border-slate-200" :loading="invoiceLoading">
      <div class="flex items-center justify-between mb-2">
        <div>
          <div class="text-lg font-semibold">Estimated Invoice ({{ invoice?.month || 'current month' }})</div>
          <p class="text-sm text-slate-600">Read-only preview. Discounts and promos included.</p>
        </div>
        <ElTag type="info">{{ invoice?.plan || '—' }}</ElTag>
      </div>
      <div v-if="invoice">
        <ul class="text-sm text-slate-800 divide-y divide-slate-200">
          <li v-for="line in invoice.lines" :key="line.description + line.detail" class="py-1.5 flex justify-between">
            <div>
              <span class="font-medium">{{ line.description }}</span>
              <span v-if="line.detail" class="text-slate-500"> — {{ line.detail }}</span>
            </div>
            <div :class="line.amount < 0 ? 'text-emerald-700' : 'text-slate-900'">
              {{ line.amount < 0 ? '-' : '' }}${Math.abs(line.amount).toFixed(2)}
            </div>
          </li>
        </ul>
        <div class="mt-3 flex items-center justify-between text-base font-semibold text-slate-900">
          <span>Total (est.)</span>
          <span>${invoice.total.toFixed(2)} {{ invoice.currency }}</span>
        </div>
      </div>
      <div v-else class="text-sm text-slate-600">No invoice data yet.</div>
    </ElCard>

    <div class="grid gap-4 md:grid-cols-2">
      <ElCard shadow="never" class="border border-slate-200">
        <div class="flex items-center justify-between mb-2">
          <div>
            <div class="text-lg font-semibold">Growth Starter</div>
            <p class="text-sm text-slate-600">Reviews + Google Sync</p>
          </div>
          <ElButton type="primary" plain @click="requestUpgradePlan('GROWTH_STARTER')">Request upgrade</ElButton>
        </div>
        <ul class="text-sm text-slate-700 space-y-1">
          <li>✔ Automated reviews</li>
          <li>✔ Google Business sync</li>
          <li>✖ Social posting</li>
        </ul>
      </ElCard>

      <ElCard shadow="never" class="border border-slate-200">
        <div class="flex items-center justify-between mb-2">
          <div>
            <div class="text-lg font-semibold">Growth Pro</div>
            <p class="text-sm text-slate-600">Add social scheduling</p>
          </div>
          <ElButton type="primary" @click="requestUpgradePlan('GROWTH_PRO')">Request upgrade</ElButton>
        </div>
        <ul class="text-sm text-slate-700 space-y-1">
          <li>✔ Automated reviews</li>
          <li>✔ Google Business sync</li>
          <li>✔ Social posts (8/mo)</li>
        </ul>
      </ElCard>

      <ElCard shadow="never" class="border border-slate-200 md:col-span-2">
        <div class="flex items-center justify-between mb-2">
          <div>
            <div class="text-lg font-semibold">Growth Max</div>
            <p class="text-sm text-slate-600">More posts + AI (future)</p>
          </div>
          <ElButton type="primary" plain @click="requestUpgradePlan('GROWTH_MAX')">Request upgrade</ElButton>
        </div>
        <ul class="text-sm text-slate-700 space-y-1">
          <li>✔ Automated reviews</li>
          <li>✔ Google Business sync</li>
          <li>✔ Social posts (20/mo)</li>
          <li>✔ AI Assist (when available)</li>
        </ul>
      </ElCard>
    </div>
  </div>
</template>
