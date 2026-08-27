<script setup lang="ts">
import { onMounted, ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { ElButton, ElCard, ElSkeleton, ElMessage, ElInput, ElMessageBox, ElIcon, ElDialog } from 'element-plus';
import { Money, CreditCard, Present } from '@element-plus/icons-vue';
import {
  fetchQueue,
  checkoutCheckIn,
  assignStaffToCheckIn,
  unassignStaffFromCheckIn,
  addServiceToCheckIn,
  removeServiceFromCheckIn,
  type QueueItem,
} from '@/api/queue';
import { fetchCustomerLoyalty } from '@/api/customers';
import { humanizeTime } from '@/utils/dates';
import { fetchServices, type ServiceItem } from '@/api/services';
import { fetchCategories, type ServiceCategory } from '@/api/serviceCategories';
import { fetchGiftCard, addLegacyGiftCard, type GiftCard } from '@/api/giftCards';
import { fetchAvailablePromotions, type AvailablePromotion } from '@/api/promotions';
import { fetchSettings, type BusinessSettings } from '@/api/settings';
import { fetchStaff, type StaffMember } from '@/api/staff';
import { deriveStaffWorkload } from '@/utils/staffAvailability';
import { type RedeemStatus } from '@/utils/redeemStatus';
import { resolveCheckoutRedeemState } from '@/utils/checkoutLoyalty';
import {
  resolveCheckoutPaymentState,
  shouldClearRedeemSelection,
} from '@/utils/checkoutPaymentState';

const route = useRoute();
const router = useRouter();
const checkinId = computed(() => route.params.checkinId as string);

const loading = ref(true);
const item = ref<QueueItem | null>(null);
const inServiceQueue = ref<QueueItem[]>([]);
const settings = ref<BusinessSettings | null>(null);
const staffList = ref<StaffMember[]>([]);
const selectedStaffId = ref('');
const selectedStaffName = ref('');
const taxDraft = ref('0.00');
const tipDraft = ref('0.00');
const loyalty = ref<{
  customerId: string | null;
  pointsBalance: number | null;
  loading: boolean;
  loaded: boolean;
  error: string;
}>({
  customerId: null,
  pointsBalance: null,
  loading: false,
  loaded: false,
  error: '',
});
const categories = ref<ServiceCategory[]>([]);
const services = ref<ServiceItem[]>([]);
const selectedCategory = ref<string>('all');
const search = ref('');
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
const serviceMutationLoading = ref(false);
const staffPickerOpen = ref(false);
const staffPickerLineId = ref<string | null>(null);
const staffPickerLoading = ref(false);
const availablePromotions = ref<AvailablePromotion[]>([]);
const promotionsLoading = ref(false);
const promotionsError = ref('');
const selectedPromotionId = ref('');
const manualDiscountValue = ref('');
const REDEEM_REQUIRED_POINTS = 300;
const REDEEM_DOLLAR_VALUE = 5;
let loyaltyRequestId = 0;

const goToPaymentStep = async () => {
  await loadCheckin({ silent: true });
  checkoutStep.value = 'payment';
};

const goToServicesStep = () => {
  checkoutStep.value = 'services';
};

const PAYMENT_KEY = 'checkoutPayments';

const loadDrafts = () => {
  try {
    const rawPay = localStorage.getItem(PAYMENT_KEY);
    const parsed = rawPay ? (JSON.parse(rawPay) as Record<string, any>) : {};
    const pay = parsed[checkinId.value];
    if (pay) {
      paymentOptions.value = { ...paymentOptions.value, ...(pay.options ?? {}) };
      paymentAmounts.value = { ...paymentAmounts.value, ...(pay.amounts ?? {}) };
      customTotalMode.value = Boolean(pay.customTotal?.enabled);
      customTotalValue.value = pay.customTotal?.amount || '';
      selectedPromotionId.value = pay.promotionId || '';
      manualDiscountValue.value = pay.manualDiscount || '';
      selectedStaffId.value = pay.staffId || '';
      selectedStaffName.value = pay.staffName || '';
      taxDraft.value = pay.taxDraft || '0.00';
      tipDraft.value = pay.tipDraft || '0.00';
      giftCards.value = pay.giftCards ?? [{ id: 1, number: '', amount: '' }];
      nextGiftCardId.value = giftCards.value.length
        ? Math.max(...giftCards.value.map((g) => g.id)) + 1
        : 2;
    }
  } catch {
    // ignore
  }
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
    promotionId: selectedPromotionId.value,
    manualDiscount: manualDiscountValue.value,
    staffId: selectedStaffId.value,
    staffName: selectedStaffName.value,
    taxDraft: taxDraft.value,
    tipDraft: tipDraft.value,
    giftCards: giftCards.value,
  };
  localStorage.setItem(PAYMENT_KEY, JSON.stringify(existing));
};
const clearDraftForCurrent = () => {
  try {
    const pays = JSON.parse(localStorage.getItem(PAYMENT_KEY) || '{}');
    delete pays[checkinId.value];
    localStorage.setItem(PAYMENT_KEY, JSON.stringify(pays));
  } catch {
    /* ignore */
  }
  paymentOptions.value = { cash: false, card: false, gift: false };
  paymentAmounts.value = { cash: '', card: '' };
  customTotalMode.value = false;
  customTotalValue.value = '';
  selectedPromotionId.value = '';
  manualDiscountValue.value = '';
  selectedStaffId.value = '';
  selectedStaffName.value = '';
  taxDraft.value = '0.00';
  tipDraft.value = '0.00';
  availablePromotions.value = [];
  promotionsError.value = '';
  customAddIns.value = [];
  giftCards.value = [{ id: 1, number: '', amount: '', source: 'new', legacyBalance: '' }];
  nextGiftCardId.value = 2;
  giftCardInfo.value = {};
  fetchedNumbers.value = {};
};

type CustomAddIn = {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number | null;
  currency: string;
  icon?: string | null;
  isCustom: true;
};
const customAddIns = ref<CustomAddIn[]>([]);

type CheckoutServiceLine = {
  id: string;
  serviceId?: string | null;
  name: string;
  durationMinutes?: number | null;
  priceCents?: number | null;
  currency?: string | null;
  staffId?: string | null;
  staffName?: string | null;
  isCustom?: false;
};

const persistedServiceLines = computed<CheckoutServiceLine[]>(() =>
  (item.value?.services ?? []).map((service, index) => ({
    id: service.id || `service-line-${index}`,
    serviceId: service.serviceId ?? null,
    name: service.serviceName,
    durationMinutes: service.durationMinutes ?? null,
    priceCents: service.priceCents ?? null,
    currency: service.currency ?? 'USD',
    staffId: service.staffId ?? null,
    staffName: service.staffName ?? null,
  })),
);

