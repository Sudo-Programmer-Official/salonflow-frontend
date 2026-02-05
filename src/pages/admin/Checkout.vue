<script setup lang="ts">
import { onMounted, ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { ElButton, ElCard, ElSkeleton, ElMessage, ElInput, ElMessageBox } from 'element-plus';
import { fetchQueue, checkoutCheckIn, type QueueItem } from '@/api/queue';
import { formatPhone } from '@/utils/format';
import { humanizeTime } from '@/utils/dates';
import { fetchServices, type ServiceItem } from '@/api/services';
import { fetchCategories, type ServiceCategory } from '@/api/serviceCategories';
import { fetchGiftCard, type GiftCard } from '@/api/giftCards';

const route = useRoute();
const router = useRouter();
const checkinId = computed(() => route.params.checkinId as string);

const loading = ref(true);
const item = ref<QueueItem | null>(null);
const categories = ref<ServiceCategory[]>([]);
const services = ref<ServiceItem[]>([]);
const selectedCategory = ref<string>('all');
const search = ref('');
const draftSelections = ref<Record<string, string[]>>({});
const paymentOptions = ref<{ cash: boolean; card: boolean; gift: boolean }>({
  cash: false,
  card: false,
  gift: false,
});
const paymentAmounts = ref<{ cash: string; card: string }>({ cash: '', card: '' });
const giftCards = ref<Array<{ id: number; number: string; amount: string }>>([{ id: 1, number: '', amount: '' }]);
const nextGiftCardId = ref(2);
const giftCardInfo = ref<Record<number, { loading: boolean; error: string; card: GiftCard | null }>>({});
const fetchedNumbers = ref<Record<number, string>>({});

const DRAFT_KEY = 'checkoutDraftSelections';
const PAYMENT_KEY = 'checkoutPayments';

const loadDrafts = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    draftSelections.value = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    draftSelections.value = {};
  }
  try {
    const rawPay = localStorage.getItem(PAYMENT_KEY);
    const parsed = rawPay ? (JSON.parse(rawPay) as Record<string, any>) : {};
    const pay = parsed[checkinId.value];
    if (pay) {
      paymentOptions.value = { ...paymentOptions.value, ...(pay.options ?? {}) };
      paymentAmounts.value = { ...paymentAmounts.value, ...(pay.amounts ?? {}) };
      giftCards.value = pay.giftCards ?? [{ id: 1, number: '', amount: '' }];
      nextGiftCardId.value = giftCards.value.length
        ? Math.max(...giftCards.value.map((g) => g.id)) + 1
        : 2;
    }
  } catch {
    // ignore
  }
};

