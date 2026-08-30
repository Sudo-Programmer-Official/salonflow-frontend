/**
 * Checkout intentionally consumes only performed/sold service lines.
 * Requested services are queue context and must never enter this collection.
 */
export const checkoutServiceLines = <T>(checkin: { services?: T[] | null } | null | undefined): T[] =>
  checkin?.services ? [...checkin.services] : [];