const selectedServiceObjects = computed<Array<CheckoutServiceLine | CustomAddIn>>(() => [
  ...persistedServiceLines.value,
  ...customAddIns.value,
]);

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
    background: `${color}14`,
  };
};
const serviceStyle = (svc: ServiceItem) => {
  const cat = categories.value.find((c) => c.id === svc.categoryId);
  return {
    borderLeft: `4px solid ${getCategoryColor(cat?.name)}`,
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
const popularServiceIds = computed(() => filteredServices.value.slice(0, 3).map((svc) => svc.id));

const serviceMatchesPersistedLine = (service: ServiceItem, line: CheckoutServiceLine) =>
  line.serviceId === service.id ||
  (!line.serviceId && line.name.trim().toLowerCase() === service.name.trim().toLowerCase());

const isSelected = (serviceId: string) => {
  const service = services.value.find((candidate) => candidate.id === serviceId);
  return service
    ? persistedServiceLines.value.some((line) => serviceMatchesPersistedLine(service, line))
    : persistedServiceLines.value.some((line) => line.serviceId === serviceId);
};

const serviceQuantity = (service: ServiceItem) =>
  persistedServiceLines.value.filter((line) => serviceMatchesPersistedLine(service, line)).length;

const serviceLineStaffLabel = (line: CheckoutServiceLine) =>
  line.staffName?.trim() || (line.staffId ? 'Assigned' : 'Assign later');
const firstCatalogServiceLine = (service: ServiceItem) =>
  persistedServiceLines.value.find((line) => serviceMatchesPersistedLine(service, line)) ?? null;

const selectedServiceRows = computed(() => {
  return selectedServiceObjects.value.map((svc) => ({ svc, quantity: 1 }));
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
const selectedPromotion = computed(() =>
  availablePromotions.value.find((promo) => promo.id === selectedPromotionId.value) ?? null,
);
const promotionDiscount = computed(() => {
  const promo = selectedPromotion.value;
  if (!promo || subtotal.value <= 0) return 0;
  const raw =
    promo.offerType === 'percent'
      ? subtotal.value * (promo.offerValue / 100)
      : promo.offerValue;
  return Math.min(subtotal.value, Math.max(0, Number(raw.toFixed(2))));
});
const manualDiscount = computed(() => {
  const raw = Number(manualDiscountValue.value);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(Math.max(0, subtotal.value - promotionDiscount.value), Number(raw.toFixed(2)));
});
const checkoutDiscount = computed(() =>
  Math.min(subtotal.value, Number((promotionDiscount.value + manualDiscount.value).toFixed(2))),
);
const loyaltyReady = computed(
  () =>
    !loading.value &&
    item.value !== null &&
    Boolean(item.value.customerId) &&
    loyalty.value.customerId === item.value.customerId &&
    loyalty.value.loaded &&
    !loyalty.value.loading,
);
const loyaltyUnavailable = computed(
  () =>
    !loyalty.value.loading &&
    item.value !== null &&
    (!item.value.customerId || Boolean(loyalty.value.error)),
);
const loyaltyState = computed(() =>
  resolveCheckoutRedeemState({
    fallbackPoints: item.value?.pointsBalance,
    authoritativePoints: loyalty.value.pointsBalance,
    required: REDEEM_REQUIRED_POINTS,
    isAuthoritativeLoaded: loyaltyReady.value,
    isAuthoritativeLoading: loyalty.value.loading,
  }),
);
const redeemStatus = computed<RedeemStatus>(() => loyaltyState.value.redeemStatus);
const hasBillItems = computed(() => customTotalValid.value || selectedServiceObjects.value.length > 0);
const staffTrackingEnabled = computed(
  () => settings.value?.enableStaffSelection === true,
);
const assignedStaff = computed(() => {
  const unique = new Map<string, string>();
  (item.value?.services ?? []).forEach((service) => {
    if (service.staffId) {
      unique.set(service.staffId, service.staffName || service.staffId);
    }
  });
  return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
});
const unassignedServiceLines = computed(() =>
  (item.value?.services ?? []).filter(
    (service): service is typeof service & { id: string } => Boolean(service.id) && !service.staffId,
  ),
);
const staffSelectionRequired = computed(
  () => Boolean(
    staffTrackingEnabled.value &&
    settings.value?.requireStaffBeforeCheckout &&
    unassignedServiceLines.value.length > 0,
  ),
);
const staffDisplayName = (member: StaffMember) => member.nickname || member.name;
const staffWorkload = computed(() => deriveStaffWorkload(inServiceQueue.value));
const orderedPickerStaff = computed(() =>
  staffList.value
    .filter((member) => member.active)
    .slice()
    .sort((a, b) => {
      const countDelta =
        (staffWorkload.value.get(a.id)?.count ?? 0) -
        (staffWorkload.value.get(b.id)?.count ?? 0);
      if (countDelta !== 0) return countDelta;
      return staffDisplayName(a).localeCompare(staffDisplayName(b));
    }),
);
const availablePickerStaff = computed(() =>
  orderedPickerStaff.value.filter((member) => !(staffWorkload.value.get(member.id)?.count ?? 0)),
);
const busyPickerStaff = computed(() =>
  orderedPickerStaff.value.filter((member) => Boolean(staffWorkload.value.get(member.id)?.count)),
);
const inactivePickerStaff = computed(() =>
  staffList.value
    .filter((member) => !member.active)
    .slice()
    .sort((a, b) => staffDisplayName(a).localeCompare(staffDisplayName(b))),
);
const staffWorkloadLabel = (member: StaffMember) => {
  const workload = staffWorkload.value.get(member.id);
  if (!workload?.count) return 'Available';
  if (workload.count === 1 && workload.assignments[0]) {
    const assignment = workload.assignments[0];
    return `Serving ${assignment.customerName} · ${assignment.serviceName}`;
  }
  return `${workload.count} active services`;
};
const staffWorkloadDetails = (member: StaffMember) => {
  const workload = staffWorkload.value.get(member.id);
  if (!workload || workload.count <= 1) return '';
  return workload.assignments
    .map((assignment) => `${assignment.customerName} · ${assignment.serviceName}`)
    .join(' • ');
};
const pickerServiceLine = computed(() =>
  (item.value?.services ?? []).find((service) => service.id === staffPickerLineId.value) ?? null,
);
const tipsEnabled = computed(() => Boolean(settings.value?.enableTips));
const taxEnabled = computed(() => Boolean(settings.value?.enableTax));
const taxMode = computed(() => settings.value?.taxMode ?? 'disabled');
const paymentMethods = computed(
  () =>
    settings.value?.paymentMethods ?? {
      cash: true,
      card: true,
      gift_card: true,
      check: false,
      other: false,
    },
);
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
const taxAmount = computed(() => {
  if (!taxEnabled.value) return 0;
  if (taxMode.value === 'manual') {
    const raw = Number(taxDraft.value);
    return Number.isFinite(raw) && raw > 0 ? Number(raw.toFixed(2)) : 0;
  }
  if (taxMode.value === 'configured_rate') {
    const rate = Number(settings.value?.taxRatePercent ?? 0);
    return Number.isFinite(rate) && rate > 0 ? Number(((subtotal.value - checkoutDiscount.value) * rate / 100).toFixed(2)) : 0;
  }
  return 0;
});
const tipAmount = computed(() => {
  if (!tipsEnabled.value) return 0;
  const raw = Number(tipDraft.value);
  return Number.isFinite(raw) && raw > 0 ? Number(raw.toFixed(2)) : 0;
});
const paymentState = computed(() =>
  resolveCheckoutPaymentState({
    subtotal: subtotal.value,
    discountValue: checkoutDiscount.value,
    taxValue: taxAmount.value,
    tipValue: tipAmount.value,
    hasBillItems: hasBillItems.value,
    redeemSelected: redeemPoints.value,
    redeemStatus: redeemStatus.value,
    preservedRedeemPoints: loyalty.value.pointsBalance,
    requiredPoints: REDEEM_REQUIRED_POINTS,
    redeemDollarValue: REDEEM_DOLLAR_VALUE,
    preserveRedeemWhileLoading:
      loyalty.value.loading &&
      loyalty.value.customerId !== null &&
      loyalty.value.customerId === item.value?.customerId,
    paymentOptions: paymentOptions.value,
    paymentAmounts: paymentAmounts.value,
    giftCardsTotal: giftCardsTotal.value,
  }),
);
const displayRedeemStatus = computed<RedeemStatus>(() => paymentState.value.redeemStatus);
const availablePoints = computed(() => displayRedeemStatus.value.points);
const redeemValue = computed(() => paymentState.value.redeemValue);
const redeemShortfall = computed(
  () => Math.max(0, displayRedeemStatus.value.required - displayRedeemStatus.value.points),
);
const totalDue = computed(() => paymentState.value.totalDue);
const enteredPayments = computed(() => paymentState.value.enteredPayments);
const enteredTotal = computed(() => paymentState.value.enteredTotal);
const remainingBalance = computed(() => paymentState.value.remainingBalance);
const remainingState = computed<'due' | 'paid' | 'over'>(() => paymentState.value.remainingState);
const canCompleteCheckout = computed(() => paymentState.value.canCompleteCheckout);
const hasDirtyCheckout = computed(() => {
  const hasServices = customAddIns.value.length > 0;
  const hasPaymentOptions = paymentOptions.value.cash || paymentOptions.value.card || paymentOptions.value.gift;
  const hasPaymentAmounts =
    Boolean((paymentAmounts.value.cash || '').trim()) || Boolean((paymentAmounts.value.card || '').trim());
  const hasGiftCardData =
    giftCards.value.some((g) => (g.number || '').trim() || (g.amount || '').trim()) || paymentOptions.value.gift;
  const hasEntries = enteredPayments.value.length > 0;
  const hasCustom = customTotalMode.value || Boolean(customTotalValue.value.trim());
  const hasDiscount = Boolean(selectedPromotionId.value) || Boolean(manualDiscountValue.value.trim());
  const hasStaff = Boolean(selectedStaffId.value || selectedStaffName.value);
  const hasTax = Boolean(taxDraft.value.trim());
  const hasTip = Boolean(tipDraft.value.trim());
  return (
    hasServices ||
    hasPaymentOptions ||
    hasPaymentAmounts ||
    hasGiftCardData ||
    hasEntries ||
    subtotal.value > 0 ||
    hasCustom ||
    hasDiscount ||
    hasStaff ||
    hasTax ||
    hasTip
  );
});
const completing = ref(false);
const checkoutCompleted = ref(false);

const loadCustomerLoyalty = async (customerId: string | null | undefined) => {
  loyaltyRequestId += 1;
  const requestId = loyaltyRequestId;

  if (!customerId) {
    loyalty.value = {
      customerId: null,
      pointsBalance: null,
      loading: false,
      loaded: false,
      error: 'Customer not found',
    };
    return;
  }

  loyalty.value = {
    customerId,
    pointsBalance: loyalty.value.customerId === customerId ? loyalty.value.pointsBalance : null,
    loading: true,
    loaded: false,
    error: '',
  };

  try {
    const snapshot = await fetchCustomerLoyalty(customerId);
    if (requestId !== loyaltyRequestId) return;
    loyalty.value = {
      customerId,
      pointsBalance: snapshot.pointsBalance ?? 0,
      loading: false,
      loaded: true,
      error: '',
    };
  } catch (err) {
    if (requestId !== loyaltyRequestId) return;
    loyalty.value = {
      customerId,
      pointsBalance: null,
      loading: false,
      loaded: false,
      error: err instanceof Error ? err.message : 'Failed to load loyalty',
    };
  }
};

const loadAvailablePromotions = async (customerId: string | null | undefined) => {
  const currentSelection = selectedPromotionId.value;
  availablePromotions.value = [];
  promotionsError.value = '';
  if (!customerId) {
    selectedPromotionId.value = '';
    return;
  }

  promotionsLoading.value = true;
  try {
    const promos = await fetchAvailablePromotions(customerId);
    availablePromotions.value = promos;
    selectedPromotionId.value = promos.some((promo) => promo.id === currentSelection) ? currentSelection : '';
  } catch (err) {
    selectedPromotionId.value = '';
    promotionsError.value = err instanceof Error ? err.message : 'Failed to load promotions';
  } finally {
    promotionsLoading.value = false;
  }
};

const loadCheckin = async (opts?: { silent?: boolean }) => {
  if (!opts?.silent) loading.value = true;
  try {
    // Pull current in-service items and locate the target check-in
    const res = await fetchQueue({ status: 'IN_SERVICE', limit: 100 });
    const list = (res as any).items ?? [];
    inServiceQueue.value = list;
    const match = list.find((q: QueueItem) => q.id === checkinId.value) as QueueItem | undefined;
    if (!match) {
      ElMessage.warning('Start service before checkout');
      router.replace({ name: 'admin-queue' });
      return;
    }
    item.value = match;
    await loadCustomerLoyalty(match.customerId ?? null);
    await loadAvailablePromotions(match.customerId ?? null);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load checkout');
    router.replace({ name: 'admin-queue' });
  } finally {
    if (!opts?.silent) loading.value = false;
  }
};

const confirmDiscard = async (): Promise<boolean> => {
  if (!hasDirtyCheckout.value) return true;
  try {
    await ElMessageBox.confirm(
      'Discard payment progress? Saved service lines will remain on this visit.',
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
  Promise.all([
    fetchSettings().catch(() => null),
    fetchStaff(1, 200).catch(() => ({ items: [], total: 0 })),
  ]).then(([settingsData, staffData]) => {
    settings.value = settingsData;
    staffList.value = staffData.items ?? [];
  });
  loadCheckin();
  Promise.all([fetchCategories(), fetchServices()])
    .then(([categoryData, serviceData]) => {
      categories.value = categoryData;
      services.value = serviceData;
    })
    .catch(() => {
      categories.value = [];
      services.value = [];
    });
});

watch(
  () => checkinId.value,
  () => {
    loadDrafts();
    loadCheckin();
  },
);

watch(
  () => [
    paymentOptions.value,
    paymentAmounts.value,
    giftCards.value,
    customTotalMode.value,
    customTotalValue.value,
    selectedPromotionId.value,
    manualDiscountValue.value,
  ],
  () => persistPayments(),
  { deep: true },
);

watch(
  () => redeemStatus.value.reason,
  () => {
    if (
      shouldClearRedeemSelection({
        redeemSelected: redeemPoints.value,
        redeemStatus: redeemStatus.value,
      })
    ) {
      redeemPoints.value = false;
    }
  },
  { immediate: true },
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

const formatCurrency = (amount: number, currency?: string | null) =>
  Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format(amount);

const isAddInService = (service?: ServiceItem | null) => {
  if (!service) return false;
  if ((service as any).isAddIn) return true;
  return service.name.trim().toLowerCase() === 'add in';
};

const currentAddIn = computed(() => customAddIns.value[0] ?? null);

const ensureStaffLoaded = async () => {
  if (staffList.value.length) return;
  try {
    const response = await fetchStaff(1, 200);
    staffList.value = response.items ?? [];
  } catch {
    staffList.value = [];
  }
};

const openServiceStaffPicker = async (serviceLineId: string) => {
  if (!staffTrackingEnabled.value || !serviceLineId) return;
  await ensureStaffLoaded();
  staffPickerLineId.value = serviceLineId;
  staffPickerOpen.value = true;
};

const closeServiceStaffPicker = (forceOrEvent: boolean | MouseEvent = false) => {
  const force = typeof forceOrEvent === 'boolean' ? forceOrEvent : false;
  if (staffPickerLoading.value && !force) return;
  staffPickerOpen.value = false;
  staffPickerLineId.value = null;
};

const assignStaffFromCheckoutPicker = async (member: StaffMember) => {
  const line = pickerServiceLine.value;
  if (!item.value || !line?.id) return;
  staffPickerLoading.value = true;
  try {
    await assignStaffToCheckIn(item.value.id, member.id, line.id, false);
    await loadCheckin({ silent: true });
    closeServiceStaffPicker(true);
    ElMessage.success(`${staffDisplayName(member)} assigned to ${line.serviceName}`);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to assign staff');
  } finally {
    staffPickerLoading.value = false;
  }
};

const leaveServiceUnassigned = async () => {
  const line = pickerServiceLine.value;
  if (!item.value || !line?.id || !line.staffId) return;
  staffPickerLoading.value = true;
  try {
    await unassignStaffFromCheckIn(item.value.id, line.id);
    await loadCheckin({ silent: true });
    closeServiceStaffPicker(true);
    ElMessage.success(`${line.serviceName} is now unassigned`);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to unassign staff');
  } finally {
    staffPickerLoading.value = false;
  }
};

const addServiceFromCatalog = async (service: ServiceItem) => {
  if (!item.value || serviceMutationLoading.value) return;
  serviceMutationLoading.value = true;
  try {
    const result = await addServiceToCheckIn(item.value.id, service.id, null);
    await loadCheckin({ silent: true });
    const serviceLineId = (result as { serviceLineId?: string } | null)?.serviceLineId;
    if (staffTrackingEnabled.value && serviceLineId) {
      await openServiceStaffPicker(serviceLineId);
    } else {
      ElMessage.success(`${service.name} added to this visit`);
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to add service');
  } finally {
    serviceMutationLoading.value = false;
  }
};

const toggleService = async (serviceId: string) => {
  const service = services.value.find((candidate) => candidate.id === serviceId);
  if (isAddInService(service)) {
    openAddInModal(service);
    return;
  }
  if (!service) return;

  const matchingLines = persistedServiceLines.value.filter((line) =>
    serviceMatchesPersistedLine(service, line),
  );
  if (matchingLines.length === 1 && matchingLines[0]?.id && !matchingLines[0].id.startsWith('service-line-')) {
    await openServiceStaffPicker(matchingLines[0].id);
    return;
  }
  if (matchingLines.length > 1) {
    ElMessage.info('Choose a service line below to manage its technician.');
    return;
  }
  await addServiceFromCatalog(service);
};

const removePersistedServiceLine = async (line: CheckoutServiceLine) => {
  if (!item.value || !line.id || line.id.startsWith('service-line-') || serviceMutationLoading.value) return;
  try {
    await ElMessageBox.confirm(
      `Remove ${line.name} from this visit?`,
      'Remove service',
      {
        confirmButtonText: 'Remove',
        cancelButtonText: 'Keep service',
        type: 'warning',
      },
    );
  } catch {
    return;
  }

  serviceMutationLoading.value = true;
  try {
    await removeServiceFromCheckIn(item.value.id, line.id);
    await loadCheckin({ silent: true });
    ElMessage.success(`${line.name} removed from this visit`);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to remove service');
  } finally {
    serviceMutationLoading.value = false;
  }
};

const openAddInModal = (service?: ServiceItem) => {
  pendingAddInService.value = service ?? null;
  const existing = customAddIns.value[0];
  addInTitle.value = existing && existing.name !== 'Custom Add-in' ? existing.name : '';
  addInAmount.value = existing ? (existing.priceCents / 100).toFixed(2) : '';
  showAddInModal.value = true;
};

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

// Add-in modal state and helpers
const showAddInModal = ref(false);
const pendingAddInService = ref<ServiceItem | null>(null);
const addInTitle = ref('');
const addInAmount = ref<string>('');
const presetAddInAmounts = [5, 10, 15, 20];

const confirmAddIn = () => {
  const amount = Number(addInAmount.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    ElMessage.warning('Enter a valid amount for the add-in.');
    return;
  }
  const id = `addin-${Date.now()}`;
  const name = addInTitle.value.trim() || pendingAddInService.value?.name || 'Custom Add-in';
  customAddIns.value = [{
    id,
    name,
    priceCents: Math.round(amount * 100),
    durationMinutes: null,
    currency: pendingAddInService.value?.currency || 'USD',
    icon: '➕',
    isCustom: true,
  }];
  showAddInModal.value = false;
  addInAmount.value = '';
  addInTitle.value = '';
  pendingAddInService.value = null;
};

const removeCustomAddIn = (id: string) => {
  customAddIns.value = customAddIns.value.filter((c) => c.id !== id);
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
    const rawBalance = (card.legacyBalance || '').trim();
    if (!rawBalance) return undefined;
    const manual = Number(rawBalance);
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

const showLegacyBalanceInput = (card: { id: number; source?: 'new' | 'legacy' }) =>
  card.source === 'legacy' && !giftCardInfo.value[card.id]?.card;

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
    if (card.source === 'legacy' && !info?.card && bal === undefined) {
      ElMessage.warning(`Enter the current balance for old gift card ${num}`);
      return false;
    }
    if (bal !== undefined && amt > bal) {
      ElMessage.warning(`Gift card ${num} exceeds available balance`);
      return false;
    }
  }
  return true;
};

const submitCheckout = async () => {
  if (!item.value) return;
  if (!settings.value) {
    settings.value = await fetchSettings().catch(() => null);
  }
  await loadCheckin({ silent: true });
  if (!canCompleteCheckout.value) {
    ElMessage.warning('Add a total (services or custom) and payments before checkout.');
    return;
  }
  if (redeemPoints.value && loyalty.value.loading) {
    ElMessage.warning('Wait for loyalty points to finish loading before redeeming.');
    return;
  }
  if (redeemPoints.value && !redeemStatus.value.eligible) {
    ElMessage.warning(
      redeemStatus.value.reason === 'insufficient-points'
        ? 'Not enough points to redeem.'
        : 'Loyalty points are unavailable right now.',
    );
    return;
  }
  if (staffSelectionRequired.value) {
    ElMessage.warning('Assign a technician to each unresolved service line before checkout.');
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
    // Service-line assignments are authoritative for current visits. Keep the
    // old ticket-level fields only as a compatibility fallback for legacy
    // check-ins that have no durable service rows yet.
    const hasDurableServiceLines = Boolean(item.value.services?.length);
    const legacyStaffId = hasDurableServiceLines ? null : selectedStaffId.value || null;
    const legacyStaffName = hasDurableServiceLines ? null : selectedStaffName.value || null;
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
    const paymentBreakdown = enteredPayments.value.reduce<Record<string, number>>((acc, payment) => {
      const key = payment.method === 'gift' ? 'gift_card' : payment.method;
      acc[key] = (acc[key] ?? 0) + payment.amount;
      return acc;
    }, {});

    checkoutCompleted.value = true;
    await checkoutCheckIn(checkinId.value, {
      amountPaid: enteredTotal.value,
      taxAmount: taxAmount.value,
      tipAmount: tipAmount.value,
      staffId: legacyStaffId,
      staffName: legacyStaffName,
      source: 'admin_checkout',
      createdFrom: 'queue',
      paymentBreakdown,
      reviewSmsConsent: true,
      servedByName: legacyStaffName,
      redeemPoints: redeemPoints.value && redeemStatus.value.eligible,
      payments: enteredPayments.value,
      giftCardNumber,
      giftCardAmount,
      giftCards: giftCardSummaries,
      promotionId: selectedPromotion.value?.id ?? null,
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
  if (!hasDirtyCheckout.value || checkoutCompleted.value) return next();
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
              v-for="category in filteredCategories"
              :key="category.id"
              type="button"
              class="category-pill"
              :class="{ active: selectedCategory === category.id }"
              :style="categoryStyle(category)"
              @click="selectedCategory = category.id"
            >
              <span class="cat-icon">{{ category.icon || '🗂' }}</span>
              <span class="cat-name">{{ category.name }}</span>
            </button>
          </div>
        </ElCard>
      </section>

      <!-- Add-in modal -->
      <ElDialog v-model="showAddInModal" width="360px" class="addin-dialog" :close-on-click-modal="false">
        <template #title>Add custom charge</template>
        <div class="addin-body">
          <ElInput v-model="addInTitle" placeholder="Title (optional)" class="mb-3" />
          <ElInput
            v-model="addInAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount (e.g., 10.00)"
          />
          <div class="addin-presets">
            <span class="preset-label">Quick amounts:</span>
            <button
              v-for="value in presetAddInAmounts"
              :key="value"
              type="button"
              class="preset-btn"
              @click="addInAmount = value.toFixed(2)"
            >
              ${{ value }}
            </button>
          </div>
        </div>
        <template #footer>
          <div class="addin-footer">
            <ElButton @click="showAddInModal = false">Cancel</ElButton>
            <ElButton type="primary" @click="confirmAddIn">Add to bill</ElButton>
          </div>
        </template>
      </ElDialog>

      <ElDialog
        v-model="staffPickerOpen"
        :title="pickerServiceLine ? `Assign staff · ${pickerServiceLine.serviceName}` : 'Assign staff'"
        width="min(520px, calc(100vw - 24px))"
        class="checkout-staff-picker-modal"
        :close-on-click-modal="false"
        @closed="closeServiceStaffPicker"
      >
        <div class="staff-picker-body">
          <div class="staff-picker-context">
            <div class="staff-picker-customer">{{ item?.customerName || 'Customer' }}</div>
            <div class="staff-picker-description">
              Choose the technician for this service line. Busy technicians can still be selected.
            </div>
          </div>

          <div v-if="availablePickerStaff.length" class="staff-picker-section">
            <div class="staff-picker-section-title">
              <span>Available</span>
              <span class="staff-picker-count">{{ availablePickerStaff.length }}</span>
            </div>
            <div class="staff-picker-grid">
              <button
                v-for="member in availablePickerStaff"
                :key="member.id"
                type="button"
                class="staff-picker-option"
                :disabled="staffPickerLoading"
                @click="assignStaffFromCheckoutPicker(member)"
              >
                <span class="staff-picker-avatar">{{ staffDisplayName(member).slice(0, 1).toUpperCase() }}</span>
                <span class="staff-picker-option-copy">
                  <span class="staff-picker-name">{{ staffDisplayName(member) }}</span>
                  <span class="staff-picker-status">Available</span>
                </span>
                <span class="staff-picker-chevron">›</span>
              </button>
            </div>
          </div>

          <div v-if="busyPickerStaff.length" class="staff-picker-section">
            <div class="staff-picker-section-title">
              <span>Busy</span>
              <span class="staff-picker-count">{{ busyPickerStaff.length }}</span>
            </div>
            <div class="staff-picker-grid">
              <button
                v-for="member in busyPickerStaff"
                :key="member.id"
                type="button"
                class="staff-picker-option"
                :disabled="staffPickerLoading"
                @click="assignStaffFromCheckoutPicker(member)"
              >
                <span class="staff-picker-avatar staff-picker-avatar--busy">{{ staffDisplayName(member).slice(0, 1).toUpperCase() }}</span>
                <span class="staff-picker-option-copy">
                  <span class="staff-picker-name">{{ staffDisplayName(member) }}</span>
                  <span class="staff-picker-status">{{ staffWorkloadLabel(member) }}</span>
                  <span v-if="staffWorkloadDetails(member)" class="staff-picker-assignment-detail">
                    {{ staffWorkloadDetails(member) }}
                  </span>
                </span>
                <span class="staff-picker-chevron">›</span>
              </button>
            </div>
          </div>

          <div v-if="inactivePickerStaff.length" class="staff-picker-section staff-picker-section--inactive">
            <div class="staff-picker-section-title">
              <span>Off / Inactive</span>
              <span class="staff-picker-count">{{ inactivePickerStaff.length }}</span>
            </div>
            <div class="staff-picker-grid">
              <div
                v-for="member in inactivePickerStaff"
                :key="member.id"
                class="staff-picker-option staff-picker-option--inactive"
              >
                <span class="staff-picker-avatar staff-picker-avatar--inactive">{{ staffDisplayName(member).slice(0, 1).toUpperCase() }}</span>
                <span class="staff-picker-option-copy">
                  <span class="staff-picker-name">{{ staffDisplayName(member) }}</span>
                  <span class="staff-picker-status">Inactive</span>
                </span>
              </div>
            </div>
          </div>

          <div v-if="!orderedPickerStaff.length" class="staff-picker-empty">
            No active technicians are available. Add staff in Settings before assigning service.
          </div>

          <div class="staff-picker-footer">
            <button
              v-if="pickerServiceLine?.staffId"
              type="button"
              class="picker-unassign"
              :disabled="staffPickerLoading"
              @click="leaveServiceUnassigned"
            >
              Leave unassigned
            </button>
            <ElButton :disabled="staffPickerLoading" @click="closeServiceStaffPicker">Cancel</ElButton>
            <span v-if="staffPickerLoading" class="staff-picker-saving">Saving assignment…</span>
          </div>
        </div>
      </ElDialog>

      <!-- Column 2: Services -->
      <section class="checkout-panel services" v-if="checkoutStep === 'services'">
        <ElCard v-if="loading" class="glass-card" shadow="never">
          <ElSkeleton :rows="6" animated />
        </ElCard>
        <ElCard v-else class="glass-card" shadow="never">
          <div class="services-header">
            <div>
              <div class="services-title">Services</div>
              <div class="panel-sub">Services selected during check-in are already selected.</div>
            </div>
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
                v-for="service in filteredServices"
                :key="service.id"
                type="button"
                class="service-tile"
                :class="{
                  active: isSelected(service.id) && !isAddInService(service),
                  inherited: isSelected(service.id) && !isAddInService(service),
                  addin: isAddInService(service),
                  'addin-filled': isAddInService(service) && currentAddIn,
                }"
                :style="serviceStyle(service)"
                :aria-pressed="isSelected(service.id)"
                :disabled="serviceMutationLoading && !isAddInService(service)"
                @click="toggleService(service.id)"
              >
                <div class="svc-top">
                  <span class="svc-icon">{{ service.icon || '💅' }}</span>
                  <span v-if="serviceQuantity(service) > 1 && !isAddInService(service)" class="svc-quantity">
                    {{ serviceQuantity(service) }}
                  </span>
                  <span v-else-if="isSelected(service.id) && !isAddInService(service)" class="svc-check">✓</span>
                  <span
                    v-else-if="popularServiceIds.includes(service.id) && !isAddInService(service)"
                    class="svc-popular"
                  >
                    Popular
                  </span>
                </div>
                <template v-if="!isAddInService(service)">
                  <div class="svc-name">{{ service.name }}</div>
                  <div v-if="service.priceCents !== undefined && service.priceCents !== null" class="svc-price">
                    {{ formatCurrency((service.priceCents ?? 0) / 100, service.currency || 'USD') }}
                  </div>
                  <div v-if="service.durationMinutes" class="svc-duration">
                    {{ service.durationMinutes }} min
                  </div>
                  <div v-if="isSelected(service.id)" class="svc-inherited-label">
                    From check-in
                    <template v-if="serviceQuantity(service) === 1 && firstCatalogServiceLine(service)">
                      · {{ serviceLineStaffLabel(firstCatalogServiceLine(service)!) }}
                    </template>
                  </div>
                </template>
                <template v-else>
                  <div class="svc-name">{{ currentAddIn ? currentAddIn.name : 'Add custom charge' }}</div>
                  <div v-if="currentAddIn" class="svc-addin-amount">
                    {{ formatCurrency(currentAddIn.priceCents / 100, currentAddIn.currency) }} added · Tap to edit
                  </div>
                  <div v-else class="svc-addin-hint">Tap to enter amount</div>
                </template>
              </button>
            </div>
          </div>
          <div v-if="persistedServiceLines.length" class="sold-services">
            <div class="sold-services-header">
              <div>
                <div class="panel-title">Sold services for this visit</div>
                <div class="panel-sub">Saved service lines are charged at checkout.</div>
              </div>
              <span class="saved-badge">Saved</span>
            </div>
            <div class="selected-list">
              <div v-for="line in persistedServiceLines" :key="line.id" class="selected-row">
                <div class="selected-name">
                  <span class="svc-icon">💅</span>
                  <span>{{ line.name }}</span>
                </div>
                <div class="selected-line-actions">
                  <button
                    v-if="staffTrackingEnabled && !line.id.startsWith('service-line-')"
                    type="button"
                    class="checkout-staff-link"
                    :disabled="serviceMutationLoading"
                    @click="openServiceStaffPicker(line.id)"
                  >
                    {{ line.staffId ? `👤 ${serviceLineStaffLabel(line)}` : 'Assign later' }}
                    <span aria-hidden="true">›</span>
                  </button>
                  <span v-else-if="line.staffId" class="selected-meta-staff">👤 {{ serviceLineStaffLabel(line) }}</span>
                  <span v-if="line.durationMinutes" class="selected-meta-item">{{ line.durationMinutes }} min</span>
                  <span v-if="line.priceCents !== undefined && line.priceCents !== null" class="selected-meta-item">
                    {{ formatCurrency((line.priceCents ?? 0) / 100, line.currency) }}
                  </span>
                  <button
                    type="button"
                    class="remove-btn"
                    :disabled="serviceMutationLoading || line.id.startsWith('service-line-')"
                    :aria-label="`Remove ${line.name}`"
                    @click="removePersistedServiceLine(line)"
                  >
                    ✕
                  </button>
                </div>
              </div>
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
            <div class="bill-header-actions">
              <button type="button" class="edit-services-link" @click="goToServicesStep">
                Edit services
              </button>
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
          <div v-else-if="selectedServiceRows.length" class="selected-list">
            <div
              v-for="row in selectedServiceRows"
              :key="row.svc.id"
              class="selected-row"
            >
              <div class="selected-name">
                {{ row.svc.name }}
                <span v-if="row.quantity > 1" class="selected-quantity">× {{ row.quantity }}</span>
              </div>
              <div class="selected-meta">
                <button
                  v-if="staffTrackingEnabled && !(row.svc as any).isCustom && row.svc.id && !row.svc.id.startsWith('service-line-')"
                  type="button"
                  class="checkout-staff-link"
                  :disabled="serviceMutationLoading"
                  @click="openServiceStaffPicker(row.svc.id)"
                >
                  {{ (row.svc as any).staffId ? `👤 ${serviceLineStaffLabel(row.svc as CheckoutServiceLine)}` : 'Assign later' }}
                  <span aria-hidden="true">›</span>
                </button>
                <span v-else-if="(row.svc as any).staffId">👤 {{ serviceLineStaffLabel(row.svc as CheckoutServiceLine) }}</span>
                <span v-if="row.svc.durationMinutes">{{ row.svc.durationMinutes }} min</span>
                <span v-if="row.svc.priceCents !== undefined && row.svc.priceCents !== null">
                  {{
                    Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: (row.svc as any).currency || 'USD',
                      minimumFractionDigits: 2,
                    }).format(((row.svc.priceCents ?? 0) * row.quantity) / 100)
                  }}
                </span>
              </div>
              <button
                v-if="(row.svc as any).isCustom"
                class="remove-btn"
                type="button"
                @click="removeCustomAddIn(row.svc.id)"
              >
                ✕
              </button>
              <button
                v-else-if="!(row.svc as any).isCustom"
                class="remove-btn"
                type="button"
                :disabled="serviceMutationLoading || row.svc.id.startsWith('service-line-')"
                @click="removePersistedServiceLine(row.svc as CheckoutServiceLine)"
              >
                ✕
              </button>
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
            <div class="bill-row" v-if="checkoutDiscount > 0">
              <span>Promotion / discount</span>
              <span>-{{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(checkoutDiscount) }}</span>
            </div>
            <div class="bill-row">
              <span>Tax</span>
              <span v-if="taxEnabled">{{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(taxAmount) }}</span>
              <span v-else>—</span>
            </div>
            <div class="bill-row" v-if="tipsEnabled">
              <span>Tip</span>
              <span>{{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tipAmount) }}</span>
            </div>
            <div class="bill-row total">
              <span>Total</span>
              <span>{{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalDue) }}</span>
            </div>
          </div>

          <div v-if="staffTrackingEnabled" class="staff-block">
            <div class="payments-section-title">Staff tracking</div>
            <div v-if="assignedStaff.length" class="checkout-assigned-staff">
              <div class="checkout-assigned-staff-label">Assigned during service</div>
              <div class="checkout-assigned-staff-list">
                <span v-for="member in assignedStaff" :key="member.id" class="checkout-assigned-staff-chip">
                  {{ member.name }}
                </span>
              </div>
            </div>
            <div v-if="unassignedServiceLines.length" class="checkout-staff-repair">
              <div class="checkout-assigned-staff-label">Assign each service before checkout</div>
              <div v-for="line in unassignedServiceLines" :key="line.id" class="checkout-missing-line">
                <span>{{ line.serviceName }}</span>
                <button
                  type="button"
                  class="checkout-staff-link"
                  :disabled="serviceMutationLoading"
                  @click="openServiceStaffPicker(line.id)"
                >
                  Assign ›
                </button>
              </div>
            </div>
            <div v-if="staffSelectionRequired" class="discount-hint">
              Assign a technician to each unresolved service line before checkout.
            </div>
          </div>

          <div v-if="taxEnabled || tipsEnabled" class="adjustment-block">
            <div class="payments-section-title">Adjustments</div>
            <div v-if="taxEnabled && taxMode === 'manual'" class="pay-row">
              <span>Tax</span>
              <ElInput v-model="taxDraft" type="number" min="0" step="0.01" placeholder="0.00" />
            </div>
            <div v-else-if="taxEnabled && taxMode === 'configured_rate'" class="discount-hint">
              Tax is set to {{ settings?.taxRatePercent ?? 0 }}%.
            </div>
            <div v-if="tipsEnabled" class="pay-row">
              <span>Tip</span>
              <ElInput v-model="tipDraft" type="number" min="0" step="0.01" placeholder="0.00" />
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
            <div class="discount-row">
              <div class="payments-section-title">Promotions & discounts</div>
              <div class="discount-controls">
                <select v-model="selectedPromotionId" class="discount-select" :disabled="promotionsLoading">
                  <option value="">
                    {{ promotionsLoading ? 'Loading promotions...' : 'No promotion' }}
                  </option>
                  <option v-for="promo in availablePromotions" :key="promo.id" :value="promo.id">
                    {{ promo.name }} -
                    {{ promo.offerType === 'percent' ? `${promo.offerValue}%` : Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(promo.offerValue) }}
                    off
                  </option>
                </select>
                <ElInput
                  v-model="manualDiscountValue"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Discount amount"
                />
              </div>
              <div class="discount-hint" v-if="promotionsError">{{ promotionsError }}</div>
              <div class="discount-hint" v-else-if="!promotionsLoading && !availablePromotions.length">
                No unused customer promotions available.
              </div>
            </div>
            <div class="redeem-row" v-if="displayRedeemStatus.eligible">
              <label class="redeem-toggle">
                <input
                  type="checkbox"
                  v-model="redeemPoints"
                  :disabled="!displayRedeemStatus.eligible || completing"
                />
                <span>
                  Redeem {{ displayRedeemStatus.required }} points (Available: {{ availablePoints }} pts)
                </span>
              </label>
            </div>
            <div class="redeem-row redeem-row--disabled" v-else>
              <div v-if="loyaltyUnavailable" class="redeem-hint">
                Points unavailable right now.
              </div>
              <div v-else-if="displayRedeemStatus.reason === 'insufficient-points'" class="redeem-hint">
                Need {{ redeemShortfall }} more points to redeem.
              </div>
              <div v-else class="redeem-hint">
                Checking points balance…
              </div>
            </div>
            <div class="payments-section">
              <div class="payments-section-title">Select payment method</div>
              <div class="payments-options">
                <button
                  v-if="paymentMethods.cash"
                  type="button"
                  class="payment-method"
                  :class="{ active: paymentOptions.cash }"
                  @click="togglePaymentOption('cash', !paymentOptions.cash)"
                >
                  <ElIcon class="payment-icon"><Money /></ElIcon>
                  <span>Cash</span>
                </button>
                <button
                  v-if="paymentMethods.card"
                  type="button"
                  class="payment-method"
                  :class="{ active: paymentOptions.card }"
                  @click="togglePaymentOption('card', !paymentOptions.card)"
                >
                  <ElIcon class="payment-icon"><CreditCard /></ElIcon>
                  <span>Card</span>
                </button>
                <button
                  v-if="paymentMethods.gift_card"
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
                    <label v-if="showLegacyBalanceInput(card)" class="gift-label legacy-balance">
                      Current balance
                      <ElInput
                        v-model="card.legacyBalance"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Balance"
                      />
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
                      <span v-else-if="showLegacyBalanceInput(card)">Enter the current balance before applying this old gift card.</span>
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
  gap: 12px;
  margin-bottom: 16px;
}
.bill-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.edit-services-link {
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid #bae6fd;
  border-radius: 10px;
  background: #f0f9ff;
  color: #0369a1;
  cursor: pointer;
  font-size: 13px;
  font-weight: 750;
}
.edit-services-link:hover,
.edit-services-link:focus-visible {
  border-color: #38bdf8;
  outline: none;
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
.service-tile.addin {
  border-style: dashed;
  border-color: rgba(59, 130, 246, 0.6);
}
.service-tile.addin-filled {
  border-style: solid;
  border-color: rgba(34, 197, 94, 0.7);
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
.service-tile.inherited {
  cursor: default;
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
.svc-quantity {
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.35);
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
.svc-addin-amount {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin-top: 6px;
}
.svc-addin-hint {
  font-size: 14px;
  color: #475569;
  margin-top: 6px;
}
.svc-duration {
  font-size: 16px;
  color: #555;
  margin-top: 4px;
}
.svc-inherited-label {
  align-self: flex-start;
  padding: 3px 8px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: 12px;
  font-weight: 700;
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
  display: flex;
  align-items: center;
  gap: 8px;
}
.selected-quantity {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 8px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 800;
}
.selected-meta {
  font-size: 12px;
  color: #475569;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.selected-line-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
.selected-meta-item,
.selected-meta-staff {
  white-space: nowrap;
}
.checkout-staff-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-height: 36px;
  padding: 5px 9px;
  border: 1px solid #bae6fd;
  border-radius: 999px;
  background: #f0f9ff;
  color: #0369a1;
  cursor: pointer;
  font-size: 12px;
  font-weight: 750;
  white-space: nowrap;
}
.checkout-staff-link:hover:not(:disabled),
.checkout-staff-link:focus-visible {
  border-color: #0ea5e9;
  outline: none;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.14);
}
.checkout-staff-link:disabled,
.remove-btn:disabled {
  cursor: wait;
  opacity: 0.55;
}
.sold-services {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.28);
}
.sold-services-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.saved-badge {
  flex: 0 0 auto;
  padding: 5px 9px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.picker-unassign {
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fff7f7;
  color: #b91c1c;
  cursor: pointer;
  font-size: 12px;
  font-weight: 750;
}
.picker-unassign:hover:not(:disabled),
.picker-unassign:focus-visible {
  border-color: #f87171;
  outline: none;
}
.picker-unassign:disabled {
  cursor: wait;
  opacity: 0.55;
}
.checkout-missing-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  color: #334155;
  font-size: 13px;
  font-weight: 650;
}
.checkout-staff-picker-modal :deep(.el-dialog) {
  border-radius: 18px;
}
.staff-picker-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 4px 2px;
}
.checkout-staff-picker-modal :deep(.el-dialog__body) {
  max-height: calc(100dvh - 170px);
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
.staff-picker-context {
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
}
.staff-picker-customer {
  color: #0f172a;
  font-size: 17px;
  font-weight: 750;
}
.staff-picker-description {
  margin-top: 3px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}
.staff-picker-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.staff-picker-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #334155;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.staff-picker-count {
  display: inline-flex;
  min-width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-size: 11px;
  letter-spacing: normal;
}
.staff-picker-grid {
  display: grid;
  gap: 8px;
}
.staff-picker-option {
  display: flex;
  width: 100%;
  min-height: 68px;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  color: #0f172a;
  cursor: pointer;
  text-align: left;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
  transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
}
.staff-picker-option:hover:not(:disabled),
.staff-picker-option:focus-visible {
  border-color: #0ea5e9;
  box-shadow: 0 8px 18px rgba(14, 165, 233, 0.14);
  outline: none;
  transform: translateY(-1px);
}
.staff-picker-option:disabled {
  cursor: wait;
  opacity: 0.65;
}
.staff-picker-avatar {
  display: inline-flex;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #dcfce7;
  color: #15803d;
  font-size: 16px;
  font-weight: 800;
}
.staff-picker-avatar--busy {
  background: #fef3c7;
  color: #b45309;
}
.staff-picker-avatar--inactive {
  background: #e2e8f0;
  color: #64748b;
}
.staff-picker-option--inactive {
  cursor: default;
  opacity: 0.72;
}
.staff-picker-option-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}
.staff-picker-name {
  overflow: hidden;
  font-size: 15px;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.staff-picker-status {
  color: #64748b;
  font-size: 12px;
}
.staff-picker-assignment-detail {
  overflow: hidden;
  color: #94a3b8;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.staff-picker-chevron {
  color: #94a3b8;
  font-size: 24px;
  line-height: 1;
}
.staff-picker-empty {
  padding: 14px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}
.staff-picker-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 2px;
}
.staff-picker-saving {
  color: #64748b;
  font-size: 12px;
}
.remove-btn {
  border: none;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  font-weight: 700;
}
.addin-dialog :deep(.el-dialog__body) {
  padding-top: 6px;
}
.addin-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.addin-presets {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.preset-label {
  font-size: 12px;
  color: #475569;
}
.preset-btn {
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.12s ease;
}
.preset-btn:hover {
  border-color: #3b82f6;
  color: #0f172a;
}
.addin-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
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
.discount-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  background: #ffffff;
}
.discount-controls {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(160px, 220px);
  gap: 10px;
  align-items: center;
}
.discount-select {
  width: 100%;
  min-height: 40px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 10px;
  background: #fff;
  padding: 0 12px;
  color: #0f172a;
  font-weight: 600;
}
.discount-hint {
  font-size: 12px;
  color: #64748b;
}
.checkout-assigned-staff,
.checkout-staff-repair {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}
.checkout-assigned-staff {
  padding: 10px 12px;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  background: #f0fdf4;
}
.checkout-assigned-staff-label {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}
.checkout-assigned-staff-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.checkout-assigned-staff-chip {
  padding: 5px 9px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: 13px;
  font-weight: 750;
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
.redeem-row--disabled {
  background: #f8fafc;
  border-color: rgba(148, 163, 184, 0.3);
  color: #475569;
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
  grid-template-columns: 140px minmax(180px, 1fr) 140px 140px auto;
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
  min-height: 44px;
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
  .checkout-header {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .step-toggle {
    margin-left: auto;
  }
  .services-header {
    align-items: stretch;
    flex-direction: column;
  }
  .services-search {
    width: 100%;
  }
  .selected-row {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }
  .selected-line-actions,
  .selected-meta {
    justify-content: flex-start;
  }
  .bill-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .bill-header-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