const persistDrafts = () => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draftSelections.value));
};
const persistPayments = () => {
  const existing = (() => {
    try {
      return JSON.parse(localStorage.getItem(PAYMENT_KEY) || '{}');
    } catch {
      return {};
    }
  })() as Record<string, any>;
  existing[checkinId.value] = {
    options: paymentOptions.value,
    amounts: paymentAmounts.value,
    giftCards: giftCards.value,
  };
  localStorage.setItem(PAYMENT_KEY, JSON.stringify(existing));
};
const clearDraftForCurrent = () => {
  try {
    const drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    delete drafts[checkinId.value];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch {
    /* ignore */
  }
  try {
    const pays = JSON.parse(localStorage.getItem(PAYMENT_KEY) || '{}');
    delete pays[checkinId.value];
    localStorage.setItem(PAYMENT_KEY, JSON.stringify(pays));
  } catch {
    /* ignore */
  }
  draftSelections.value = { ...draftSelections.value, [checkinId.value]: [] };
  paymentOptions.value = { cash: false, card: false, gift: false };
  paymentAmounts.value = { cash: '', card: '' };
  giftCards.value = [{ id: 1, number: '', amount: '' }];
  nextGiftCardId.value = 2;
  giftCardInfo.value = {};
  fetchedNumbers.value = {};
};

const selectedServiceIds = computed({
  get: () => draftSelections.value[checkinId.value] ?? [],
  set: (ids: string[]) => {
    draftSelections.value = { ...draftSelections.value, [checkinId.value]: ids };
  },
});

const filteredCategories = computed(() =>
  categories.value.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
);

const filteredServices = computed(() => {
  const q = search.value.trim().toLowerCase();
  return services.value
    .filter((svc) => svc.isActive !== false)
    .filter((svc) => {
      if (selectedCategory.value === 'all') return true;
      if (selectedCategory.value === 'uncategorized') return !svc.categoryId;
      return svc.categoryId === selectedCategory.value;
    })
    .filter((svc) => (q ? svc.name.toLowerCase().includes(q) : true));
});

const selectedServiceObjects = computed(() => {
  const map = new Map(services.value.map((s) => [s.id, s]));
  return selectedServiceIds.value
    .map((id) => map.get(id))
    .filter((s): s is ServiceItem => Boolean(s));
});

const subtotal = computed(() =>
  selectedServiceObjects.value.reduce((acc, svc) => acc + (svc.priceCents ?? 0), 0) / 100,
);
const hasDirtyCheckout = computed(() => {
  const hasServices = selectedServiceIds.value.length > 0;
  const hasPaymentOptions = paymentOptions.value.cash || paymentOptions.value.card || paymentOptions.value.gift;
  const hasPaymentAmounts =
    Boolean((paymentAmounts.value.cash || '').trim()) || Boolean((paymentAmounts.value.card || '').trim());
  const hasGiftCardData =
    giftCards.value.some((g) => (g.number || '').trim() || (g.amount || '').trim()) || paymentOptions.value.gift;
  const hasEntries = enteredPayments.value.length > 0;
  return hasServices || hasPaymentOptions || hasPaymentAmounts || hasGiftCardData || hasEntries || subtotal.value > 0;
});
const giftCardsTotal = computed(() =>
  giftCards.value.reduce((acc, card) => {
    const amount = Number(card.amount);
    if (!Number.isFinite(amount) || amount <= 0) return acc;
    const bal = giftCardInfo.value[card.id]?.card?.balance;
    const capped = bal !== undefined && bal !== null ? Math.min(amount, Math.max(0, bal)) : amount;
    return acc + capped;
  }, 0),
);
const enteredPayments = computed(() => {
  const entries: Array<{ method: 'cash' | 'card' | 'gift'; amount: number }> = [];
  (['cash', 'card'] as const).forEach((key) => {
    if (!paymentOptions.value[key]) return;
    const val = Number(paymentAmounts.value[key]);
    if (Number.isFinite(val) && val >= 0) {
      entries.push({ method: key, amount: val });
    }
  });
  if (paymentOptions.value.gift && giftCardsTotal.value > 0) {
    entries.push({ method: 'gift', amount: giftCardsTotal.value });
  }
  return entries;
});
const enteredTotal = computed(() => enteredPayments.value.reduce((acc, cur) => acc + cur.amount, 0));
const remainingBalance = computed(() => {
  const remaining = subtotal.value - enteredTotal.value;
  return Number.isFinite(remaining) ? Number(remaining.toFixed(2)) : 0;
});
const canCompleteCheckout = computed(
  () => selectedServiceObjects.value.length > 0 && enteredPayments.value.length > 0 && Math.abs(remainingBalance.value) < 0.01,
);
const completing = ref(false);

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

const confirmDiscard = async (): Promise<boolean> => {
  if (!hasDirtyCheckout.value) return true;
  try {
    await ElMessageBox.confirm(
      'Discard checkout progress? Services and payments will be lost.',
      'Discard checkout',
      {
        confirmButtonText: 'Discard',
        cancelButtonText: 'Keep editing',
        type: 'warning',
      },
    );
    clearDraftForCurrent();
    return true;
  } catch {
    return false;
  }
};

const goBack = async () => {
  const ok = await confirmDiscard();
  if (!ok) return;
  router.push({ name: 'admin-queue' });
};

onMounted(() => {
  loadDrafts();
  loadCheckin();
  Promise.all([fetchCategories(), fetchServices()])
    .then(([cats, svcs]) => {
      categories.value = cats;
      services.value = svcs;
    })
    .catch(() => {
      categories.value = [];
      services.value = [];
    });
});

watch(
  () => draftSelections.value,
  () => persistDrafts(),
  { deep: true },
);
watch(
  () => [paymentOptions.value, paymentAmounts.value, giftCards.value],
  () => persistPayments(),
  { deep: true },
);

const toggleService = (id: string) => {
  const current = new Set(selectedServiceIds.value);
  if (current.has(id)) {
    current.delete(id);
  } else {
    current.add(id);
  }
  selectedServiceIds.value = Array.from(current);
};

const isSelected = (id: string) => selectedServiceIds.value.includes(id);

const togglePaymentOption = (key: 'cash' | 'card' | 'gift', checked: boolean) => {
  paymentOptions.value = { ...paymentOptions.value, [key]: checked };
  if (key !== 'gift' && checked) {
    const rem = Math.max(0, subtotal.value - enteredTotal.value);
    paymentAmounts.value = { ...paymentAmounts.value, [key]: rem ? rem.toFixed(2) : '' };
  }
  if (!checked) {
    if (key === 'gift') {
      giftCards.value = [{ id: 1, number: '', amount: '' }];
      nextGiftCardId.value = 2;
      giftCardInfo.value = {};
      fetchedNumbers.value = {};
    } else {
      paymentAmounts.value = { ...paymentAmounts.value, [key]: '' };
    }
  }
};

const addGiftCard = () => {
  giftCards.value = [...giftCards.value, { id: nextGiftCardId.value++, number: '', amount: '' }];
};

const removeGiftCard = (id: number) => {
  if (giftCards.value.length === 1) {
    giftCards.value = [{ id: 1, number: '', amount: '' }];
    nextGiftCardId.value = 2;
    delete giftCardInfo.value[id];
    delete fetchedNumbers.value[id];
    return;
  }
  giftCards.value = giftCards.value.filter((c) => c.id !== id);
  delete giftCardInfo.value[id];
  delete fetchedNumbers.value[id];
};

const ensureGiftCardState = (id: number) => {
  if (!giftCardInfo.value[id]) {
    giftCardInfo.value[id] = { loading: false, error: '', card: null };
  }
};

const remainingBeforeGiftCard = (id: number) => {
  const otherGift = giftCards.value.reduce((sum, c) => {
    if (c.id === id) return sum;
    const amt = Number(c.amount);
    return Number.isFinite(amt) && amt > 0 ? sum + amt : sum;
  }, 0);
  const otherPay = (['cash', 'card'] as const).reduce((sum, key) => {
    if (!paymentOptions.value[key]) return sum;
    const val = Number(paymentAmounts.value[key]);
    return Number.isFinite(val) && val > 0 ? sum + val : sum;
  }, 0);
  const remaining = subtotal.value - otherGift - otherPay;
  return remaining > 0 ? Number(remaining.toFixed(2)) : 0;
};

const autopopulateGiftAmount = (id: number) => {
  const info = giftCardInfo.value[id]?.card;
  if (!info) return;
  const remaining = remainingBeforeGiftCard(id);
  const suggested = Math.min(info.balance ?? 0, remaining);
  if (suggested >= 0) {
    const card = giftCards.value.find((c) => c.id === id);
    if (card) {
      card.amount = suggested ? suggested.toFixed(2) : '';
    }
  }
};

const fetchGiftCardBalance = async (card: { id: number; number: string }) => {
  const num = (card.number || '').trim();
  ensureGiftCardState(card.id);
  if (!num) {
    giftCardInfo.value[card.id] = { loading: false, error: '', card: null };
    delete fetchedNumbers.value[card.id];
    return;
  }
  if (fetchedNumbers.value[card.id] === num && giftCardInfo.value[card.id]?.card) return;
  giftCardInfo.value[card.id] = { loading: true, error: '', card: null };
  try {
    const data = await fetchGiftCard(num);
    giftCardInfo.value[card.id] = { loading: false, error: '', card: data };
    fetchedNumbers.value[card.id] = num;
    autopopulateGiftAmount(card.id);
  } catch (err) {
    giftCardInfo.value[card.id] = {
      loading: false,
      error: err instanceof Error ? err.message : 'Could not load gift card',
      card: null,
    };
  }
};

watch(
  () => giftCards.value.map((c) => ({ id: c.id, number: c.number })),
  (cards) => {
    const ids = new Set(cards.map((c) => c.id));
    cards.forEach((c) => ensureGiftCardState(c.id));
    Object.keys(giftCardInfo.value).forEach((id) => {
      if (!ids.has(Number(id))) {
        delete giftCardInfo.value[Number(id)];
        delete fetchedNumbers.value[Number(id)];
      }
    });
    cards.forEach((card) => fetchGiftCardBalance(card));
  },
  { deep: true },
);

const validateGiftCards = () => {
  if (!paymentOptions.value.gift) return true;
  for (const card of giftCards.value) {
    const num = (card.number || '').trim();
    const amt = Number(card.amount);
    if (!num) {
      ElMessage.warning('Enter a gift card number');
      return false;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      ElMessage.warning('Enter a gift card amount greater than zero');
      return false;
    }
    const info = giftCardInfo.value[card.id];
    if (info?.error) {
      ElMessage.warning(`Gift card ${num}: ${info.error}`);
      return false;
    }
    if (info?.card && amt > info.card.balance) {
      ElMessage.warning(`Gift card ${num} exceeds available balance`);
      return false;
    }
  }
  return true;
};

const submitCheckout = async () => {
  if (!item.value) return;
  if (!canCompleteCheckout.value) {
    ElMessage.warning('Add services and payments before checkout.');
    return;
  }
  if (!validateGiftCards()) return;
  completing.value = true;
  try {
    const giftCardNumber = paymentOptions.value.gift
      ? giftCards.value
          .map((g) => (g.number || '').trim())
          .filter(Boolean)
          .join(', ')
      : null;
    const giftCardAmount = paymentOptions.value.gift && giftCardsTotal.value > 0 ? giftCardsTotal.value : null;
    const giftCardSummaries =
      paymentOptions.value.gift && giftCards.value.length
        ? giftCards.value
            .map((g) => ({
              number: (g.number || '').trim(),
              amount: Number(g.amount),
            }))
            .filter((g) => g.number && Number.isFinite(g.amount) && g.amount > 0)
        : [];

    await checkoutCheckIn(checkinId.value, {
      amountPaid: enteredTotal.value,
      reviewSmsConsent: true,
      servedByName: null,
      redeemPoints: false,
      payments: enteredPayments.value,
      giftCardNumber,
      giftCardAmount,
      giftCards: giftCardSummaries,
    });
    clearDraftForCurrent();
    ElMessage.success('Checkout completed');
    router.push({ name: 'admin-queue' });
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Checkout failed');
  } finally {
    completing.value = false;
  }
};

// Leave guards to prevent accidental loss of checkout draft
const beforeUnload = (e: BeforeUnloadEvent) => {
  if (!hasDirtyCheckout.value) return;
  e.preventDefault();
  e.returnValue = '';
};

watch(
  () => hasDirtyCheckout.value,
  (val) => {
    if (val) {
      window.addEventListener('beforeunload', beforeUnload);
    } else {
      window.removeEventListener('beforeunload', beforeUnload);
    }
  },
  { immediate: true },
);

onBeforeRouteLeave(async (_to, _from, next) => {
  if (!hasDirtyCheckout.value) return next();
  const ok = await confirmDiscard();
  return ok ? next() : next(false);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload);
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
    </header>

    <main class="checkout-body">
      <!-- Column 1: Categories -->
      <section class="checkout-panel categories">
        <ElCard v-if="loading" class="glass-card" shadow="never">
          <ElSkeleton :rows="6" animated />
        </ElCard>
        <ElCard v-else class="glass-card" shadow="never">
          <div class="panel-title">Categories</div>
          <div class="panel-sub">Pick a category to filter services.</div>
          <div class="category-list">
            <button
              type="button"
              class="category-pill"
              :class="{ active: selectedCategory === 'all' }"
              @click="selectedCategory = 'all'"
            >
              All
            </button>
            <button
              type="button"
              class="category-pill"
              :class="{ active: selectedCategory === 'uncategorized' }"
              @click="selectedCategory = 'uncategorized'"
            >
              Uncategorized
            </button>
            <button
              v-for="cat in filteredCategories"
              :key="cat.id"
              type="button"
              class="category-pill"
              :class="{ active: selectedCategory === cat.id }"
              @click="selectedCategory = cat.id"
            >
              <span class="cat-icon">{{ cat.icon || '🗂' }}</span>
              <span class="cat-name">{{ cat.name }}</span>
            </button>
          </div>
        </ElCard>
      </section>

      <!-- Column 2: Services -->
      <section class="checkout-panel services">
        <ElCard v-if="loading" class="glass-card" shadow="never">
          <ElSkeleton :rows="6" animated />
        </ElCard>
        <ElCard v-else class="glass-card" shadow="never">
          <div class="panel-title">Services</div>
          <div class="panel-sub">Tap to add/remove. Filters by category.</div>
          <ElInput
            v-model="search"
            size="large"
            placeholder="Search services"
            class="mb-3"
            clearable
          />
          <div v-if="!filteredServices.length" class="empty-state">No services match.</div>
          <div v-else class="service-grid">
            <button
              v-for="svc in filteredServices"
              :key="svc.id"
              type="button"
              class="service-tile"
              :class="{ active: isSelected(svc.id) }"
              @click="toggleService(svc.id)"
            >
              <div class="svc-top">
                <span class="svc-icon">{{ svc.icon || '💅' }}</span>
                <span v-if="isSelected(svc.id)" class="svc-check">✓</span>
              </div>
              <div class="svc-name">{{ svc.name }}</div>
              <div class="svc-meta">
                <span v-if="svc.durationMinutes">{{ svc.durationMinutes }} min</span>
                <span v-if="svc.priceCents !== undefined && svc.priceCents !== null">
                  {{
                    Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: svc.currency || 'USD',
                      minimumFractionDigits: 2,
                    }).format((svc.priceCents ?? 0) / 100)
                  }}
                </span>
              </div>
            </button>
          </div>
        </ElCard>
      </section>

      <!-- Column 3: Bill -->
      <section class="checkout-panel bill">
        <ElCard v-if="loading" class="glass-card" shadow="never">
          <ElSkeleton :rows="6" animated />
        </ElCard>
        <ElCard v-else class="glass-card" shadow="never">
          <div class="panel-title">Bill</div>
          <div class="panel-sub">Review and complete checkout.</div>

          <div v-if="!selectedServiceObjects.length" class="empty-state">
            Add services to build the bill.
          </div>
          <div v-else class="selected-list">
            <div
              v-for="svc in selectedServiceObjects"
              :key="svc.id"
              class="selected-row"
            >
              <div class="selected-name">
                {{ svc.name }}
              </div>
              <div class="selected-meta">
                <span v-if="svc.durationMinutes">{{ svc.durationMinutes }} min</span>
                <span v-if="svc.priceCents !== undefined && svc.priceCents !== null">
                  {{
                    Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: svc.currency || 'USD',
                      minimumFractionDigits: 2,
                    }).format((svc.priceCents ?? 0) / 100)
                  }}
                </span>
              </div>
              <button class="remove-btn" type="button" @click="toggleService(svc.id)">✕</button>
            </div>
          </div>

          <div class="bill-summary">
            <div class="bill-row">
              <span>Subtotal</span>
              <span>{{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(subtotal) }}</span>
            </div>
            <div class="bill-row">
              <span>Tax</span>
              <span>—</span>
            </div>
            <div class="bill-row total">
              <span>Total</span>
              <span>{{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(subtotal) }}</span>
            </div>
          </div>

          <div class="payments-block">
            <div class="payments-header">
              <span>Payments</span>
              <span class="payments-remaining" :class="{ ok: Math.abs(remainingBalance) < 0.01 }">
                Remaining {{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(remainingBalance) }}
              </span>
            </div>
            <div class="payments-options">
              <label class="pay-toggle">
                <input type="checkbox" v-model="paymentOptions.cash" @change="togglePaymentOption('cash', paymentOptions.cash)" />
                Cash
              </label>
              <label class="pay-toggle">
                <input type="checkbox" v-model="paymentOptions.card" @change="togglePaymentOption('card', paymentOptions.card)" />
                Card
              </label>
              <label class="pay-toggle">
                <input type="checkbox" v-model="paymentOptions.gift" @change="togglePaymentOption('gift', paymentOptions.gift)" />
                Gift card
              </label>
            </div>

            <div class="payments-fields">
              <div v-if="paymentOptions.cash" class="pay-row">
                <span>Cash</span>
                <ElInput
                  v-model="paymentAmounts.cash"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div v-if="paymentOptions.card" class="pay-row">
                <span>Card</span>
                <ElInput
                  v-model="paymentAmounts.card"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div v-if="paymentOptions.gift" class="gift-block">
                <div class="gift-header">
                  <div class="flex flex-col gap-1">
                    <span>Gift cards</span>
                    <span class="gift-available" v-if="giftCards.length">
                      Available balance:
                      {{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                        giftCards.reduce((sum, c) => {
                          const bal = giftCardInfo[c.id]?.card?.balance;
                          return Number.isFinite(bal) ? sum + (bal as number) : sum;
                        }, 0),
                      ) }}
                    </span>
                  </div>
                  <button class="add-gift" type="button" @click="addGiftCard">+ Add</button>
                </div>
                <div class="gift-list">
                  <div v-for="card in giftCards" :key="card.id" class="gift-row">
                    <ElInput v-model="card.number" placeholder="Number" />
                    <ElInput
                      v-model="card.amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount"
                    />
                    <button
                      v-if="giftCards.length > 1"
                      type="button"
                      class="remove-gift"
                      @click="removeGiftCard(card.id)"
                    >
                      ✕
                    </button>
                    <div class="gift-meta" :class="{ error: giftCardInfo[card.id]?.error }">
                      <span v-if="giftCardInfo[card.id]?.loading">Checking balance…</span>
                      <span v-else-if="giftCardInfo[card.id]?.error">{{ giftCardInfo[card.id]?.error }}</span>
                      <template v-else-if="giftCardInfo[card.id]?.card">
                        <span class="gift-chip" :class="giftCardInfo[card.id]?.card?.source === 'legacy' ? 'legacy' : 'new'">
                          {{ giftCardInfo[card.id]?.card?.source === 'legacy' ? 'Legacy' : 'SalonFlow' }}
                        </span>
                        <span>
                          Balance:
                          {{
                            Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                              giftCardInfo[card.id]?.card?.balance ?? 0,
                            )
                          }}
                        </span>
                        <span v-if="giftCardInfo[card.id]?.card?.initialValue">
                          Issued:
                          {{
                            Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                              giftCardInfo[card.id]?.card?.initialValue ?? 0,
                            )
                          }}
                        </span>
                      </template>
                    </div>
                  </div>
                </div>
                <div class="gift-total">
                  Applying {{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(giftCardsTotal) }}
                </div>
              </div>
            </div>
          </div>

          <div class="bill-footer">
            <div class="bill-actions">
              <ElButton plain size="large" @click="goBack">Cancel</ElButton>
              <ElButton type="success" size="large" :disabled="!canCompleteCheckout" :loading="completing" @click="submitCheckout">
                Checkout
              </ElButton>
            </div>
          </div>
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
  grid-template-columns: 240px 1fr 420px;
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
.category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.category-pill {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #fff;
  text-align: left;
  font-weight: 600;
  color: #0f172a;
  transition: all 0.15s ease;
}
.category-pill:hover {
  border-color: rgba(59, 130, 246, 0.6);
}
.category-pill.active {
  border-color: rgba(59, 130, 246, 0.9);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);
  background: linear-gradient(180deg, #f0f7ff, #ffffff);
}
.cat-icon {
  font-size: 18px;
}
.cat-name {
  flex: 1;
}
.service-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.service-tile {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  background: #fff;
  padding: 14px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.12s ease;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
  position: relative;
  min-height: 76px;
}
.service-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
}
.service-tile.active {
  border-color: rgba(34, 197, 94, 0.9);
  box-shadow: 0 10px 28px rgba(34, 197, 94, 0.16);
  background: linear-gradient(180deg, #f5fff7, #ffffff);
}
.svc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.svc-check {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #16a34a;
  color: #fff;
  font-weight: 800;
  font-size: 12px;
  box-shadow: 0 6px 14px rgba(22, 163, 74, 0.35);
}
.svc-icon {
  font-size: 18px;
}
.svc-name {
  font-weight: 700;
  color: #0f172a;
  font-size: 15px;
}
.svc-meta {
  font-size: 12px;
  color: #475569;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.selected-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}
.selected-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #f8fafc;
}
.selected-name {
  font-weight: 600;
  color: #0f172a;
}
.selected-meta {
  font-size: 12px;
  color: #475569;
  display: flex;
  gap: 8px;
}
.remove-btn {
  border: none;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  font-weight: 700;
}
.bill-summary {
  margin-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.3);
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.payments-block {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.payments-header {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  color: #0f172a;
}
.payments-remaining {
  font-size: 13px;
  color: #dc2626;
}
.payments-remaining.ok {
  color: #16a34a;
}
.payments-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 13px;
}
.pay-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.payments-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pay-row {
  display: grid;
  grid-template-columns: 80px 1fr;
  align-items: center;
  gap: 10px;
}
.gift-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 10px;
  padding: 10px;
  background: #fff;
}
.gift-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.add-gift {
  border: none;
  background: transparent;
  color: #0ea5e9;
  cursor: pointer;
  font-weight: 700;
}
.gift-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.gift-row {
  display: grid;
  grid-template-columns: 1fr 120px auto;
  gap: 8px;
  align-items: center;
}
.remove-gift {
  border: none;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  font-weight: 700;
}
.gift-total {
  font-size: 12px;
  color: #475569;
}
.gift-available {
  font-size: 12px;
  font-weight: 500;
  color: #0f172a;
}
.gift-meta {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: #475569;
}
.gift-meta.error {
  color: #dc2626;
}
.gift-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  background: #e2e8f0;
  color: #0f172a;
}
.gift-chip.legacy {
  background: #fef3c7;
  color: #92400e;
}
.gift-chip.new {
  background: #dbeafe;
  color: #1d4ed8;
}
.bill-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: #0f172a;
}
.bill-row.total {
  font-size: 18px;
  font-weight: 800;
}
.bill-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.bill-actions :deep(button) {
  height: 48px;
  border-radius: 12px;
  font-size: 16px;
}
.bill-footer {
  position: sticky;
  bottom: 0;
  background: #fff;
  padding: 16px;
  margin-top: 8px;
  border-top: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 16px;
  box-shadow: 0 -6px 18px rgba(0, 0, 0, 0.06);
}
.empty-state {
  padding: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.5);
  border-radius: 10px;
  color: #475569;
  text-align: center;
}
@media (max-width: 1024px) {
  .checkout-body {
    grid-template-columns: 1fr;
  }
}
</style>
