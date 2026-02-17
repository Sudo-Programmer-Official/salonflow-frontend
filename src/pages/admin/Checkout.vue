<script setup lang="ts">
import { onMounted, ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { ElButton, ElCard, ElSkeleton, ElMessage, ElInput, ElMessageBox, ElIcon } from 'element-plus';
import { Money, CreditCard, Present } from '@element-plus/icons-vue';
import { fetchQueue, checkoutCheckIn, type QueueItem } from '@/api/queue';
import { humanizeTime } from '@/utils/dates';
import { fetchServices, type ServiceItem } from '@/api/services';
import { fetchCategories, type ServiceCategory } from '@/api/serviceCategories';
import { fetchGiftCard, addLegacyGiftCard, type GiftCard } from '@/api/giftCards';

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
const customTotalMode = ref(false);
const customTotalValue = ref('');
const redeemPoints = ref(false);
const giftCards = ref<
  Array<{ id: number; number: string; amount: string; source?: 'new' | 'legacy'; legacyBalance?: string }>
>([{ id: 1, number: '', amount: '', source: 'new', legacyBalance: '' }]);
const nextGiftCardId = ref(2);
const giftCardInfo = ref<Record<number, { loading: boolean; error: string; card: GiftCard | null }>>({});
const fetchedNumbers = ref<Record<number, string>>({});
const checkoutStep = ref<'services' | 'payment'>('services');

const goToPaymentStep = () => {
  checkoutStep.value = 'payment';
};

const goToServicesStep = () => {
  checkoutStep.value = 'services';
};

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
      customTotalMode.value = Boolean(pay.customTotal?.enabled);
      customTotalValue.value = pay.customTotal?.amount || '';
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
    customTotal: { enabled: customTotalMode.value, amount: customTotalValue.value },
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
  customTotalMode.value = false;
  customTotalValue.value = '';
  giftCards.value = [{ id: 1, number: '', amount: '', source: 'new', legacyBalance: '' }];
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

const categoryColors: Record<string, string> = {
  manicure: '#34D399',
  nails: '#F59E0B',
  pedicure: '#38BDF8',
  acrylic: '#A78BFA',
  sns: '#F472B6',
  wax: '#FB923C',
};

const getCategoryKey = (cat?: string | null) => (cat || '').toLowerCase().trim();
const getCategoryColor = (catName?: string | null) => categoryColors[getCategoryKey(catName)] || '#e2e8f0';
const categoryStyle = (cat: ServiceCategory) => {
  const color = getCategoryColor(cat.name);
  return {
    borderLeft: `4px solid ${color}`,
    background: `${color}14`, // light tint
  };
};
const serviceStyle = (svc: ServiceItem) => {
  const cat = categories.value.find((c) => c.id === svc.categoryId);
  const color = getCategoryColor(cat?.name);
  return {
    borderLeft: `4px solid ${color}`,
  };
};

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
const popularServiceIds = computed(() => filteredServices.value.slice(0, 3).map((s) => s.id));

const selectedServiceObjects = computed(() => {
  const map = new Map(services.value.map((s) => [s.id, s]));
  return selectedServiceIds.value
    .map((id) => map.get(id))
    .filter((s): s is ServiceItem => Boolean(s));
});

const servicesSubtotal = computed(() =>
  selectedServiceObjects.value.reduce((acc, svc) => acc + (svc.priceCents ?? 0), 0) / 100,
);
const customTotalValid = computed(() => {
  const val = Number(customTotalValue.value);
  return customTotalMode.value && Number.isFinite(val) && val >= 0;
});
const subtotal = computed(() => {
  if (customTotalValid.value) return Number(Number(customTotalValue.value).toFixed(2));
  return servicesSubtotal.value;
});
const availablePoints = computed(() => item.value?.pointsBalance ?? 0);
const canRedeemPoints = computed(() => availablePoints.value >= 300);
const redeemValue = computed(() => (redeemPoints.value && canRedeemPoints.value ? 5 : 0));
const totalDue = computed(() => Math.max(0, Number((subtotal.value - redeemValue.value).toFixed(2))));
const hasBillItems = computed(() => customTotalValid.value || selectedServiceObjects.value.length > 0);
const hasDirtyCheckout = computed(() => {
  const hasServices = selectedServiceIds.value.length > 0;
  const hasPaymentOptions = paymentOptions.value.cash || paymentOptions.value.card || paymentOptions.value.gift;
  const hasPaymentAmounts =
    Boolean((paymentAmounts.value.cash || '').trim()) || Boolean((paymentAmounts.value.card || '').trim());
  const hasGiftCardData =
    giftCards.value.some((g) => (g.number || '').trim() || (g.amount || '').trim()) || paymentOptions.value.gift;
  const hasEntries = enteredPayments.value.length > 0;
  const hasCustom = customTotalMode.value || Boolean(customTotalValue.value.trim());
  return (
    hasServices ||
    hasPaymentOptions ||
    hasPaymentAmounts ||
    hasGiftCardData ||
    hasEntries ||
    subtotal.value > 0 ||
    hasCustom
  );
});
const giftCardsTotal = computed(() =>
  giftCards.value.reduce((acc, card) => {
    const amount = Number(card.amount);
    if (!Number.isFinite(amount) || amount <= 0) return acc;
    const bal = giftCardInfo.value[card.id]?.card?.balance;
    const manualBal =
      !giftCardInfo.value[card.id]?.card && card.source === 'legacy'
        ? Number(card.legacyBalance)
        : undefined;
    const usableBalance =
      bal !== undefined && bal !== null
        ? Math.max(0, bal)
        : Number.isFinite(manualBal)
          ? Math.max(0, manualBal as number)
          : undefined;
    const capped = usableBalance !== undefined ? Math.min(amount, usableBalance) : amount;
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
  const remaining = totalDue.value - enteredTotal.value;
  return Number.isFinite(remaining) ? Number(remaining.toFixed(2)) : 0;
});
const remainingState = computed<'due' | 'paid' | 'over'>(() => {
  if (remainingBalance.value > 0.009) return 'due';
  if (remainingBalance.value < -0.009) return 'over';
  return 'paid';
});
const canCompleteCheckout = computed(
  () => hasBillItems.value && enteredPayments.value.length > 0 && Math.abs(remainingBalance.value) < 0.01,
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
  // Lock body scroll in kiosk mode
  const prevOverflow = document.body.style.overflow;
  document.body.dataset.prevOverflow = prevOverflow;
  document.body.style.overflow = 'hidden';

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
  () => [
    paymentOptions.value,
    paymentAmounts.value,
    giftCards.value,
    customTotalMode.value,
    customTotalValue.value,
  ],
  () => persistPayments(),
  { deep: true },
);

watch(
  () => canRedeemPoints.value,
  (can) => {
    if (!can) redeemPoints.value = false;
  },
);

watch(
  () => totalDue.value,
  () => {
    const remaining = totalDue.value - enteredTotal.value;
    // If underpaid, prefill first active payment option
    if (remaining > 0.009) {
      const active = (['cash', 'card'] as const).find((k) => paymentOptions.value[k]);
      if (active) {
        paymentAmounts.value = {
          ...paymentAmounts.value,
          [active]: remaining.toFixed(2),
        };
      }
    }
    // If overpaid, trim the first active payment option to remove overage
    if (remaining < -0.009) {
      const active = (['cash', 'card'] as const).find((k) => paymentOptions.value[k]);
      if (active) {
        const current = Number(paymentAmounts.value[active]) || 0;
        const adjusted = Math.max(0, current + remaining); // remaining is negative
        paymentAmounts.value = {
          ...paymentAmounts.value,
          [active]: adjusted ? adjusted.toFixed(2) : '',
        };
      }
    }
  },
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
    const rem = Math.max(0, totalDue.value - enteredTotal.value);
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

const seedCustomTotal = () => {
  if (customTotalValue.value !== '') return;
  const seed = servicesSubtotal.value;
  if (Number.isFinite(seed) && seed > 0) {
    customTotalValue.value = seed.toFixed(2);
  }
};

const toggleCustomTotal = () => {
  customTotalMode.value = !customTotalMode.value;
  if (customTotalMode.value) seedCustomTotal();
};

const addGiftCard = () => {
  giftCards.value = [
    ...giftCards.value,
    { id: nextGiftCardId.value++, number: '', amount: '', source: 'new', legacyBalance: '' },
  ];
};

const removeGiftCard = (id: number) => {
  if (giftCards.value.length === 1) {
    giftCards.value = [{ id: 1, number: '', amount: '', source: 'new', legacyBalance: '' }];
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

const handleGiftSourceChange = (card: {
  id: number;
  source?: 'new' | 'legacy';
  number: string;
  legacyBalance?: string;
}) => {
  card.number = '';
  card.legacyBalance = '';
  delete giftCardInfo.value[card.id];
  delete fetchedNumbers.value[card.id];
};

const availableGiftBalance = (card: { id: number; source?: 'new' | 'legacy'; legacyBalance?: string }) => {
  const fetched = giftCardInfo.value[card.id]?.card?.balance;
  if (fetched !== undefined && fetched !== null) return Math.max(0, fetched);
  if (card.source === 'legacy') {
    const manual = Number(card.legacyBalance);
    if (Number.isFinite(manual) && manual >= 0) return manual;
  }
  return undefined;
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
  const remaining = totalDue.value - otherGift - otherPay;
  return remaining > 0 ? Number(remaining.toFixed(2)) : 0;
};

const autopopulateGiftAmount = (id: number) => {
  const card = giftCards.value.find((c) => c.id === id);
  if (!card) return;
  const bal = availableGiftBalance(card);
  if (bal === undefined) return;
  const remaining = remainingBeforeGiftCard(id);
  const suggested = Math.min(bal, remaining);
  if (suggested >= 0) {
    card.amount = suggested ? suggested.toFixed(2) : '';
  }
};

const fetchGiftCardBalance = async (card: { id: number; number: string; source?: 'new' | 'legacy'; legacyBalance?: string }) => {
  const num = (card.number || '').trim();
  ensureGiftCardState(card.id);
  if (!num) {
    giftCardInfo.value[card.id] = { loading: false, error: '', card: null };
    delete fetchedNumbers.value[card.id];
    return;
  }
  if (fetchedNumbers.value[card.id] === num && giftCardInfo.value[card.id]?.card) return;
  if (card.source === 'legacy' && fetchedNumbers.value[card.id] === num && !giftCardInfo.value[card.id]?.card) {
    // allow manual legacy without refetch
    return;
  }
  giftCardInfo.value[card.id] = { loading: true, error: '', card: null };
  try {
    const data = await fetchGiftCard(num);
    giftCardInfo.value[card.id] = { loading: false, error: '', card: data };
    fetchedNumbers.value[card.id] = num;
    autopopulateGiftAmount(card.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load gift card';
    // If explicitly legacy, allow missing cards to be created later
    const isNotFound = message.toLowerCase().includes('not found');
    giftCardInfo.value[card.id] = {
      loading: false,
      error: card.source === 'legacy' && isNotFound ? '' : message,
      card: null,
    };
    fetchedNumbers.value[card.id] = num;
  }
};

watch(
  () => giftCards.value.map((c) => ({ id: c.id, number: c.number, source: c.source })),
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

watch(
  () => servicesSubtotal.value,
  (val) => {
    if (!customTotalMode.value) return;
    if (customTotalValue.value !== '' || !Number.isFinite(val) || val <= 0) return;
    customTotalValue.value = val.toFixed(2);
  },
);

watch(
  () => giftCards.value.map((c) => ({ id: c.id, legacyBalance: c.legacyBalance, source: c.source })),
  (cards) => {
    cards.forEach((c) => {
      if (c.source === 'legacy') autopopulateGiftAmount(c.id);
    });
  },
  { deep: true },
);

const ensureLegacyCards = async () => {
  for (const card of giftCards.value) {
    if (card.source !== 'legacy') continue;
    const num = (card.number || '').trim();
    if (!num) throw new Error('Enter a legacy gift card number');
    const balance = availableGiftBalance(card);
    if (balance === undefined) throw new Error('Enter legacy card balance before applying');
    if (giftCardInfo.value[card.id]?.card) continue;
    const created = await addLegacyGiftCard({ number: num, amount: balance });
    giftCardInfo.value[card.id] = { loading: false, error: '', card: created };
    fetchedNumbers.value[card.id] = num;
  }
};

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
    const bal = availableGiftBalance(card);
    if (bal !== undefined && amt > bal) {
      ElMessage.warning(`Gift card ${num} exceeds available balance`);
      return false;
    }
  }
  return true;
};

const submitCheckout = async () => {
  if (!item.value) return;
  if (!canCompleteCheckout.value) {
    ElMessage.warning('Add a total (services or custom) and payments before checkout.');
    return;
  }
  if (!validateGiftCards()) return;
  try {
    await ensureLegacyCards();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Could not record legacy gift card');
    return;
  }
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
      redeemPoints: redeemPoints.value && canRedeemPoints.value,
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
  // Restore body scroll
  const prev = document.body.dataset.prevOverflow ?? '';
  document.body.style.overflow = prev;
  delete document.body.dataset.prevOverflow;
});
</script>

<template>
  <div class="checkout-kiosk checkout-shell">
    <header class="checkout-header">
      <div class="header-left">
        <ElButton text type="primary" size="large" @click="goBack">← Back to Queue</ElButton>
        <div v-if="item" class="customer-meta">
          <div class="customer-name">{{ item.customerName || 'Customer' }}</div>
          <div class="customer-meta-sub">
            <span v-if="item.serviceName">Service: {{ item.serviceName }}</span>
            <span v-if="item.startedAt"> · In service for {{ humanizeTime(item.startedAt) }}</span>
          </div>
        </div>
      </div>
      <div class="step-toggle">
        <button
          class="step-tab"
          :class="{ active: checkoutStep === 'services' }"
          @click="checkoutStep = 'services'"
          type="button"
        >
          Services
        </button>
        <button
          class="step-tab"
          :class="{ active: checkoutStep === 'payment' }"
          @click="checkoutStep = 'payment'"
          type="button"
        >
          Payment
        </button>
      </div>
    </header>

    <div class="checkout-content">
      <main
        class="checkout-body"
        :class="{
          'payment-view': checkoutStep === 'payment',
          'services-view': checkoutStep === 'services',
        }"
      >
      <!-- Column 1: Categories -->
      <section class="checkout-panel categories" v-if="checkoutStep === 'services'">
        <ElCard v-if="loading" class="glass-card" shadow="never">
          <ElSkeleton :rows="6" animated />
        </ElCard>
        <ElCard v-else class="glass-card" shadow="never">
          <div class="panel-title">Categories</div>
          <div class="panel-sub">Pick a category to filter services.</div>
          <div class="category-list scrollable-pane">
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
              :style="categoryStyle(cat)"
              @click="selectedCategory = cat.id"
            >
              <span class="cat-icon">{{ cat.icon || '🗂' }}</span>
              <span class="cat-name">{{ cat.name }}</span>
            </button>
          </div>
        </ElCard>
      </section>

      <!-- Column 2: Services -->
      <section class="checkout-panel services" v-if="checkoutStep === 'services'">
        <ElCard v-if="loading" class="glass-card" shadow="never">
          <ElSkeleton :rows="6" animated />
        </ElCard>
        <ElCard v-else class="glass-card" shadow="never">
          <div class="services-header">
            <div class="services-title">Services</div>
            <ElInput
              v-model="search"
              size="large"
              placeholder="Search services"
              class="services-search"
              clearable
            />
          </div>
          <div v-if="!filteredServices.length" class="empty-state">No services match.</div>
          <div v-else class="service-list-scroll scrollable-pane">
            <div class="service-grid">
              <button
                v-for="svc in filteredServices"
                :key="svc.id"
                type="button"
                class="service-tile"
                :class="{ active: isSelected(svc.id) }"
                :style="serviceStyle(svc)"
                @click="toggleService(svc.id)"
              >
                <div class="svc-top">
                  <span class="svc-icon">{{ svc.icon || '💅' }}</span>
                  <span v-if="isSelected(svc.id)" class="svc-check">✓</span>
                  <span v-else-if="popularServiceIds.includes(svc.id)" class="svc-popular">Popular</span>
                </div>
                <div class="svc-name">{{ svc.name }}</div>
                <div
                  v-if="svc.priceCents !== undefined && svc.priceCents !== null"
                  class="svc-price"
                >
                  {{
                    Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: svc.currency || 'USD',
                      minimumFractionDigits: 2,
                    }).format((svc.priceCents ?? 0) / 100)
                  }}
                </div>
                <div v-if="svc.durationMinutes" class="svc-duration">
                  {{ svc.durationMinutes }} min
                </div>
              </button>
            </div>
          </div>
        </ElCard>
      </section>

      <!-- Column 3: Bill (payment step only) -->
      <section v-if="checkoutStep === 'payment'" class="checkout-panel bill">
        <ElCard v-if="loading" class="glass-card" shadow="never">
          <ElSkeleton :rows="6" animated />
        </ElCard>
        <ElCard v-else class="glass-card" shadow="never">
          <div class="bill-header">
            <div class="bill-title">Bill</div>
            <button
              type="button"
              class="custom-toggle"
              :class="{ active: customTotalMode }"
              @click="toggleCustomTotal"
            >
              <span class="custom-icon">✏️</span>
              <span>Custom total</span>
            </button>
          </div>
          <div v-if="customTotalMode" class="custom-total">
            <div class="custom-total-input">
              <ElInput
                v-model="customTotalValue"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter total amount (e.g., 45.00)"
              />
              <div class="custom-hint">
                Skip service selection; enter the final total here.
              </div>
              <button type="button" class="custom-reset" @click="() => { customTotalValue = ''; customTotalMode = false; }">
                Clear custom total
              </button>
            </div>
          </div>

          <div v-if="!selectedServiceObjects.length && !customTotalValid" class="empty-state">
            Add services or enable a custom total to build the bill.
          </div>
          <div v-else class="selected-list" v-if="selectedServiceObjects.length">
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
          <div v-if="customTotalValid" class="custom-total-summary">
            <span class="pill">Custom</span>
            <span class="amount">
              {{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(subtotal) }}
            </span>
          </div>

          <div class="bill-summary">
            <div class="bill-row">
              <span>Subtotal</span>
              <span>{{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(subtotal) }}</span>
            </div>
            <div class="bill-row" v-if="redeemValue > 0">
              <span>Redeem points</span>
              <span>-{{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(redeemValue) }}</span>
            </div>
            <div class="bill-row">
              <span>Tax</span>
              <span>—</span>
            </div>
            <div class="bill-row total">
              <span>Total</span>
              <span>{{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalDue) }}</span>
            </div>
          </div>

          <div
            v-if="checkoutStep === 'payment'"
            id="payment-section"
            class="payments-block"
          >
            <div class="payments-header">
              <div class="payments-title">Payments</div>
              <div class="payments-remaining" :class="remainingState">
                Remaining {{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(remainingBalance) }}
              </div>
            </div>
            <div class="redeem-row" v-if="canRedeemPoints">
              <label class="redeem-toggle">
                <input type="checkbox" v-model="redeemPoints" :disabled="!canRedeemPoints" />
                <span>
                  Redeem 300 points (Available: {{ availablePoints }} pts)
                </span>
              </label>
            </div>
            <div class="payments-section">
              <div class="payments-section-title">Select payment method</div>
              <div class="payments-options">
                <button
                  type="button"
                  class="payment-method"
                  :class="{ active: paymentOptions.cash }"
                  @click="togglePaymentOption('cash', !paymentOptions.cash)"
                >
                  <ElIcon class="payment-icon"><Money /></ElIcon>
                  <span>Cash</span>
                </button>
                <button
                  type="button"
                  class="payment-method"
                  :class="{ active: paymentOptions.card }"
                  @click="togglePaymentOption('card', !paymentOptions.card)"
                >
                  <ElIcon class="payment-icon"><CreditCard /></ElIcon>
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  class="payment-method"
                  :class="{ active: paymentOptions.gift }"
                  @click="togglePaymentOption('gift', !paymentOptions.gift)"
                >
                  <ElIcon class="payment-icon"><Present /></ElIcon>
                  <span>Gift card</span>
                </button>
              </div>
            </div>

            <div class="payments-fields">
              <div class="payments-section-title">Enter amount</div>
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
                          const bal = availableGiftBalance(c);
                          return bal !== undefined ? sum + bal : sum;
                        }, 0),
                      ) }}
                    </span>
                  </div>
                  <button class="add-gift" type="button" @click="addGiftCard">+ Add</button>
                </div>
                <div class="gift-list">
                  <div v-for="card in giftCards" :key="card.id" class="gift-row">
                    <select v-model="card.source" class="gift-source" @change="handleGiftSourceChange(card)">
                      <option value="new">SalonFlow</option>
                      <option value="legacy">Old Gift Card</option>
                    </select>
                    <label class="gift-label">
                      Gift Card Number
                      <ElInput v-model="card.number" placeholder="Number" />
                    </label>
                    <label class="gift-label">
                      Amount
                      <ElInput
                        v-model="card.amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount"
                      />
                    </label>
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
                          {{ giftCardInfo[card.id]?.card?.source === 'legacy' ? 'Old Gift Card' : 'SalonFlow' }}
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

        </ElCard>
      </section>
      </main>
    </div>

    <div class="checkout-footer">
      <template v-if="checkoutStep === 'services'">
        <div class="step-info">Step 1 of 2 — Services</div>
        <div class="step-buttons">
          <ElButton class="checkout-secondary" @click="goToPaymentStep">Skip</ElButton>
          <ElButton class="checkout-primary" type="primary" @click="goToPaymentStep">Next →</ElButton>
        </div>
      </template>
      <template v-else>
        <div class="step-info">Step 2 of 2 — Payment</div>
        <div class="step-buttons">
          <ElButton class="checkout-secondary" @click="goToServicesStep">← Back</ElButton>
          <ElButton
            class="checkout-primary"
            type="primary"
            :disabled="!canCompleteCheckout"
            :loading="completing"
            @click="submitCheckout"
          >
            Checkout
          </ElButton>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.checkout-kiosk {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.checkout-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  max-height: 100%;
  background: linear-gradient(180deg, #f8fafc, #eef2ff);
  padding: 12px 20px 0;
  gap: 12px;
}
.checkout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  margin-bottom: 12px;
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
.customer-meta-sub {
  font-size: 13px;
  color: #64748b;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.checkout-content {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 16px 20px 120px;
  min-height: 0;
}
.checkout-body {
  display: grid;
  grid-template-columns: minmax(140px, max-content) minmax(0, 1fr) 420px;
  gap: 16px;
  align-items: start;
  min-height: 0;
}
.checkout-body.services-view {
  grid-template-columns: minmax(140px, max-content) minmax(0, 1fr);
}
.checkout-body.payment-view {
  grid-template-columns: 1fr;
}
.scrollable-pane {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 6px;
}
.scrollable-pane::-webkit-scrollbar {
  width: 8px;
}
.scrollable-pane::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 8px;
}
.scrollable-pane::-webkit-scrollbar-track {
  background: transparent;
}
.step-toggle {
  display: inline-flex;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}
