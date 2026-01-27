<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElCard, ElInput, ElButton, ElMessage, ElTag } from 'element-plus';
import dayjs from 'dayjs';
import {
  addLegacyGiftCard,
  fetchGiftCard,
  sellGiftCard,
  fetchOutstandingGiftCards,
  type GiftCard,
} from '../../api/giftCards';

const sellForm = ref({ number: '', amount: '' });
const legacyForm = ref({ number: '', amount: '' });
const balanceNumber = ref('');
const balanceResult = ref<GiftCard | null>(null);
const loading = ref(false);
const balanceLoading = ref(false);
const listLoading = ref(false);
const outstanding = ref<GiftCard[]>([]);

const resetSell = () => {
  sellForm.value = { number: '', amount: '' };
};

const resetLegacy = () => {
  legacyForm.value = { number: '', amount: '' };
};

const handleSell = async () => {
  loading.value = true;
  try {
    const amount = Number(sellForm.value.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      throw new Error('Enter an amount greater than 0');
    }
    const card = await sellGiftCard({
      number: sellForm.value.number.trim() || undefined,
      amount,
    });
    ElMessage.success('Gift card saved (number auto-generated if left blank)');
    balanceResult.value = card;
    balanceNumber.value = card.number;
    resetSell();
    loadOutstanding();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to sell gift card');
  } finally {
    loading.value = false;
  }
};

const handleLegacy = async () => {
  loading.value = true;
  try {
    const amount = Number(legacyForm.value.amount);
    if (!legacyForm.value.number.trim() || Number.isNaN(amount) || amount <= 0) {
      throw new Error('Enter a card number and amount');
    }
    const card = await addLegacyGiftCard({ number: legacyForm.value.number.trim(), amount });
    ElMessage.success('Legacy gift card recorded');
    balanceResult.value = card;
    balanceNumber.value = card.number;
    resetLegacy();
    loadOutstanding();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to save legacy card');
  } finally {
    loading.value = false;
  }
};

const handleBalanceLookup = async () => {
  if (!balanceNumber.value.trim()) {
    ElMessage.warning('Enter a card number');
    return;
  }
  balanceLoading.value = true;
  try {
    balanceResult.value = await fetchGiftCard(balanceNumber.value.trim());
  } catch (err) {
    balanceResult.value = null;
    ElMessage.error(err instanceof Error ? err.message : 'Not found');
  } finally {
    balanceLoading.value = false;
  }
};

const formatCurrency = (val: number | null | undefined) =>
  Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(
    Number(val ?? 0),
  );

const statusLabel = (card: GiftCard | null) => {
  switch (card?.status) {
    case 'active':
      return 'Active';
    case 'redeemed':
      return 'Redeemed';
    case 'expired':
      return 'Expired';
    case 'inactive':
      return 'Inactive';
    default:
      return card?.balance && card.balance > 0 ? 'Active' : 'Depleted';
  }
};

const statusTone = (card: GiftCard | null): 'success' | 'warning' | 'info' | 'danger' => {
  switch (card?.status) {
    case 'active':
      return 'success';
    case 'redeemed':
      return 'info';
    case 'expired':
      return 'warning';
    case 'inactive':
      return 'info';
    default:
      return card?.balance && card.balance > 0 ? 'success' : 'info';
  }
};

const formatDateSafe = (value: string | null | undefined, pattern = 'MMM D, YYYY h:mm A') =>
  value ? dayjs(value).format(pattern) : '—';

const loadOutstanding = async () => {
  listLoading.value = true;
  try {
    outstanding.value = await fetchOutstandingGiftCards();
  } catch (err) {
    outstanding.value = [];
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load gift cards');
  } finally {
    listLoading.value = false;
  }
};

