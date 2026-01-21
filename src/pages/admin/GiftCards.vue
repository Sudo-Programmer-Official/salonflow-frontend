<script setup lang="ts">
import { ref } from 'vue';
import { ElCard, ElInput, ElButton, ElMessage, ElTag } from 'element-plus';
import dayjs from 'dayjs';
import { addLegacyGiftCard, fetchGiftCard, sellGiftCard, type GiftCard } from '../../api/giftCards';

const sellForm = ref({ number: '', amount: '' });
const legacyForm = ref({ number: '', amount: '' });
const balanceNumber = ref('');
const balanceResult = ref<GiftCard | null>(null);
const loading = ref(false);
const balanceLoading = ref(false);

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
    if (!sellForm.value.number.trim() || Number.isNaN(amount) || amount <= 0) {
      throw new Error('Enter a card number and amount');
    }
    const card = await sellGiftCard({ number: sellForm.value.number.trim(), amount });
    ElMessage.success('Gift card saved');
    balanceResult.value = card;
    balanceNumber.value = card.number;
    resetSell();
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
            <div class="text-xs text-slate-600">Create or top up a card. sold_at is saved automatically.</div>
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
        <div v-if="balanceResult" class="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm text-slate-800">
          <div class="flex items-center gap-2">
            <span class="font-semibold">Number:</span>
            <span>{{ balanceResult.number }}</span>
            <ElTag :type="balanceResult.status === 'active' ? 'success' : 'info'" size="small">
              {{ balanceResult.status === 'active' ? 'Active' : 'Depleted' }}
            </ElTag>
          </div>
          <div><span class="font-semibold">Balance:</span> {{ formatCurrency(balanceResult.balance) }}</div>
          <div><span class="font-semibold">Sold at:</span> {{ balanceResult.soldAt ? dayjs(balanceResult.soldAt).format('MMM D, YYYY h:mm A') : '—' }}</div>
          <div><span class="font-semibold">Source:</span> {{ balanceResult.source }}</div>
        </div>
      </div>
    </ElCard>
  </div>
</template>
