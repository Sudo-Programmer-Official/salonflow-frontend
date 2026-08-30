import { describe, expect, it } from 'vitest';
import { checkoutServiceLines } from './checkoutServices';

describe('checkout service source of truth', () => {
  it('uses sold lines and ignores requested-service context', () => {
    const sold = [{ id: 'sold-1', serviceName: 'Acrylic Removal' }];
    const lines = checkoutServiceLines({
      services: sold,
      requestedServices: [{ id: 'request-1', serviceName: 'Gel Manicure' }],
    } as any);

    expect(lines).toEqual(sold);
    expect(lines).not.toContainEqual(expect.objectContaining({ id: 'request-1' }));
  });

  it('returns no billable service lines when a request-only check-in has none', () => {
    expect(checkoutServiceLines({ services: [], requestedServices: [{ id: 'request-1' }] } as any)).toEqual([]);
  });
});
