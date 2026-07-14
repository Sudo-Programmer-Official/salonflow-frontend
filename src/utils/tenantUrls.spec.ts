import { describe, expect, it } from 'vitest';
import {
  buildTenantAdminUrl,
  buildTenantCheckInUrl,
  buildTenantKioskUrl,
  buildTenantLoginUrl,
  buildTenantUrl,
} from './tenantUrls';

describe('tenantUrls', () => {
  it('uses https for production tenant URLs', () => {
    expect(buildTenantAdminUrl('mtv', { baseDomain: 'salonflow.studio' })).toBe(
      'https://mtv.salonflow.studio/admin',
    );
    expect(buildTenantUrl('mtv', 'check-in', { baseDomain: 'salonflow.studio' })).toBe(
      'https://mtv.salonflow.studio/check-in',
    );
  });

  it('keeps localhost protocol and port in dev', () => {
    expect(buildTenantLoginUrl('mtv', { protocol: 'http:', baseDomain: 'localhost:5173' })).toBe(
      'http://mtv.localhost:5173/app/login',
    );
    expect(buildTenantCheckInUrl('mtv', { protocol: 'http:', baseDomain: 'localhost:5173' })).toBe(
      'http://mtv.localhost:5173/check-in',
    );
    expect(buildTenantKioskUrl('mtv', { protocol: 'http:', baseDomain: 'localhost:5173' })).toBe(
      'http://mtv.localhost:5173/kiosk/checkin/mtv',
    );
  });
});
