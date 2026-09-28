import { describe, expect, it } from 'vitest';
import { tenantHeaderForContext } from './client';

describe('tenant headers', () => {
  it('uses the token-bound tenant on the production demo gateway', () => {
    expect(
      tenantHeaderForContext({
        host: 'demo.salonflow.studio',
        hostname: 'demo.salonflow.studio',
        storedTenantSubdomain: 'naildemo',
      }),
    ).toEqual({ 'x-tenant-id': 'naildemo' });
  });

  it('never derives the reserved demo gateway label as a tenant', () => {
    expect(
      tenantHeaderForContext({
        host: 'demo.salonflow.studio',
        hostname: 'demo.salonflow.studio',
      }),
    ).toEqual({});
  });

  it('preserves normal tenant host resolution', () => {
    expect(
      tenantHeaderForContext({
        host: 'mtvnails.salonflow.studio',
        hostname: 'mtvnails.salonflow.studio',
        storedTenantSubdomain: 'naildemo',
      }),
    ).toEqual({ 'x-tenant-id': 'mtvnails' });
  });

  it('uses the staging token-bound tenant on the staging demo gateway', () => {
    expect(
      tenantHeaderForContext({
        host: 'demo.staging.salonflow.studio',
        hostname: 'demo.staging.salonflow.studio',
        storedTenantSubdomain: 'mtvnailsdemo',
      }),
    ).toEqual({ 'x-tenant-id': 'mtvnailsdemo' });
  });
});