.step-tab {
  border: none;
  background: transparent;
  padding: 8px 14px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}
.step-tab.active {
  background: #0ea5e9;
  color: #ffffff;
  box-shadow: 0 6px 16px rgba(14, 165, 233, 0.28);
}
.checkout-panel {
  min-height: 480px;
  min-width: 0;
}
.glass-card {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
}
.bill-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.bill-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}
.services-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.services-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}
.services-search {
  width: 260px;
}
.services-search :deep(.el-input__wrapper) {
  height: 40px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 0 14px;
  background: #f9fafb;
  box-shadow: none;
}
.services-search :deep(.el-input__wrapper.is-focus) {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.12);
  background: #fff;
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
.custom-total {
  margin: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.custom-toggle {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #0f172a;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  height: 40px;
}
.custom-toggle.active {
  background: #eef2ff;
  border-color: #2563eb;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.12);
}
.custom-icon {
  font-size: 18px;
}
.custom-total-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  background: rgba(248, 250, 252, 0.8);
}
.custom-hint {
  font-size: 12px;
  color: #475569;
}
.custom-reset {
  align-self: flex-start;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: #fff;
  font-size: 12px;
  color: #0f172a;
}
.custom-total-summary {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.custom-total-summary .pill {
  padding: 4px 8px;
  border-radius: 999px;
  background: #ecfeff;
  color: #0f172a;
  font-weight: 700;
  border: 1px solid #bae6fd;
}
.custom-total-summary .amount {
  font-weight: 700;
  color: #0f172a;
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
  width: fit-content;
  max-width: 220px;
}
.checkout-panel.categories {
  width: max-content;
  max-width: 220px;
}
.checkout-panel.categories .glass-card {
  width: max-content;
  min-width: 0;
}
.category-pill {
  width: auto;
  min-width: 160px;
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
  border-left-width: 4px;
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
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}
.service-search {
  width: 50%;
  min-width: 260px;
}
.service-tile {
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 12px;
  background: #fff;
  padding: 20px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.12s ease;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.05);
  position: relative;
  min-height: 160px;
}
.service-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}
.service-tile.active {
  border-color: #3b82f6;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  transform: scale(1.02);
}
.svc-top {
  display: flex;
  align-items: flex-start;
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
.svc-popular {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
  font-size: 11px;
  font-weight: 700;
}
.svc-icon {
  font-size: 16px;
}
.svc-name {
  font-weight: 700;
  color: #0f172a;
  font-size: 20px;
  font-weight: 600;
}
.svc-price {
  font-size: 34px;
  font-weight: 800;
  color: #111;
  line-height: 1;
  margin-top: 8px;
}
.svc-duration {
  font-size: 16px;
  color: #555;
  margin-top: 4px;
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
.bill-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: #0f172a;
}
.bill-row.total {
  font-size: 22px;
  font-weight: 800;
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
.payments-title {
  font-size: 15px;
  font-weight: 800;
}
.payments-remaining {
  font-size: 14px;
  font-weight: 700;
}
.payments-remaining.due {
  color: #dc2626;
}
.payments-remaining.paid {
  color: #16a34a;
}
.payments-remaining.over {
  color: #2563eb;
}
.payments-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.redeem-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px dashed rgba(148, 163, 184, 0.45);
  border-radius: 12px;
  background: rgba(240, 253, 250, 0.6);
  font-size: 15px;
  color: #0f172a;
}
.redeem-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}
.redeem-row input[type='checkbox'] {
  width: 18px;
  height: 18px;
}
.redeem-hint {
  font-size: 12px;
  color: #475569;
}
.payments-section-title {
  font-weight: 700;
  color: #0f172a;
  font-size: 14px;
}
.payments-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
.payment-method {
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  border-radius: 16px;
  padding: 14px;
  min-height: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
}
.payment-method .payment-icon {
  font-size: 26px;
  color: #0f172a;
}
.payment-method.active {
  background: #e0f2fe;
  border-color: #2563eb;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.18);
  transform: translateY(-1px) scale(1.02);
}
.payment-method:hover {
  transform: translateY(-1px);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
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
  grid-template-columns: 140px 1fr 140px auto;
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
.gift-source {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  padding: 0 12px;
  height: 44px;
  background: #fff;
  font-weight: 600;
  color: #0f172a;
  font-size: 14px;
  display: flex;
  align-items: center;
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
.gift-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-weight: 600;
  color: #0f172a;
  font-size: 14px;
}
.gift-label :deep(.el-input__wrapper) {
  min-height: 44px;
}
.legacy-balance :deep(.el-input__wrapper) {
  padding: 4px 10px;
  height: 32px;
}
.checkout-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: 20;
  box-shadow: 0 -6px 20px rgba(0, 0, 0, 0.06);
}
.step-info {
  font-size: 13px;
  color: #475569;
  font-weight: 600;
}
.step-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
  justify-content: flex-end;
}
.empty-state {
  padding: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.5);
  border-radius: 10px;
  color: #475569;
  text-align: center;
}
.checkout-primary {
  flex: 1;
  height: 56px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 14px;
  background: #2563eb;
  border-color: #2563eb;
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.25);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.checkout-primary:hover,
.checkout-primary:focus {
  background: #2563eb;
  border-color: #2563eb;
}
.checkout-secondary {
  height: 56px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 14px;
  padding: 0 18px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
@media (max-width: 1280px) {
  .checkout-body {
    grid-template-columns: minmax(150px, 220px) minmax(0, 1fr);
  }
  .checkout-panel.bill {
    grid-column: 1 / -1;
  }
  .checkout-panel.categories {
    max-width: 220px;
    width: 100%;
  }
  .checkout-panel.services {
    margin-left: 30px;
  }
}
@media (max-width: 960px) {
  .checkout-body {
    grid-template-columns: 1fr;
  }
  .checkout-panel {
    min-height: auto;
  }
}
</style>
