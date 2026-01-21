<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  fetchCustomerProfile,
  fetchCustomerLedger,
  fetchCustomerRedemptions,
  fetchRedemptionRules,
  redeemPoints,
  type CustomerProfile,
  type LedgerEntry,
  type RedemptionEntry,
  type RedemptionRule,
} from '../../api/customerProfile';
import { ElCard, ElAlert, ElTable, ElTableColumn, ElTag, ElButton, ElSelect, ElOption, ElMessage, ElDialog } from 'element-plus';
import { formatInBusinessTz } from '../../utils/dates';
import { formatPhone } from '../../utils/format';

const route = useRoute();
const customerId = route.params.customerId as string;

const profile = ref<CustomerProfile | null>(null);
const ledger = ref<LedgerEntry[]>([]);
const redemptions = ref<RedemptionEntry[]>([]);
const rules = ref<RedemptionRule[]>([]);

const loading = ref(false);
const error = ref('');
const redeemDialog = ref(false);
const redeemRuleId = ref('');
const redeeming = ref(false);

const load = async () => {
  loading.value = true;
  try {
    profile.value = await fetchCustomerProfile(customerId);
    ledger.value = await fetchCustomerLedger(customerId);
    redemptions.value = await fetchCustomerRedemptions(customerId);
    rules.value = await fetchRedemptionRules();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load profile';
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const points = computed(() => profile.value?.loyalty.pointsBalance ?? 0);
const canRedeem = computed(() => {
  const rule = rules.value.find((r) => r.ruleId === redeemRuleId.value);
  if (!rule) return false;
  return points.value >= rule.pointsCost;
});

const startRedeem = () => {
  redeemRuleId.value = '';
  redeemDialog.value = true;
};

const confirmRedeem = async () => {
  redeeming.value = true;
  try {
    if (!redeemRuleId.value) {
      ElMessage.warning('Select a reward');
      redeeming.value = false;
      return;
    }
    await redeemPoints(customerId, redeemRuleId.value);
    ElMessage.success('Redeemed successfully');
    redeemDialog.value = false;
    await load();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Redeem failed');
  } finally {
    redeeming.value = false;
  }
};
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Customer Profile</h1>
      <p class="text-sm text-slate-600">Loyalty, VIP, and redemption history.</p>
    </div>

    <ElAlert v-if="error" type="error" :title="error" :closable="false" />

    <ElCard v-if="profile" class="bg-white">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="text-lg font-semibold text-slate-900">{{ profile.customer.name }}</div>
          <div class="text-sm text-slate-600">{{ formatPhone(profile.customer.phoneE164) }}</div>
          <div class="text-xs text-slate-500">Member since: {{ formatInBusinessTz(profile.customer.createdAt, 'MMM D, YYYY') }}</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <div class="text-xs text-slate-500">Points</div>
            <div class="text-2xl font-semibold text-slate-900">{{ profile.loyalty.pointsBalance }}</div>
          </div>
          <ElTag type="info" effect="dark">{{ profile.loyalty.vipTier }}</ElTag>
        </div>
      </div>
    </ElCard>

    <ElCard class="bg-white">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-base font-semibold text-slate-900">Points History</div>
      </div>
      <ElTable :data="ledger" :loading="loading" stripe>
        <ElTableColumn prop="delta" label="Points" width="100" />
        <ElTableColumn prop="reason" label="Reason" min-width="140" />
        <ElTableColumn prop="referenceType" label="Ref" min-width="120" />
        <ElTableColumn prop="createdAt" label="Date" min-width="160" :formatter="(_, __, val) => formatInBusinessTz(val, 'MMM D, YYYY h:mm A')" />
      </ElTable>
      <div v-if="!loading && ledger.length === 0" class="py-4 text-center text-sm text-slate-500">
        No history yet.
      </div>
    </ElCard>

    <ElCard class="bg-white">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-base font-semibold text-slate-900">Redemptions</div>
      </div>
      <ElTable :data="redemptions" :loading="loading" stripe>
        <ElTableColumn prop="ruleName" label="Reward" min-width="160" />
        <ElTableColumn prop="pointsSpent" label="Points Spent" width="140" />
        <ElTableColumn prop="createdAt" label="Date" min-width="160" :formatter="(_, __, val) => formatInBusinessTz(val, 'MMM D, YYYY h:mm A')" />
      </ElTable>
      <div v-if="!loading && redemptions.length === 0" class="py-4 text-center text-sm text-slate-500">
        No redemptions yet.
      </div>
    </ElCard>

    <ElCard v-if="profile" class="bg-white">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-base font-semibold text-slate-900">Redeem Points (Owner only)</div>
        <ElButton type="primary" size="small" @click="startRedeem">Redeem</ElButton>
      </div>
      <div class="text-sm text-slate-600">
        Select a reward and confirm. Button should be hidden/disabled for STAFF in production RBAC.
      </div>
    </ElCard>

    <ElDialog v-model="redeemDialog" title="Redeem Points" width="400px">
      <div class="space-y-4">
        <div class="text-sm text-slate-700">Available points: {{ points }}</div>
        <ElSelect v-model="redeemRuleId" placeholder="Select reward" class="w-full">
          <ElOption
            v-for="rule in rules"
            :key="rule.ruleId"
            :label="`${rule.name} — ${rule.pointsCost} pts`"
            :value="rule.ruleId"
            :disabled="points < rule.pointsCost"
          />
        </ElSelect>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="redeemDialog = false">Cancel</ElButton>
          <ElButton type="primary" :disabled="!canRedeem" :loading="redeeming" @click="confirmRedeem">
            Redeem
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>
