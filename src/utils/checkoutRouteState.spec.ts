import { describe, expect, it } from 'vitest';
import { checkoutRouteResetState, isCurrentCheckoutResponse } from './checkoutRouteState';

describe('checkout route state', () => {
  it('clears customer-specific state when the route changes', () => {
    expect(checkoutRouteResetState()).toEqual({
      item: null,
      loyalty: {
        customerId: null,
        pointsBalance: null,
        loading: false,
        loaded: false,
        error: '',
      },
      redeemPoints: false,
      checkoutCompleted: false,
      checkoutStep: 'services',
      draft: {
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
      },
    });
  });

  it('rejects hydration from an old check-in response', () => {
    expect(isCurrentCheckoutResponse('checkin-1', 'checkin-2', 'checkin-1')).toBe(false);
    expect(isCurrentCheckoutResponse('checkin-2', 'checkin-2', 'checkin-2')).toBe(true);
  });
});