onMounted(loadOutstanding);
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Gift Cards</h1>
      <p class="text-sm text-slate-600">Sell new cards, migrate legacy balances, and check status.</p>
    </div>

    <ElCard class="bg-white">
      <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between gap-2">
            <div>
              <div class="text-base font-semibold text-slate-900">Sell Gift Card</div>
              <div class="text-xs text-slate-600">
                Create or top up a card. Leave number blank to auto-generate. sold_at is saved automatically.
              </div>
            </div>
            <ElButton type="primary" class="sf-btn sf-btn--table" :loading="loading" @click="handleSell">
              Save
            </ElButton>
          </div>
        <div class="grid gap-3 md:grid-cols-2">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-slate-800">Gift card number</label>
            <ElInput v-model="sellForm.number" placeholder="Card number" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-slate-800">Amount</label>
            <ElInput v-model="sellForm.amount" type="number" min="0" placeholder="0.00" />
          </div>
        </div>
      </div>
    </ElCard>

    <ElCard class="bg-white border-amber-200">
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-2">
          <div>
            <div class="text-base font-semibold text-amber-900">OLD GIFT CARD</div>
            <div class="text-xs text-amber-700">Legacy migration only. Tagged as source: legacy.</div>
          </div>
          <ElButton type="warning" plain class="sf-btn sf-btn--table" :loading="loading" @click="handleLegacy">
            Record legacy card
          </ElButton>
        </div>
        <div class="grid gap-3 md:grid-cols-2">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-slate-800">Gift card number</label>
            <ElInput v-model="legacyForm.number" placeholder="Legacy card number" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-slate-800">Amount</label>
            <ElInput v-model="legacyForm.amount" type="number" min="0" placeholder="0.00" />
          </div>
        </div>
      </div>
    </ElCard>

    <ElCard class="bg-white">
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-2">
          <div>
            <div class="text-base font-semibold text-slate-900">Check Gift Card Balance</div>
            <div class="text-xs text-slate-600">Read-only; no edits from here.</div>
          </div>
          <ElButton class="sf-btn sf-btn--table" :loading="balanceLoading" @click="handleBalanceLookup">
            Lookup
          </ElButton>
        </div>
        <div class="grid gap-3 md:grid-cols-2">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-slate-800">Gift card number</label>
            <ElInput v-model="balanceNumber" placeholder="Enter card number" />
          </div>
        </div>
        <div
          v-if="balanceResult"
          class="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-sm text-slate-800"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-semibold">Number:</span>
            <span>{{ balanceResult.maskedNumber || balanceResult.number }}</span>
            <ElTag :type="statusTone(balanceResult)" size="small">
              {{ statusLabel(balanceResult) }}
            </ElTag>
          </div>
          <div><span class="font-semibold">Initial:</span> {{ formatCurrency(balanceResult.initialValue ?? balanceResult.balance) }}</div>
          <div><span class="font-semibold">Balance:</span> {{ formatCurrency(balanceResult.balance) }}</div>
          <div class="flex items-center gap-3 text-xs text-slate-600">
            <span class="font-semibold text-slate-800">Used:</span>
            <span class="font-semibold text-slate-900">{{ balanceResult.usageCount ?? 0 }} times</span>
            <span v-if="balanceResult.lastUsedAt">• Last used: {{ formatDateSafe(balanceResult.lastUsedAt, 'MMM D, YYYY') }}</span>
          </div>
          <div>
            <span class="font-semibold">Issued:</span>
            {{ formatDateSafe(balanceResult.issuedAt || balanceResult.soldAt, 'MMM D, YYYY') }}
          </div>
          <div>
            <span class="font-semibold">Redeemed at:</span>
            {{ formatDateSafe(balanceResult.redeemedAt) }}
          </div>
          <div><span class="font-semibold">Source:</span> {{ balanceResult.source }}</div>
          <div v-if="balanceResult.notes"><span class="font-semibold">Notes:</span> {{ balanceResult.notes }}</div>
        </div>
      </div>
    </ElCard>

    <ElCard class="bg-white">
      <div class="flex items-center justify-between mb-3">
        <div>
          <div class="text-base font-semibold text-slate-900">Outstanding Gift Cards</div>
          <div class="text-xs text-slate-600">Active cards with remaining balance.</div>
        </div>
        <ElButton size="small" :loading="listLoading" @click="loadOutstanding">Refresh</ElButton>
      </div>
      <div v-if="listLoading" class="text-sm text-slate-600">Loading…</div>
      <div v-else-if="!outstanding.length" class="text-sm text-slate-600">No active gift cards with balance.</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm text-left text-slate-800">
          <thead>
            <tr class="border-b border-slate-200 text-slate-500 uppercase text-xs">
              <th class="py-2 pr-4">Card</th>
              <th class="py-2 pr-4">Initial</th>
              <th class="py-2 pr-4">Remaining</th>
              <th class="py-2 pr-4">Used</th>
              <th class="py-2 pr-4">Issued</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="card in outstanding" :key="card.id" class="border-b border-slate-100 last:border-0">
              <td class="py-2 pr-4 font-semibold">{{ card.maskedNumber || ('•••• ' + (card.number?.slice(-4) || '')) }}</td>
              <td class="py-2 pr-4">{{ formatCurrency(card.initialValue ?? card.balance) }}</td>
              <td class="py-2 pr-4">{{ formatCurrency(card.balance) }}</td>
              <td class="py-2 pr-4 text-slate-700">
                {{ card.usageCount ?? 0 }}<span v-if="card.lastUsedAt"> • {{ formatDateSafe(card.lastUsedAt, 'MMM D, YYYY') }}</span>
              </td>
              <td class="py-2 pr-4">
                <span v-if="card.issuedAt">{{ dayjs(card.issuedAt).format('MMM D, YYYY') }}</span>
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ElCard>
  </div>
</template>
