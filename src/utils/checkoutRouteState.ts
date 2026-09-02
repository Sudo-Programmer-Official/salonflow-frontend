export type CheckoutLoyaltyState = {
  customerId: string | null;
  pointsBalance: number | null;
  loading: boolean;
  loaded: boolean;
  error: string;
};

export type CheckoutDraftState = {
  paymentOptions: { cash: boolean; card: boolean; gift: boolean };
  paymentAmounts: { cash: string; card: string };
  customTotalMode: boolean;
  customTotalValue: string;
  selectedPromotionId: string;
  manualDiscountValue: string;
  selectedStaffId: string;
  selectedStaffName: string;
  taxDraft: string;
  tipDraft: string;
  availablePromotions: unknown[];
  promotionsLoading: boolean;
  promotionsError: string;
  customAddIns: unknown[];
  giftCards: Array<{ id: number; number: string; amount: string; source: 'new' }>;
  nextGiftCardId: number;
  giftCardInfo: Record<number, unknown>;
  fetchedNumbers: Record<number, string>;
  staffPickerOpen: boolean;
  staffPickerLineId: string | null;
};

export const createEmptyCheckoutLoyaltyState = (): CheckoutLoyaltyState => ({
  customerId: null,
  pointsBalance: null,
  loading: false,
  loaded: false,
  error: '',
});

export const createEmptyCheckoutDraftState = (): CheckoutDraftState => ({
  paymentOptions: { cash: false, card: false, gift: false },
  paymentAmounts: { cash: '', card: '' },
  customTotalMode: false,
  customTotalValue: '',
  selectedPromotionId: '',
  manualDiscountValue: '',
  selectedStaffId: '',
  selectedStaffName: '',
  taxDraft: '0.00',
  tipDraft: '0.00',
  availablePromotions: [],
  promotionsLoading: false,
  promotionsError: '',
  customAddIns: [],
  giftCards: [{ id: 1, number: '', amount: '', source: 'new' }],
  nextGiftCardId: 2,
  giftCardInfo: {},
  fetchedNumbers: {},
  staffPickerOpen: false,
  staffPickerLineId: null,
});

export const checkoutRouteResetState = () => ({
  item: null,
  loyalty: createEmptyCheckoutLoyaltyState(),
  redeemPoints: false,
  checkoutCompleted: false,
  checkoutStep: 'services' as const,
  draft: createEmptyCheckoutDraftState(),
});

export const isCurrentCheckoutResponse = (
  requestedCheckinId: string,
  currentCheckinId: string,
  responseCheckinId: string | null | undefined,
) => requestedCheckinId === currentCheckinId && responseCheckinId === currentCheckinId;
